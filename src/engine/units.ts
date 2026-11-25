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

