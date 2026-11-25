import * as THREE from 'three'
import { COMBAT, type Swing } from '../game/balance'
import { yawTo } from './camera'
import { Combo, inSwing, type ComboEvent, type SwingState } from './combat'
import type { Game } from './game'
import type { IlyraPose } from './models'
import { COLOR } from './palette'
import type { Unit } from './units'

export interface FightInput {
  attackPressed: boolean
  attackHeld: boolean
  blockHeld: boolean
  blockPressed: boolean
  execute: boolean
  throwStaff: boolean
  /** Steering this frame in world space (for which way a swing goes), zero when none is held. */
  dirX: number
  dirZ: number
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
const Y = new THREE.Vector3(0, 1, 0)

/** Throw time of the staff: when in the throw it leaves her hand, and how long the throw plays. */
const THROW_TIME = 0.36
const THROW_RELEASE = 0.15
const CATCH_TIME = 0.25

/**
 * The staff thrown with H: it flies straight at the aim point, sticks in whatever it meets, and comes
 * back on the second H, hitting every creature on its way home.
 */
class Staff {
  state: 'hand' | 'flying' | 'stuck' | 'returning' = 'hand'
  readonly pos = new THREE.Vector3()
  readonly prev = new THREE.Vector3()
  readonly vel = new THREE.Vector3()
  private readonly g: Game
  private obj: THREE.Object3D | null = null
  private travelled = 0
  private t = 0
  private spin = 0
  private readonly hit = new Set<Unit>()
  private readonly dir = new THREE.Vector3()
  private readonly tmp = new THREE.Vector3()
  private readonly q = new THREE.Quaternion()
  private readonly q2 = new THREE.Quaternion()
  private readonly ray = new THREE.Ray()
  private readonly sphere = new THREE.Sphere()

  constructor(g: Game) {
    this.g = g
  }

