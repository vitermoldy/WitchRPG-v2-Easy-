import * as THREE from 'three'
import { COMBAT, ELITE, SHADOW, SPELL, UNITS, type AttackSpec, type EliteTrait, type UnitKind, type UnitSpec } from '../game/balance'
import { unitStats, type ShadowRecord } from '../game/progression'
import { StunMeter } from './combat'
import type { HeightFn } from './camera'
import type { Obstacles } from './obstacles'

export type Team = 'enemy' | 'shadow'
export type UnitState = 'rising' | 'move' | 'windup' | 'strike' | 'recover' | 'stagger' | 'held' | 'thrown' | 'finishing' | 'diving' | 'ashes' | 'dead' | 'sinking'
export type Command = 'follow' | 'attack' | 'hold'
/** What a blow is, for the Minotaur's front shield: thrown things go through it, blows and bolts do not. */
export type DamageKind = 'melee' | 'bolt' | 'blast' | 'staff' | 'impact' | 'shadow'

/** Something a unit can go for: her, or a unit of the other side. */
export interface Foe {
  pos: THREE.Vector3
  radius: number
  alive: boolean
}

export interface UnitHost {
  readonly obstacles: Obstacles
  readonly height: HeightFn
  /** Her feet, her size, and whether she can be targeted. */
  readonly foe: Foe
  /** Ground no creature may step to from (fx, fz): deep water, past the map edge, a seal. */
  blocked(x: number, z: number, fx?: number, fz?: number): boolean
  /** A blow on her lands; the host resolves block, parry and dodge. */
  strikePlayer(u: Unit, atk?: AttackSpec): void
  /** A unit struck a unit of the other side. */
  strikeUnit(u: Unit, target: Unit, atk?: AttackSpec): void
  /** A ranged attack leaves the creature: an arrow along its line or a glob onto its circle. */
  fire(u: Unit, atk: AttackSpec): void
  /** A thrown body hit another body (other) or the ground or a tree (other null) at this speed. */
  impact(u: Unit, other: Unit | null, speed: number): void
  /** A unit died, from any cause. */
  died(u: Unit): void
  /** A summoner called up a helper. */
  summoned(helper: Unit): void
  /** Something to show: a blink, a Phoenix falling to ashes or rising from them. */
  fx(u: Unit, what: 'blink' | 'ashes' | 'reborn', from?: THREE.Vector3): void
  /** Telegraph shown while a unit winds up and lunges; cleared when the blow is over. */
  telegraph(u: Unit): void
  clearTelegraph(u: Unit): void
}

const legacy = new WeakMap<UnitSpec, AttackSpec[]>()

/** A creature's attacks: its list, or one made from the v1 fields. */
export function attacksOf(spec: UnitSpec): AttackSpec[] {
  if (spec.attacks) return spec.attacks
  let list = legacy.get(spec)
  if (!list) {
    list = [{ name: 'serang', strike: spec.strike ?? 'ring', windup: spec.windup, recover: spec.recover, range: spec.attackRange, lungeSpeed: spec.lungeSpeed ?? 6, lungeTime: spec.lungeTime ?? 0.3 }]
    legacy.set(spec, list)
  }
  return list
}

let nextId = 1

