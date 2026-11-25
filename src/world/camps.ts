import * as THREE from 'three'
import { CAMP, ELITE, UNITS, type V2Kind } from '../game/balance'
import type { Game } from '../engine/game'
import { COLOR } from '../engine/palette'
import type { Unit } from '../engine/units'
import { heightMap, toWorld } from './map'

export interface CampDef {
  /** Map point (x east, y north). */
  c: [number, number]
  pack: Partial<Record<V2Kind, number>>
  levels: [number, number]
  /** How many of the pack come out elite, each with a random v1 trait. */
  elites?: number
  /** A boss of the open world: one creature, its own level, stands again after `CAMP.bossRespawn`. */
