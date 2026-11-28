import { CAMP, MOVE, type V2Kind } from '../game/balance'
import { heightMap, inClearing, inWaterRect, LAGOON, LAKE, LANDMARKS, MERE, pathDist, PLAY_HALF, SPOTS, TEMPLE, WATER_LEVEL, ZONES, zoneAt, type Zone } from './map'

/**
 * Every creature kind has a ground of its own (owner, 28 Nov 2026: "setiap monster itu ada daerahnya
 * sendiri"), inside the zone of its level band. The grounds are scattered over each zone with ragged
 * outlines and uneven gaps (owner, same day: not in rows), from a fixed seed, so every load and every
 * test sees the same map. A few grounds sit on a landmark: the Imps by the start, the Hydra in Danau
 * Hitam, Atlas at the temple, Marinus in the lagoon, the Duyung in the mere. Map coordinates: x east, y north.
 */
export interface Territory {
  key: string
  name: string
  kind: V2Kind
  c: [number, number]
  /** Mean radius; the outline wanders between about 0.66 and 1.34 of it (see `reach`). */
  r: number
  /** Level of its first camp and its last; the camps in between climb evenly. */
  levels: [number, number]
  /** How many camps, and how many creatures each lists (spawned times CAMP.pack). */
  camps: number
  pack: number
  /** Elites in its last camp (the edge of the ground, PROMPT: "kamp elit ada di tepi zona"). */
  elites?: number
  /** One creature alone, standing again after CAMP.bossRespawn. */
  boss?: boolean
  /** Camps must stand at least this high (the Tebing plateau). */
  minHeight?: number
  /** Drawn by another system (the Hydra's lair): a name on the map, no camps. */
  noCamps?: boolean
  /** The outline: two waves around the centre (frequency, amplitude, phase). */
  wave: [number, number, number, number, number, number]
}

/** zone: where it may stand; at: a fixed centre; maxY: its centre lies south of this map y. */
type Plan = Omit<Territory, 'c' | 'wave'> & { zone: Zone['key']; at?: [number, number]; maxY?: number }

const PLATEAU = 30
const BLOB = 1.34

const PLANS: Plan[] = [
  // I Hutan Pembuka (Lv 1 to 3)
  { key: 'imp', name: 'Sarang Imp', kind: 'imp', zone: 'pembuka', at: [38, -551], r: 200, levels: [1, 3], camps: 9, pack: 4, elites: 1 },
  { key: 'hellhound', name: 'Padang Hellhound', kind: 'hellhound', zone: 'pembuka', r: 210, levels: [1, 3], camps: 9, pack: 3, elites: 1 },
  // the south (owner, 28 Nov 2026): four new weak creatures among the places of the south
  { key: 'aziza', name: 'Taman Aziza', kind: 'aziza', zone: 'pembuka', maxY: -900, r: 170, levels: [1, 2], camps: 6, pack: 5, elites: 1 },
  { key: 'kitsune', name: 'Hutan Kitsune', kind: 'kitsune', zone: 'pembuka', maxY: -900, r: 170, levels: [1, 2], camps: 6, pack: 3, elites: 1 },
  { key: 'sylph', name: 'Padang Sylph', kind: 'sylph', zone: 'pembuka', maxY: -900, r: 170, levels: [2, 3], camps: 6, pack: 3, elites: 1 },
  { key: 'banshee', name: 'Kabut Banshee', kind: 'banshee', zone: 'pembuka', maxY: -900, r: 170, levels: [3, 3], camps: 6, pack: 2, elites: 1 },
  // II Tebing Berangin (Lv 4 to 6), all on the plateau and its eastern lobe
  { key: 'harpy', name: 'Puncak Harpy', kind: 'harpy', zone: 'tebing', r: 95, levels: [4, 5], camps: 4, pack: 3, minHeight: PLATEAU },