export class Unit implements Foe {
  readonly id = nextId++
  readonly kind: UnitKind
  readonly team: Team
  readonly spec: UnitSpec
  level: number
  hp: number
  maxHp: number
  damage: number
  speed: number
  radius: number
  readonly mass: number
  scale = 1
  /** Elite trait, or null. */
  elite: EliteTrait | null = null
  /** Multiplier on windup, recovery and cooldown (an elite Gesit is quicker). */
  tempo = 1
  /** Seconds before it can blink again (Succubus, Incubus). */
  blinkCd = 0
  /** A Phoenix that has already risen from its ashes once. */
  reborn = false
  /** Driven from outside (the Hydra's heads): no brain, no walking. */
  controlled = false
  /** The Hydra's heads (null once swallowed), read by its rig to bend the necks. */
  parts: (Unit | null)[] | null = null
  /** A head: where its rig drew it this frame (world), for hits and lock-on. */
  readonly visual = new THREE.Vector3(NaN, NaN, NaN)
  /** A head coming down: its neck's pitch at the root, curl along it and turn (degrees), steered by the rig onto its circle. */
  neckLean = 20
  neckCurl = 6
  neckYaw = 0
  readonly pos = new THREE.Vector3()
  readonly vel = new THREE.Vector3()
  /** Facing; 0 looks along +z, the way the models face. */
  yaw = 0
  state: UnitState = 'move'
  /** Seconds in the current state. */
  t = 0
  /** Seconds until it may attack again. */
  cd = 0
  /** The attack it is winding up or last used. */
  atk: AttackSpec
  /** Attacks with their own cooldown, and the seconds left on each. */
  readonly atkCd = new Map<string, number>()
  target: Foe | null = null
  /** Holds one of the attack slots against her. */
  token = false
  readonly stun: StunMeter
  /** Hit flash for the renderer (seconds left). */
  flash = 0
  /** Seconds the health bar stays up after a hit. */
  barShown = 0
  /** Hex Snare: speed multiplier and extra damage taken. */
  slow = 1
  vulnerable = 0
  /** Where a ring blow lands, fixed at the start of the windup and following her a little. */
  readonly aimAt = new THREE.Vector3()
  /** Which way a line lunge goes. */
  readonly lungeDir = new THREE.Vector3()
  hitDone = false
  /** Flyers: height above the ground. A downed flyer crawls for `downed` seconds. */
  alt = 0
  downed = 0
  readonly flank: number = Math.random() < 0.5 ? -1 : 1
  /** Walk cycle phase for the animation. */
  walk = Math.random() * 6
  /** Seconds a Telekinesis throw keeps it flying nearly straight. */
  flight = 0
  /** Seconds Reality Warp keeps it hanging in the air. */
  lifted = 0
  /** Seconds before it can dive again (Naga). */
  diveCd = 0
  /** Seconds before it calls helpers again, and how many of its helpers still stand. */
  skillCd = 6
  helpers = 0
  owner: Unit | null = null
  /** Which way a body falls (for the death pose). */
  readonly fallSide: number = Math.random() < 0.5 ? -1 : 1
  deadT = 0
  /** Finished by an execution: raises the Umbra Rite chance of the body. */
  executed = false
  riteTried = false
  ash = false
  ashAt = 0
  // shadows
  record: ShadowRecord | null = null
  command: Command = 'follow'
  readonly holdPos = new THREE.Vector3()
  slot = 0
  focus: Unit | null = null
  focusBonus = 0
  /** Drawn with its own animated model this frame (the rest of the army is drawn as a crowd). */
  detailed = true
  /** The camp it belongs to (enemies), for wake, sleep and respawn. */
  camp = -1
  /** Camp creatures stay near home until the pack is roused, and walk back when she gets away. */
  home: THREE.Vector3 | null = null
  aggro = true
  /** Thrown by Telekinesis: hurts what it hits until it lands. */
  hurled = false
  /** Ground height under it, kept until it moves (the height field is costly to sample). */
  ground = 0
  groundX = NaN
  groundZ = NaN

  constructor(kind: UnitKind, team: Team, level: number) {
    this.kind = kind
    this.team = team
    this.spec = UNITS[kind]
    this.level = level
    const st = unitStats(kind, level, team === 'shadow')
    this.hp = this.maxHp = st.hp
    this.damage = st.damage
    this.speed = st.speed
    this.radius = this.spec.radius
    this.mass = this.spec.mass
    this.stun = new StunMeter(this.spec.stun ?? 40)
    this.alt = this.spec.fly ? this.spec.fly.height : 0
    this.atk = attacksOf(this.spec)[0]
    if (this.spec.summon) this.skillCd = this.spec.summon.every * 0.5
  }