  private ensure() {
    if (this.obj) return this.obj
    this.obj = this.g.ilyra.staffCopy() ?? new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.7), new THREE.MeshStandardMaterial({ color: 0x2a1a14 }))
    this.obj.visible = false
    this.g.scene.add(this.obj)
    return this.obj
  }

  launch(from: THREE.Vector3, to: THREE.Vector3) {
    this.ensure().visible = true
    this.state = 'flying'
    this.pos.copy(from)
    this.prev.copy(from)
    this.vel.subVectors(to, from).normalize().multiplyScalar(COMBAT.staff.throwSpeed)
    this.travelled = 0
    this.hit.clear()
    this.t = 0
  }

  recall() {
    if (this.state !== 'stuck' && this.state !== 'flying') return
    this.state = 'returning'
    this.hit.clear()
    this.t = 0
    this.g.sfx.gripStart()
  }

  /** Back in her hand at once (a fall, a respawn). */
  reset() {
    this.state = 'hand'
    if (this.obj) this.obj.visible = false
  }

  /** First living enemy the segment prev to pos passes through, and how far along (0 to 1). */
  private sweepUnits(len: number): { u: Unit; f: number } | null {
    if (len < 1e-5) return null
    this.dir.subVectors(this.pos, this.prev).divideScalar(len)
    this.ray.set(this.prev, this.dir)
    let best: { u: Unit; f: number } | null = null
    for (const u of this.g.units.units) {
      if (u.team !== 'enemy' || !u.targetable || this.hit.has(u)) continue
      u.center(this.sphere.center)
      this.sphere.radius = Math.max(u.radius, u.height * 0.42) + 0.15
      if (!this.ray.intersectSphere(this.sphere, this.tmp)) continue
      const d = this.tmp.distanceTo(this.prev)
      if (d <= len && (!best || d / len < best.f)) best = { u, f: d / len }
    }
    return best
  }

  update(dt: number) {
    const g = this.g
    if (this.state === 'hand') return
    const obj = this.ensure()
    this.t += dt
    this.spin += dt * 22
    if (this.state === 'flying') {
      this.prev.copy(this.pos)
      this.pos.addScaledVector(this.vel, dt)
      const step = this.pos.distanceTo(this.prev)
      this.travelled += step
      const hitU = this.sweepUnits(step)
      const wall = g.obstacles.sweep(this.prev.x, this.prev.y, this.prev.z, this.pos.x, this.pos.y, this.pos.z, 0.06)
      const ground = g.ground.height(this.pos.x, this.pos.z)
      if (hitU && hitU.f <= wall) {
        const u = hitU.u
        this.pos.lerpVectors(this.prev, this.pos, hitU.f)
        g.hurtUnit(u, COMBAT.staff.damage * g.fight.damageMult, this.prev, COMBAT.staff.stun, 4, 'player', 'staff')
        g.units.down(u, 2.5)
        g.fight.stats.throwHits++
        g.sfx.impact(0.8)
        g.hitstop(COMBAT.hitstop.light)
        // it bites in and drops into the ground at the creature's feet
        this.pos.set(u.pos.x - this.vel.x * 0.02, g.ground.height(u.pos.x, u.pos.z) + 0.3, u.pos.z - this.vel.z * 0.02)
        this.stick()
      } else if (wall < 1) {
        this.pos.lerpVectors(this.prev, this.pos, wall)
        this.stick()
        g.sfx.clank()
      } else if (this.pos.y < ground + 0.1) {
        this.pos.y = ground + 0.25
        this.stick()
        g.sfx.impact(0.3)
      } else if (this.travelled > COMBAT.staff.range) {
        // out of reach: it falls short
        this.vel.y -= 30 * dt
        this.vel.multiplyScalar(Math.max(0, 1 - dt * 2))
      }
      if (this.state === 'flying') this.orient(this.vel, true)
    } else if (this.state === 'returning') {
      const hand = g.ilyra.hand('R', this.tmp.set(0, 0, 0)).clone()
      this.prev.copy(this.pos)
      const to = hand.sub(this.pos)
      const d = to.length()
      const speed = Math.min(COMBAT.staff.recallSpeed, 10 + 70 * this.t)
      if (d <= Math.max(COMBAT.staff.catch, speed * dt)) {
        this.catch()
        return
      }
      this.vel.copy(to).divideScalar(d).multiplyScalar(speed)
      this.pos.addScaledVector(this.vel, dt)
      // every creature on the way home is struck once
      for (;;) {
        const h = this.sweepUnits(this.pos.distanceTo(this.prev))
        if (!h) break
        this.hit.add(h.u)
        g.hurtUnit(h.u, COMBAT.staff.recallDamage * g.fight.damageMult, this.prev, COMBAT.staff.recallStun, 3, 'player', 'staff')
        g.units.down(h.u, 2.5)
        g.fight.stats.recallHits++
        g.sfx.hit(true)
        g.hitstop(COMBAT.hitstop.light)
      }
      this.orient(this.vel, true)
      if (Math.random() < 0.6) g.glow.emit({ pos: this.pos, count: 1, color: COLOR.umbra, intensity: 2.2, life: 0.3, size: 0.12, speed: 0.4 })
    }
    obj.position.copy(this.pos)
  }

  private stick() {
    this.state = 'stuck'
    this.vel.setY(0)
    // planted at a slant, head up and back toward where it came from
    this.tmp.copy(this.vel).normalize().multiplyScalar(-0.5).add(Y).normalize()
    this.orient(this.tmp, false)
    this.g.glow.emit({ pos: this.pos, count: 12, color: COLOR.umbraHot, intensity: 2.2, life: 0.35, size: 0.12, speed: 2.5 })
  }

  private orient(dir: THREE.Vector3, spinning: boolean) {
    const obj = this.ensure()
    const n = this.tmp.copy(dir)
    if (n.lengthSq() < 1e-8) return
    n.normalize()
    this.q.setFromUnitVectors(Y, n)
    if (spinning) {
      // end over end about the axis across its flight
      const axis = new THREE.Vector3().crossVectors(n, Y)
      if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0)
      this.q2.setFromAxisAngle(axis.normalize(), this.spin)
      this.q.premultiply(this.q2)
    }
    obj.quaternion.copy(this.q)
  }

  private catch() {
    const g = this.g
    this.state = 'hand'
    if (this.obj) this.obj.visible = false
    g.fight.caught()
    g.sfx.clank()
    g.addTrauma(0.12)
    g.hitstop(0.03)
