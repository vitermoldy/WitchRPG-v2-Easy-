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
    g.glow.emit({ pos: g.ilyra.hand('R'), count: 16, color: COLOR.umbraHot, intensity: 2.4, life: 0.3, size: 0.1, speed: 3 })
  }
}

/**
 * Her side of melee: the staff combo, block and parry, executions of staggered creatures, and the
 * thrown staff. Blows from creatures are resolved in Game.strikePlayer with these states.
 */
export class Fight {
  readonly combo = new Combo()
  readonly staff: Staff
  blocking = false
  /** Game time C was last pressed; a blow landing within the parry window after it is parried. */
  blockPressedAt = -Infinity
  /** Seconds left in which her next swing does the parry's extra damage. */
  riposte = 0
  exec: { u: Unit; t: number; struck: boolean } | null = null
  readonly stats = { swings: 0, hits: 0, parries: 0, blocks: 0, dodged: 0, hitRing: 0, hitLine: 0, executions: 0, throws: 0, throwHits: 0, recallHits: 0 }
  private readonly g: Game
  private readonly events: ComboEvent[] = []
  private swingYaw: number | null = null
  private blockBlend = 0
  private parryFx = 0
  private hurtFx = 0
  private throwT = -1
  private catchT = -1
  private castFx = 0
  private readonly v = new THREE.Vector3()

  constructor(g: Game) {
    this.g = g
    this.staff = new Staff(g)
  }

  /** Drops whatever she was doing. keepStaff: the thrown staff stays where it is (turned to stone, not a fall). */
  reset(keepStaff = false) {
    this.combo.cancel()
    this.exec = null
    this.blocking = false
    this.riposte = 0
    this.throwT = this.catchT = -1
    if (!keepStaff) this.staff.reset()
  }

  get damageMult() {
    return this.g.spells.damageMult
  }

  /** Nothing can hurt her during an execution. */
  get invulnerable() {
    return !!this.exec
  }

  /** Her pace this frame: slowed by block, held by an execution, careful during a swing. */
  get moveScale() {
    if (this.exec) return 0
    const s = this.combo.current
    if (s && s.t < s.swing.windup + s.swing.active) return 0.15
    if (this.blocking) return COMBAT.block.speed
    if (s) return 0.5
    return 1
  }

  /** May she roll now: not during an execution, nor during a swing's windup and blow. */
  get canDodge() {
    return !this.exec && this.combo.cancellable
  }

  /** Where she should face this frame, or null to leave it to steering and the camera. */
  get faceYaw(): number | null {
    if (this.exec) return yawTo(this.g.player.pos.x, this.g.player.pos.z, this.exec.u.pos.x, this.exec.u.pos.z)
    if (this.combo.current && this.swingYaw !== null) return this.swingYaw
    return null
  }

  /** A staggered creature close enough for F, the locked one first. */
  executable(): Unit | null {
    const g = this.g
    const p = g.player.pos
    const reach = (u: Unit) => Math.hypot(u.pos.x - p.x, u.pos.z - p.z) - u.radius
    // the Hydra's body staggers (its blow is cut off) but never falls to one finishing blow: its last phase is won in Reality Warp
    const can = (u: Unit) => u.alive && u.staggered && u.kind !== 'hydra'
    const locked = g.lockon.current as Unit | null
    if (locked && can(locked) && reach(locked) < COMBAT.execute.range) return locked
    let best: Unit | null = null
    let bd: number = COMBAT.execute.range
    for (const u of g.units.units) {
      if (u.team !== 'enemy' || !can(u)) continue
      const d = reach(u)
      if (d < bd) {
        bd = d
        best = u
      }
    }
    return best
  }

  hurt() {
    this.hurtFx = 1
    this.combo.cancel()
    this.swingYaw = null
  }

  parried() {
    this.parryFx = 1
    this.riposte = COMBAT.parry.riposte
  }

  cast() {
    this.castFx = 1
  }

  caught() {
    this.catchT = 0
  }