  get alive() {
    return this.state !== 'dead' && this.hp > 0
  }

  /** Under the water or the mud, or in ashes: alive, but nothing can see or reach it. */
  get hidden() {
    return this.state === 'diving' || this.state === 'ashes'
  }

  /** Can be aimed at, locked on to, and struck. */
  /** Can be struck, locked on to, gripped or chased. Fauna never can. */
  get targetable() {
    return this.alive && this.state !== 'finishing' && !this.hidden && !this.spec.passive
  }

  /** Size change (elites, the shadow Hydra): body radius follows. */
  setScale(s: number) {
    this.scale = s
    this.radius = this.spec.radius * s
  }

  /** v1 elite: tougher, harder hitting, bigger, and one trait. */
  makeElite(trait: EliteTrait) {
    this.elite = trait
    this.maxHp *= ELITE.hp
    this.hp = this.maxHp
    this.damage *= ELITE.damage
    this.setScale(this.scale * ELITE.scale)
    if (trait === 'gesit') {
      this.speed *= ELITE.swift.speed
      this.tempo = ELITE.swift.tempo
    }
  }

  get height() {
    return this.spec.height * this.scale
  }

  get flyer() {
    return !!this.spec.fly && this.downed <= 0
  }

  get staggered() {
    return this.state === 'stagger'
  }

  // lock-on reads the feet position as x, y, z
  get x() {
    return this.pos.x
  }
  get y() {
    return this.pos.y
  }
  get z() {
    return this.pos.z
  }

  /** Middle of the body, for aiming and effects. */
  center(out = new THREE.Vector3()) {
    return out.set(this.pos.x, this.pos.y + this.height * 0.5, this.pos.z)
  }

  set(state: UnitState) {
    this.state = state
    this.t = 0
  }
}

/** Radius of the amber circle a ring blow lands on when its attack does not say (metres). */
export const RING_RADIUS = 1.4

export const ringOf = (atk: AttackSpec) => atk.ring ?? RING_RADIUS

/**
 * Share of a blow that gets through a front shield (the Minotaur's 85%): blows, bolts and blasts from
 * within about 70 degrees of where it faces are cut down. A thrown staff, a thrown body, or a creature
 * knocked off balance takes the full blow.
 */
export function shieldShare(u: Unit, fromX: number, fromZ: number, kind: DamageKind): number {
  const s = u.spec.shield
  if (!s || kind === 'staff' || kind === 'impact' || u.staggered || u.state === 'held' || u.state === 'thrown') return 1
  const dx = fromX - u.pos.x
  const dz = fromZ - u.pos.z
  const d = Math.hypot(dx, dz)
  if (d < 1e-4) return 1
  const front = (Math.sin(u.yaw) * dx + Math.cos(u.yaw) * dz) / d
  return front > 0.34 ? 1 - s : 1
}

const tmp = new THREE.Vector3()
const CELL = 3

const cellKey = (ix: number, iz: number) => (ix + 32768) * 65536 + (iz + 32768)

/** Every creature and shadow soldier: their decisions, movement and blows. */
export class UnitSystem {
  readonly units: Unit[] = []
  private readonly host: UnitHost
  private readonly grid = new Map<number, Unit[]>()
  /** Living units of each side, rebuilt with the grid every frame. */
  private readonly living: Record<Team, Unit[]> = { enemy: [], shadow: [] }
  /** Formation spot for each shadow, filled in by the Umbra layer. */
  spotOf: ((u: Unit) => THREE.Vector3) | null = null

  constructor(host: UnitHost) {
    this.host = host
  }

