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
  }

  /** Summoners (the Chimera) call helpers every few seconds while they fight. */
  private summon(u: Unit, dt: number) {
    const s = u.spec.summon
    if (!s || !u.aggro) return
    u.skillCd -= dt
    if (u.skillCd > 0) return
    u.skillCd = s.every
    const n = Math.min(s.count, s.max - u.helpers)
    for (let k = 0; k < n; k++) {
      const a = u.yaw + Math.PI + (k - (n - 1) / 2) * 0.9
      const h = this.spawn(u.spec.summonKind ?? 'imp', u.team, u.level, { x: u.pos.x + Math.sin(a) * (u.radius + 1.6), z: u.pos.z + Math.cos(a) * (u.radius + 1.6) }, true)
      h.owner = u
      h.aggro = true
      u.helpers++
      this.host.summoned(h)
    }
  }

  // ------------------------------------------------------------ enemies

  /** The attack that fits: a behind attack when she is behind it, else the first one in reach and ready. */
  private pickAttack(u: Unit, tgt: Foe, dist: number): AttackSpec | null {
    const list = attacksOf(u.spec)
    const dx = tgt.pos.x - u.pos.x
    const dz = tgt.pos.z - u.pos.z
    const front = (Math.sin(u.yaw) * dx + Math.cos(u.yaw) * dz) / Math.max(1e-4, Math.hypot(dx, dz))
    const behind = front < -0.2
    let fallback: AttackSpec | null = null
    for (const a of list) {
      if (dist > a.range + tgt.radius || dist < (a.minRange ?? 0)) continue
      if ((u.atkCd.get(a.name) ?? 0) > 0) continue
      if (a.behind) {
        if (behind) return a
        continue
      }
      if (!fallback) fallback = a
    }
    return fallback
  }

  /** How close it wants to be: the reach of its closest attack, or its shooting distance. */
  private wantRange(u: Unit): number {
    let r = Infinity
    for (const a of attacksOf(u.spec)) if (!a.behind && !a.minRange) r = Math.min(r, a.range)
    return Number.isFinite(r) ? r : u.spec.attackRange
  }

  private enemyBrain(u: Unit, dt: number) {
    if (u.spec.passive) {
      this.faunaBrain(u, dt)
      return
    }
    const host = this.host
    const p = host.foe
    // a shadow close by draws its attention when it is much nearer than her
    const shadow = this.nearestFoe(u, 6)
    if (!u.aggro && !shadow && u.home) {
      // at rest in its camp: drift back home, then stand and look about
      u.token = false
      const far = Math.hypot(u.home.x - u.pos.x, u.home.z - u.pos.z)
      this.steer(u, u.home.x, u.home.z, u.speed * (far > 6 ? 1 : 0.4), dt, 2.5)
      if (far > 2.5) this.face(u, u.home.x, u.home.z, dt, 4)
      else u.yaw += Math.sin(u.t * 0.4 + u.id) * dt * 0.4
      if (u.spec.fly) u.alt += (u.spec.fly.height * 0.6 - u.alt) * Math.min(1, dt)
      if (u.state !== 'move') {
        host.clearTelegraph(u)
        u.set('move')
      }
      u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.1 * dt)
      return
    }
    const tgt: Foe | null = shadow && (!p.alive || shadow.pos.distanceTo(u.pos) < p.pos.distanceTo(u.pos) * 0.6) ? shadow : p.alive ? p : shadow
    u.target = tgt
    if (!tgt) {
      u.token = false
      if (u.state === 'windup' || u.state === 'strike') {
        host.clearTelegraph(u)
        u.set('recover')
      }
      this.steer(u, u.pos.x, u.pos.z, 0, dt)
      return
    }
    const onPlayer = tgt === p
    const dist = Math.hypot(tgt.pos.x - u.pos.x, tgt.pos.z - u.pos.z)
    const spec = u.spec
    const atk = u.atk
    if (spec.blink && u.blinkCd <= 0 && dist < 4 && (u.state === 'move' || u.state === 'recover')) {
      this.blink(u, tgt)
      return
    }
    const speed = u.speed * u.slow
    switch (u.state) {
      case 'move': {
        const slot = !onPlayer || u.token || this.tokens() < COMBAT.attackers
        if (u.flyer) {
          // circle above her at a distance, waiting for a dive
          const a = Math.atan2(u.pos.x - tgt.pos.x, u.pos.z - tgt.pos.z) + u.flank * 0.7 * dt
          this.steer(u, tgt.pos.x + Math.sin(a) * 9, tgt.pos.z + Math.cos(a) * 9, speed, dt)
          u.alt += ((spec.fly?.height ?? 6) - u.alt) * Math.min(1, dt * 1.5)
        } else if (spec.fly) {
          // a downed flyer crawls toward her and cannot strike until it is up again
          this.steer(u, tgt.pos.x, tgt.pos.z, speed * 0.35, dt, 2)
          u.alt += (0 - u.alt) * Math.min(1, dt * 6)
          this.face(u, tgt.pos.x, tgt.pos.z, dt)
          break
        } else if (spec.keepAway) {
          // shooters hold their distance: back off when she closes in, come closer when out of range
          if (dist < spec.keepAway * 0.8) this.steer(u, u.pos.x - (tgt.pos.x - u.pos.x), u.pos.z - (tgt.pos.z - u.pos.z), speed, dt)
          else if (dist > spec.attackRange * 0.8) this.steer(u, tgt.pos.x, tgt.pos.z, speed, dt, spec.attackRange * 0.7)
          else {
            const side = Math.atan2(u.pos.x - tgt.pos.x, u.pos.z - tgt.pos.z) + u.flank * 0.25 * dt
            this.steer(u, tgt.pos.x + Math.sin(side) * dist, tgt.pos.z + Math.cos(side) * dist, speed * 0.5, dt)
          }
        } else if (spec.flank) {
          // swing round to her side before lunging
          const side = Math.atan2(u.pos.x - tgt.pos.x, u.pos.z - tgt.pos.z) + u.flank * 0.9 * dt
          const r = Math.max(3, spec.attackRange - 1.5)
          this.steer(u, tgt.pos.x + Math.sin(side) * r, tgt.pos.z + Math.cos(side) * r, speed, dt)
        } else if (slot || u.cd > 0) {
          this.steer(u, tgt.pos.x, tgt.pos.z, speed, dt, this.wantRange(u) * 0.75)
        } else {
          // no free slot: circle her at a wary distance
          const side = Math.atan2(u.pos.x - tgt.pos.x, u.pos.z - tgt.pos.z) + u.flank * 0.5 * dt
          const r = Math.max(4, u.radius + 3)
          this.steer(u, tgt.pos.x + Math.sin(side) * r, tgt.pos.z + Math.cos(side) * r, speed * 0.6, dt)
        }
        this.face(u, tgt.pos.x, tgt.pos.z, dt)
        if (u.cd <= 0 && slot) {
          const next = this.pickAttack(u, tgt, dist)
          if (next) {
            if (onPlayer) u.token = true
            this.windup(u, tgt, next)
          }
        }
        break
      }
      case 'windup': {
        u.vel.multiplyScalar(Math.max(0, 1 - dt * 10))
        if (atk.strike === 'ring' && atk.ahead === undefined) {
          // the circle follows her a little while it winds up: stepping away early still works
          u.aimAt.lerp(tmp.set(tgt.pos.x, tgt.pos.y, tgt.pos.z), Math.min(1, dt * 1.5))
        }
        if (atk.ahead === undefined) this.face(u, u.aimAt.x, u.aimAt.z, dt, 12)
        if (spec.fly) u.alt += (spec.fly.height + 1 - u.alt) * Math.min(1, dt * 3)
        if (u.t >= atk.windup * u.tempo) {
          if (atk.shot) {
            // the shot flies; the telegraph stays until it lands
            host.fire(u, atk)
            u.hitDone = true
            u.set('recover')
            break
          }
          u.set('strike')
          u.hitDone = false
          const lt = atk.lungeTime ?? 0.3
          if (atk.strike === 'ring') {
            tmp.subVectors(u.aimAt, u.pos).setY(0)
            const d = tmp.length()
            u.lungeDir.copy(tmp.normalize())
            // leap so it lands on the circle as the lunge ends
            u.vel.copy(u.lungeDir).multiplyScalar(atk.ahead !== undefined ? 0 : Math.min(atk.lungeSpeed ?? 0, Math.max(0, d - u.radius) / lt))
          } else u.vel.copy(u.lungeDir).multiplyScalar(atk.lungeSpeed ?? 12)
        }
        break
      }
      case 'strike': {
        const lt = atk.lungeTime ?? 0.3
        if (spec.fly) u.alt = Math.max(0.5, u.alt - dt * 16)
        if (!u.hitDone) {
          if (atk.strike === 'ring') {
            if (u.t >= lt) {
              u.hitDone = true
              // the blow lands on the circle; whoever still stands inside it is hit
              const inside = Math.hypot(tgt.pos.x - u.aimAt.x, tgt.pos.z - u.aimAt.z) < ringOf(atk) + tgt.radius && Math.abs(tgt.pos.y - u.pos.y) < 2.5
              if (inside) {
                if (onPlayer) host.strikePlayer(u, atk)
                else host.strikeUnit(u, tgt as Unit, atk)
              }
            }
          } else {
            const reach = u.radius + tgt.radius + 0.35
            const near = Math.hypot(tgt.pos.x - u.pos.x, tgt.pos.z - u.pos.z) < reach && Math.abs(tgt.pos.y - (u.pos.y - u.alt)) < 2.2
            if (near && (!spec.fly || u.alt < 2.2)) {
              u.hitDone = true
              if (onPlayer) host.strikePlayer(u, atk)
              else host.strikeUnit(u, tgt as Unit, atk)
            }
          }
        }
        if (u.t >= lt) {
          host.clearTelegraph(u)
          u.set('recover')
          u.vel.multiplyScalar(0.25)
        }
        break
      }
      case 'recover': {
        u.vel.multiplyScalar(Math.max(0, 1 - dt * 6))
        if (u.t >= atk.recover * u.tempo) {
          u.token = false
          u.cd = spec.cooldown * u.tempo * (0.8 + Math.random() * 0.4)
          u.set('move')
        }
        break
      }
    }
  }

  private windup(u: Unit, tgt: Foe, atk: AttackSpec) {
    u.atk = atk
    u.set('windup')
    if (atk.cooldown) u.atkCd.set(atk.name, atk.cooldown)
    if (atk.ahead !== undefined) {
      // a breath: the circle lies in front of it and does not follow her
      u.aimAt.set(u.pos.x + Math.sin(u.yaw) * atk.ahead, tgt.pos.y, u.pos.z + Math.cos(u.yaw) * atk.ahead)
    } else u.aimAt.set(tgt.pos.x, tgt.pos.y, tgt.pos.z)
    // a line heads through where she stands and on past her
    tmp.set(tgt.pos.x - u.pos.x, 0, tgt.pos.z - u.pos.z)
    if (tmp.lengthSq() < 1e-6) tmp.set(Math.sin(u.yaw), 0, Math.cos(u.yaw))
    u.lungeDir.copy(tmp.normalize())
    this.host.telegraph(u)
  }

  // ------------------------------------------------------------ shadows

  private shadowBrain(u: Unit, dt: number) {
    const host = this.host
    const p = host.foe
    if (u.focus && !u.focus.targetable) {
      if (!u.focus.alive) {
        u.focus = null
        u.command = 'follow'
      }
    }
    // which enemy to fight: the ordered focus, else the nearest one near her
    let tgt: Unit | null = null
    if (u.command === 'attack' && u.focus && u.focus.targetable) tgt = u.focus
    else if (u.command === 'hold') tgt = this.nearestFoe(u, 4)
    else {
      const e = this.nearestFoe(u, SHADOW.engageRange)
      if (e && e.pos.distanceTo(p.pos) < SHADOW.leash) tgt = e
    }
    u.target = tgt
    if (u.state === 'windup' || u.state === 'strike' || u.state === 'recover') {
      u.vel.multiplyScalar(Math.max(0, 1 - dt * 8))
      if (u.state === 'windup' && u.t >= u.spec.windup * 0.6) {
        u.set('strike')
        if (tgt && Math.hypot(tgt.pos.x - u.pos.x, tgt.pos.z - u.pos.z) < Math.min(u.spec.attackRange, 2.2) + u.radius + tgt.radius + 0.6) host.strikeUnit(u, tgt)
      } else if (u.state === 'strike' && u.t >= 0.15) u.set('recover')
      else if (u.state === 'recover' && u.t >= u.spec.recover * 0.7) {
        u.cd = u.spec.cooldown * 0.8
        u.set('move')
      }
      return
    }
    const flyH = (u.spec.fly?.height ?? 0) * 0.4
    if (tgt) {
      const d = Math.hypot(tgt.pos.x - u.pos.x, tgt.pos.z - u.pos.z)
      const reach = Math.min(u.spec.attackRange, 2.2) + u.radius + tgt.radius
      this.steer(u, tgt.pos.x, tgt.pos.z, u.speed, dt, reach * 0.8)
      this.face(u, tgt.pos.x, tgt.pos.z, dt)
      if (d < reach + 0.3 && u.cd <= 0) u.set('windup')
      if (u.spec.fly) u.alt += (Math.min(flyH, tgt.alt + 0.8) - u.alt) * Math.min(1, dt * 2)
      return
    }
    const goal = u.command === 'hold' ? u.holdPos : this.spotOf ? this.spotOf(u) : p.pos
    const far = Math.hypot(goal.x - u.pos.x, goal.z - u.pos.z)
    this.steer(u, goal.x, goal.z, far > 6 ? u.speed * 1.4 : u.speed, dt, 0.4)
    if (far > 0.8) this.face(u, goal.x, goal.z, dt, 6)
    if (u.spec.fly) u.alt += (flyH - u.alt) * Math.min(1, dt * 2)
    // they heal while they are not fighting
    u.hp = Math.min(u.maxHp, u.hp + u.maxHp * SHADOW.regen * dt)
  }

  // ------------------------------------------------------------ movement

  private separate(u: Unit, dt: number) {
    const cx = Math.floor(u.pos.x / CELL)
    const cz = Math.floor(u.pos.z / CELL)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const list = this.grid.get(cellKey(cx + dx, cz + dz))
        if (!list) continue
        for (const o of list) {
          if (o === u) continue
          const ox = u.pos.x - o.pos.x
          const oz = u.pos.z - o.pos.z
          const min = u.radius + o.radius
          const d2 = ox * ox + oz * oz
          if (d2 >= min * min || d2 < 1e-6) continue
          const d = Math.sqrt(d2)
          // the heavier one gives way less
          const share = o.mass / (o.mass + u.mass)
          const push = ((min - d) / d) * Math.min(1, dt * 10) * share
          u.pos.x += ox * push
          u.pos.z += oz * push
        }
      }
    }
  }

  private move(u: Unit, dt: number, loose: boolean) {
    const host = this.host
    const nx = u.pos.x + u.vel.x * dt
    const nz = u.pos.z + u.vel.z * dt
    if (!host.blocked(nx, nz, u.pos.x, u.pos.z)) {
      u.pos.x = nx
      u.pos.z = nz
    } else {
      u.vel.x *= -0.2
      u.vel.z *= -0.2
    }
    if (!loose || u.state === 'dead') host.obstacles.pushOut(u.pos, u.radius, u.height)
    // written so a reset (NaN) always samples again: any comparison with NaN is false
    if (!(Math.abs(u.pos.x - u.groundX) + Math.abs(u.pos.z - u.groundZ) <= 0.04)) {
      u.ground = host.height(u.pos.x, u.pos.z)
      u.groundX = u.pos.x
      u.groundZ = u.pos.z
    }
    const ground = u.ground
    if (u.lifted > 0) {
      u.pos.y += (ground + SPELL.warp.liftHeight - u.pos.y) * Math.min(1, dt * 3)
      return
    }
    const air = u.flyer && u.alive ? u.alt : 0
    u.pos.y += (ground + air - u.pos.y) * Math.min(1, dt * (air > 0 ? 4 : 14))
    if (u.pos.y < ground) u.pos.y = ground
    u.walk += Math.hypot(u.vel.x, u.vel.z) * dt * 2.2
  }

  /** A body thrown by Telekinesis: nearly straight for a moment, then it falls. It hurts what it hits. */
  private fly(u: Unit, dt: number) {
    const host = this.host
    u.flight -= dt
    u.vel.y -= 22 * (u.flight > 0 ? SPELL.grip.flightGravity : 1) * dt
    u.pos.addScaledVector(u.vel, dt)
    u.yaw += dt * 6
    const speed = u.vel.length()
    const cx = Math.floor(u.pos.x / CELL)
    const cz = Math.floor(u.pos.z / CELL)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const list = this.grid.get(cellKey(cx + dx, cz + dz))
        if (!list) continue
        for (const o of list) {
          if (o === u || o.team !== u.team || !o.alive || o.state === 'thrown' || o.state === 'held') continue
          const d = Math.hypot(o.pos.x - u.pos.x, o.pos.z - u.pos.z)
          const dy = Math.abs(o.pos.y + o.height * 0.5 - (u.pos.y + u.height * 0.5))
          if (u.hurled && d < u.radius + o.radius + 0.3 && dy < (o.height + u.height) * 0.5) {
            host.impact(u, o, speed)
            this.land(u, 0.2)
            return
          }
        }
      }
    }
    if (host.obstacles.pushOut(u.pos, u.radius, u.height)) {
      if (u.hurled) host.impact(u, null, speed)
      this.land(u, 0.1)
      return
    }
    const ground = host.height(u.pos.x, u.pos.z)
    if (u.pos.y <= ground && u.vel.y < 0) {
      u.pos.y = ground
      if (u.hurled && speed > SPELL.impact.minSpeed) host.impact(u, null, speed)
      this.land(u, 0.3)
    }
  }

  /** Sends a body flying (a Telekinesis throw when `hurled`, else a blast that tosses it). */
  toss(u: Unit, vel: { x: number; y: number; z: number }, hurled: boolean, flight = 0) {
    if (!u.alive || u.spec.anchored) return
    this.host.clearTelegraph(u)
    u.token = false
    u.vel.set(vel.x, vel.y, vel.z)
    u.hurled = hurled
    u.flight = flight
    u.set('thrown')
    if (u.spec.fly) u.downed = Math.max(u.downed, 2.5)
  }

  private land(u: Unit, keep: number) {
    u.vel.multiplyScalar(keep)
    u.vel.y = 0
    u.flight = 0
    u.hurled = false
    u.groundX = NaN
    if (u.alive) u.set('move')
  }
}
