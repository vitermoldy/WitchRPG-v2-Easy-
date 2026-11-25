import { describe, expect, it } from 'vitest'
import { MOVE, WORLD_BOSSES } from '../src/game/balance'
import { ALTARS, heightMap, inWaterRect, PATHS, SPOTS, WATER_LEVEL, ZONES, zoneAt, zoneWeights } from '../src/world/map'
import { CAMP_DEFS } from '../src/world/camps'

/** Highest rise over one metre around a point, the way her feet would feel it. */