  spawn(kind: UnitKind, team: Team, level: number, at: { x: number; z: number }, rising = false): Unit {
    const u = new Unit(kind, team, level)
    u.pos.set(at.x, this.host.height(at.x, at.z), at.z)
    u.yaw = Math.random() * Math.PI * 2
    if (rising) u.set('rising')
    this.units.push(u)
    return u
  }

  remove(u: Unit) {
    const i = this.units.indexOf(u)
    if (i >= 0) this.units.splice(i, 1)
    u.token = false
    this.host.clearTelegraph(u)
  }

  enemies() {
    return this.units.filter((u) => u.team === 'enemy' && u.alive)
  }

  /** Attack slots in use against her. */
  tokens() {
    let n = 0
    for (const u of this.units) if (u.token) n++
    return n
  }

  /** Damage to a unit. Returns true when it died from it. */
  hurt(u: Unit, dmg: number, from: { x: number; z: number }, stun = 0, knock = 0): boolean {
    if (!u.targetable) return false
    u.hp -= dmg * (1 + u.vulnerable)
    u.flash = 0.16
    u.barShown = 6
    if (stun > 0 && u.stun.add(stun)) this.stagger(u)
    if (knock > 0 && u.state !== 'held' && u.state !== 'thrown') {
      tmp.set(u.pos.x - from.x, 0, u.pos.z - from.z)
      if (tmp.lengthSq() < 1e-6) tmp.set(Math.random() - 0.5, 0, Math.random() - 0.5)
      u.vel.add(tmp.normalize().multiplyScalar(knock * Math.min(1.5, 60 / Math.max(20, u.mass))))
    }
    if (u.hp <= 0) {
      this.kill(u)
      return true
    }
    // a Naga that is hurt slips under and comes up somewhere else
    if (u.spec.dive && u.diveCd <= 0 && (u.state === 'move' || u.state === 'recover' || u.state === 'windup')) {
      this.host.clearTelegraph(u)
      u.token = false
      u.diveCd = 8
      u.set('diving')
      u.vel.set(0, 0, 0)
    }
    return false
  }

  /** Knocks a flyer out of the air for a while. */
  down(u: Unit, seconds: number) {
    if (!u.spec.fly || !u.alive) return
    u.downed = Math.max(u.downed, seconds)
    if (u.state === 'windup' || u.state === 'strike') {
      this.host.clearTelegraph(u)
      u.token = false
      u.set('recover')
    }
  }

  stagger(u: Unit) {
    this.host.clearTelegraph(u)
    u.token = false
    u.set('stagger')
    u.vel.multiplyScalar(0.2)
  }

  kill(u: Unit, executed = false) {
    if (u.state === 'dead') return
    if (u.spec.rebirth && !u.reborn && !executed && u.team === 'enemy') {
      // the first fall leaves ashes that burn for a moment, then it rises again (an execution ends it for good)
      this.host.clearTelegraph(u)
      u.token = false
      u.hp = 1
      u.set('ashes')
      u.vel.set(0, 0, 0)
      u.downed = 999
      this.host.fx(u, 'ashes')
      return
    }
    this.host.clearTelegraph(u)
    u.hp = 0
    u.token = false
    u.executed = executed
    u.set('dead')
    u.deadT = 0
    u.lifted = 0
    if (u.owner) u.owner.helpers = Math.max(0, u.owner.helpers - 1)
    this.host.died(u)
  }

  private rebuildGrid() {
    this.grid.clear()
    this.living.enemy.length = 0
    this.living.shadow.length = 0
    for (const u of this.units) {
      if (!u.targetable) continue
      this.living[u.team].push(u)
      const k = cellKey(Math.floor(u.pos.x / CELL), Math.floor(u.pos.z / CELL))
      let list = this.grid.get(k)
      if (!list) this.grid.set(k, (list = []))
      list.push(u)
    }
  }

