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
