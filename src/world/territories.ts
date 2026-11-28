import { CAMP, MOVE, type V2Kind } from '../game/balance'
import { heightMap, inClearing, inWaterRect, LAGOON, LAKE, LANDMARKS, MERE, pathDist, PLAY_HALF, SPOTS, TEMPLE, WATER_LEVEL, ZONES, zoneAt, type Zone } from './map'

/**
 * Every creature kind has a ground of its own (owner, 28 Nov 2026: "setiap monster itu ada daerahnya
