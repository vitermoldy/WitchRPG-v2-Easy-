import * as THREE from 'three'
import { COMBAT, ELITE, SHADOW, SPELL, UNITS, type AttackSpec, type EliteTrait, type UnitKind, type UnitSpec } from '../game/balance'
import { unitStats, type ShadowRecord } from '../game/progression'
import { StunMeter } from './combat'
import type { HeightFn } from './camera'
import type { Obstacles } from './obstacles'

export type Team = 'enemy' | 'shadow'
export type UnitState = 'rising' | 'move' | 'windup' | 'strike' | 'recover' | 'stagger' | 'held' | 'thrown' | 'finishing' | 'diving' | 'ashes' | 'dead' | 'sinking'