  update(dt: number, inp: FightInput, aiming: boolean) {
    const g = this.g
    const p = g.player
    this.riposte = Math.max(0, this.riposte - dt)
    this.parryFx = Math.max(0, this.parryFx - dt * 4)
    this.hurtFx = Math.max(0, this.hurtFx - dt * 3.5)
    this.castFx = Math.max(0, this.castFx - dt * 5)
    if (this.catchT >= 0) {
      this.catchT += dt / CATCH_TIME
      if (this.catchT >= 1) this.catchT = -1
    }
    this.staff.update(dt)

    if (!p.alive) {
      this.combo.cancel()
      this.blocking = false
      this.exec = null
      return
    }

    if (this.exec) {
      this.updateExecution(dt)
      this.blockBlend = Math.max(0, this.blockBlend - dt * 8)
      return
    }

    // block: C held; the press time decides a parry
    if (inp.blockPressed) this.blockPressedAt = g.t
    const canBlock = !p.dodging && this.combo.cancellable
    this.blocking = inp.blockHeld && canBlock
    if (this.blocking && this.combo.current) this.combo.cancel()
    this.blockBlend += ((this.blocking ? 1 : 0) - this.blockBlend) * Math.min(1, dt * 18)

    if (inp.execute) {
      const u = this.executable()
      if (u) {
        this.startExecution(u)
        return
      }
    }

    // throw or call back the staff
    if (this.throwT >= 0) {
      const before = this.throwT
      this.throwT += dt / THROW_TIME
      if (before < THROW_RELEASE / THROW_TIME && this.throwT >= THROW_RELEASE / THROW_TIME) this.release()
      if (this.throwT >= 1) this.throwT = -1
    } else if (inp.throwStaff && !this.blocking) {
      if (this.staff.state === 'hand') {
        this.throwT = 0
        this.combo.cancel()
        // face where it will go
        const at = this.throwTarget()
        this.swingYaw = yawTo(p.pos.x, p.pos.z, at.x, at.z)
      } else this.staff.recall()
    }

    // the staff combo; while aiming the left button belongs to the spells
    this.events.length = 0
    const mayAttack = !aiming && !this.blocking && !p.dodging && this.throwT < 0
    this.combo.update(dt, mayAttack && inp.attackPressed, mayAttack && inp.attackHeld, this.events)
    for (const e of this.events) {
      if (e.type === 'start') this.startSwing(e.s, inp)
      else if (e.type === 'hit') this.land(e.s)
      else if (e.type === 'end' && !this.combo.current) this.swingYaw = null
    }
    if (!this.combo.current && this.throwT < 0) this.swingYaw = null
  }

  private throwTarget(): THREE.Vector3 {
    const g = this.g
    const locked = g.lockon.current as Unit | null
    if (locked && locked.alive) return locked.center(this.v)
    return this.v.copy(g.aim(COMBAT.staff.range).point)
  }

  private release() {
    const g = this.g
    const from = g.ilyra.hand('R')
    from.y += 0.2
    this.staff.launch(from, this.throwTarget().clone())
    this.stats.throws++
    g.sfx.gripStop(true)
    g.addTrauma(0.06)
  }

  /** Which way a swing goes: toward the locked creature, else the nearest one in front, else where she steers. */
  private startSwing(s: SwingState, inp: FightInput) {
    const g = this.g
    const p = g.player
    this.stats.swings++
    let yaw = p.facing
    if (Math.hypot(inp.dirX, inp.dirZ) > 0.2) yaw = Math.atan2(-inp.dirX, -inp.dirZ)
    const locked = g.lockon.current as Unit | null
    let target: Unit | null = locked && locked.alive ? locked : null
    if (!target) {
      let best = Infinity
      for (const u of g.units.units) {
        if (u.team !== 'enemy' || !u.targetable) continue
        const d = Math.hypot(u.pos.x - p.pos.x, u.pos.z - p.pos.z) - u.radius
        if (d > s.swing.reach + 1.6) continue
        const off = Math.abs(wrap(yawTo(p.pos.x, p.pos.z, u.pos.x, u.pos.z) - yaw))
        if (off > 1.25) continue
        const score = d + off * 1.5
        if (score < best) {
          best = score
          target = u
        }
      }
    }
    if (target) yaw = yawTo(p.pos.x, p.pos.z, target.pos.x, target.pos.z)
    this.swingYaw = yaw
    p.facing = yaw - wrap(yaw - p.facing) * 0.4
    // step into the swing, but not through the creature
    let step = s.swing.lunge
    if (target) step = Math.max(0, Math.min(step, Math.hypot(target.pos.x - p.pos.x, target.pos.z - p.pos.z) - target.radius - s.swing.reach * 0.55))
    if (step > 0.05) p.nudge(-Math.sin(yaw), -Math.cos(yaw), step, Math.max(0.12, s.swing.windup + s.swing.active))
    g.sfx.swing(s.heavy)
  }

  /** The blow lands: everything in its arc in front of her is struck. */
  private land(s: SwingState) {
