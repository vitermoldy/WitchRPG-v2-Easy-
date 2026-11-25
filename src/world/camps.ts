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
  boss?: boolean
}

/**
 * Hutan Pembuka (Tier I, Lv 1 to 3): Imps and Hellhounds, the first camps along the path north of the
 * start clearing. Tebing Berangin (Tier II, Lv 4 to 6): Harpies and Centaurs on the plateau. Rawa
 * Berkabut (Tier III, Lv 7 to 9): Naga, Minotaurs, and the lairs of Medusa and the Chimera. Levels rise
 * with the distance from the start, inside each zone's band.
 */
export const CAMP_DEFS: CampDef[] = [
  { c: [-20, -292], pack: { imp: 4 }, levels: [1, 1] },
  { c: [-44, -384], pack: { imp: 4 }, levels: [1, 1] },
  { c: [30, -300], pack: { imp: 5 }, levels: [1, 2] },
  { c: [-72, -292], pack: { hellhound: 3 }, levels: [1, 2] },
  { c: [72, -358], pack: { hellhound: 3 }, levels: [2, 2] },
  { c: [-112, -330], pack: { imp: 5, hellhound: 1 }, levels: [2, 2] },
  { c: [12, -228], pack: { imp: 4, hellhound: 2 }, levels: [2, 3] },
  { c: [110, -280], pack: { imp: 6 }, levels: [2, 3] },
  { c: [-150, -250], pack: { hellhound: 4 }, levels: [3, 3] },
  { c: [40, -168], pack: { imp: 4, hellhound: 2 }, levels: [3, 3] },
  { c: [286, -70], pack: { harpy: 3 }, levels: [4, 4] },
  { c: [222, -78], pack: { centaur: 2 }, levels: [4, 4] },
  { c: [250, 30], pack: { harpy: 3, centaur: 1 }, levels: [4, 5] },
