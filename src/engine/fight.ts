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
