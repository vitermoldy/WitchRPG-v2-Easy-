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
