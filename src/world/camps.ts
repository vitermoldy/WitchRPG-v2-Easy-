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
  { c: [302, -6], pack: { centaur: 2, harpy: 1 }, levels: [5, 5] },
  { c: [360, 10], pack: { harpy: 4 }, levels: [5, 5] },
  { c: [336, -128], pack: { harpy: 3, centaur: 1 }, levels: [5, 6] },
  { c: [392, -62], pack: { centaur: 3 }, levels: [6, 6] },
  // Rawa Berkabut (Tier III, Lv 7 to 9): Naga in the swamp, Minotaurs on the drier ground, two lairs
  { c: [-140, -70], pack: { naga: 3 }, levels: [7, 7] },
  { c: [-222, -42], pack: { naga: 2, minotaur: 1 }, levels: [7, 8] },
  { c: [-252, 40], pack: { minotaur: 2 }, levels: [8, 8] },
  { c: [-300, 120], pack: { naga: 4 }, levels: [8, 8] },
  { c: [-200, 108], pack: { minotaur: 1, naga: 2 }, levels: [8, 9] },
  { c: [-332, 30], pack: { medusa: 1, naga: 2 }, levels: [9, 9] },
  { c: [-252, 190], pack: { chimera: 1 }, levels: [9, 9] },
  // elite camps at the edges of zones I to III (PROMPT: "kamp elit ada di tepi zona")
  { c: [96, -176], pack: { imp: 3, hellhound: 2 }, levels: [3, 3], elites: 1 },
  { c: [196, 14], pack: { centaur: 2, harpy: 2 }, levels: [6, 6], elites: 1 },
  { c: [-120, 40], pack: { minotaur: 1, naga: 2 }, levels: [9, 9], elites: 1 },
  // Reruntuhan Kuil (Tier IV, Lv 10 to 12, sealed until the Hydra falls): Minotaurs, Cyclopes, Succubus, Incubus
  { c: [40, 282], pack: { minotaur: 2 }, levels: [10, 10] },
  { c: [100, 300], pack: { succubus: 1, imp: 2 }, levels: [10, 11] },
  { c: [-20, 330], pack: { cyclops: 1, minotaur: 1 }, levels: [11, 11] },
  { c: [92, 382], pack: { incubus: 1, minotaur: 1 }, levels: [11, 12] },
  { c: [40, 330], pack: { incubus: 1, succubus: 1 }, levels: [12, 12], elites: 1 },
  { c: [-40, 400], pack: { cyclops: 2 }, levels: [12, 12], elites: 1 },
  { c: [140, 250], pack: { minotaur: 2, cyclops: 1 }, levels: [12, 12], elites: 2 },
  // Lembah Bara (Tier V, Lv 13 to 15, sealed until the Hydra falls): Phoenixes and elite mixes