  /**
   * Nearest living unit of the other side within range. Looked up in the 3 m grid, or straight from
   * the list of the other side when that list is shorter than the grid cells the range would cover
   * (500 shadows looking 14 m for 40 creatures check 40 units each instead of 121 cells).
   */
  nearestFoe(u: Unit, range: number): Unit | null {
    let best: Unit | null = null
    let bd = range * range
    const r = Math.ceil(range / CELL)
    const other = this.living[u.team === 'enemy' ? 'shadow' : 'enemy']
    if (other.length < (2 * r + 1) ** 2) {
      for (const o of other) {
        if (!o.targetable) continue
        const d = (o.pos.x - u.pos.x) ** 2 + (o.pos.z - u.pos.z) ** 2
        if (d < bd) {
          bd = d
          best = o
        }
      }
      return best
    }
    const cx = Math.floor(u.pos.x / CELL)
    const cz = Math.floor(u.pos.z / CELL)
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const list = this.grid.get(cellKey(cx + dx, cz + dz))
        if (!list) continue
        for (const o of list) {
          if (o.team === u.team || !o.targetable) continue
          const d = (o.pos.x - u.pos.x) ** 2 + (o.pos.z - u.pos.z) ** 2
          if (d < bd) {
            bd = d
            best = o
          }
        }
      }
    }
    return best
  }

  private steer(u: Unit, gx: number, gz: number, speed: number, dt: number, stopAt = 0) {
    const dx = gx - u.pos.x
    const dz = gz - u.pos.z
    const d = Math.hypot(dx, dz)
    let tx = 0
    let tz = 0
    if (d > stopAt + 0.05) {
      // ease in over the last metre so they settle instead of jittering on the spot
      const k = Math.min(1, d - stopAt)
      tx = (dx / d) * speed * k
      tz = (dz / d) * speed * k
    }
    const a = Math.min(1, dt * 8)
    u.vel.x += (tx - u.vel.x) * a
    u.vel.z += (tz - u.vel.z) * a
  }

  face(u: Unit, x: number, z: number, dt: number, rate = 9) {
    const want = Math.atan2(x - u.pos.x, z - u.pos.z)
    const d = Math.atan2(Math.sin(want - u.yaw), Math.cos(want - u.yaw))
    u.yaw += d * Math.min(1, rate * dt)
  }

  update(dt: number) {
    this.rebuildGrid()
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i]
      if (!u) continue
      u.t += dt
      u.flash = Math.max(0, u.flash - dt)
      u.barShown = Math.max(0, u.barShown - dt)
      u.cd = Math.max(0, u.cd - dt)
      u.downed = Math.max(0, u.downed - dt)
      u.diveCd = Math.max(0, u.diveCd - dt)
      u.blinkCd = Math.max(0, u.blinkCd - dt)
      for (const [k, v] of u.atkCd) if (v > 0) u.atkCd.set(k, Math.max(0, v - dt))
      if (u.state === 'dead') {
        u.deadT += dt
        u.vel.multiplyScalar(Math.max(0, 1 - dt * 5))
        this.move(u, dt, true)
        continue
      }
      u.stun.update(dt)
      if (u.state === 'stagger' && u.stun.staggered <= 0) u.set('move')
      if (u.state === 'held' || u.state === 'finishing') continue
      if (u.state === 'thrown') {
        this.fly(u, dt)
        continue
      }
      if (u.state === 'rising') {
        if (u.t > 1.0) u.set('move')
        continue
      }
      if (u.state === 'sinking') {
        if (u.t > 0.8) this.remove(u)
        continue
      }
      if (u.state === 'diving') {
        if (u.t >= (u.spec.dive ?? 3)) this.surface(u)
        continue
      }
      if (u.state === 'ashes') {
        const r = u.spec.rebirth!
        if (u.t >= r.ashes) {
          u.reborn = true
          u.hp = u.maxHp * r.hp
          u.downed = 0
          u.set('rising')
          this.host.fx(u, 'reborn')
        }
        continue
      }
      if (u.controlled) continue
      if (u.lifted > 0) {
        u.lifted = Math.max(0, u.lifted - dt)
        u.token = false
        if (u.state === 'windup' || u.state === 'strike') {
          this.host.clearTelegraph(u)
          u.set('move')
        }
        u.vel.multiplyScalar(Math.max(0, 1 - dt * 4))
        u.yaw += dt * 1.4
        this.move(u, dt, true)
        continue
      }
      if (u.state !== 'stagger') {
        if (u.team === 'enemy') {
          this.enemyBrain(u, dt)
          this.summon(u, dt)
        } else this.shadowBrain(u, dt)
      } else u.vel.multiplyScalar(Math.max(0, 1 - dt * 6))
      this.separate(u, dt)
      this.move(u, dt, false)
    }
  }

  /** Fauna: wander about home, step away from her when she comes close, never attack. */
  private faunaBrain(u: Unit, dt: number) {
    const p = this.host.foe
    const home = u.home ?? u.pos
    const dx = u.pos.x - p.pos.x
    const dz = u.pos.z - p.pos.z
    const d = Math.hypot(dx, dz) || 1
    if (p.alive && d < 9) {
      this.steer(u, u.pos.x + (dx / d) * 6, u.pos.z + (dz / d) * 6, u.speed, dt, 0.5)
      this.face(u, u.pos.x + dx, u.pos.z + dz, dt, 5)
    } else {
      // a new spot near home every few seconds; aimAt holds it, fauna never aims
      if (u.cd <= 0) {
        const a = Math.random() * Math.PI * 2
        const r = 2 + Math.random() * 9
        u.aimAt.set(home.x + Math.cos(a) * r, 0, home.z + Math.sin(a) * r)
        u.cd = 4 + Math.random() * 6
      }
      this.steer(u, u.aimAt.x, u.aimAt.z, u.speed * 0.35, dt, 1)
      if (Math.hypot(u.aimAt.x - u.pos.x, u.aimAt.z - u.pos.z) > 1.2) this.face(u, u.aimAt.x, u.aimAt.z, dt, 3)
    }
    if (u.spec.fly) u.alt += (u.spec.fly.height * (0.7 + 0.3 * Math.sin(u.t * 0.4 + u.id)) - u.alt) * Math.min(1, dt)
  }

  /** Succubus and Incubus: gone in a puff, back a dozen metres away from her. */
  private blink(u: Unit, from: Foe) {
    const spec = u.spec.blink!
    const start = u.pos.clone()
    const away = Math.atan2(u.pos.x - from.pos.x, u.pos.z - from.pos.z)
    for (let tries = 0; tries < 8; tries++) {
      const a = away + (tries - 3.5) * 0.45
      const x = from.pos.x + Math.sin(a) * spec.range
      const z = from.pos.z + Math.cos(a) * spec.range
      if (this.host.blocked(x, z)) continue
      u.pos.x = x
      u.pos.z = z
      break
    }
    this.host.obstacles.pushOut(u.pos, u.radius, u.height)
    u.groundX = NaN
    u.vel.set(0, 0, 0)
    u.blinkCd = spec.every
    this.host.clearTelegraph(u)
    u.token = false
    u.set('move')
    this.host.fx(u, 'blink', start)
  }

  /** A diving Naga comes up a few metres away, rising out of the ground. */
  private surface(u: Unit) {
    for (let tries = 0; tries < 6; tries++) {
      const a = Math.random() * Math.PI * 2
      const r = 4 + Math.random() * 3
      const x = u.pos.x + Math.cos(a) * r
      const z = u.pos.z + Math.sin(a) * r
      if (this.host.blocked(x, z)) continue
      u.pos.x = x
      u.pos.z = z
      break
    }
    this.host.obstacles.pushOut(u.pos, u.radius, u.height)
    u.groundX = NaN
    u.cd = 0.6
    u.set('rising')
