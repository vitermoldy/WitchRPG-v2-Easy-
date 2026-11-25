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

