import { FAUNA, UNITS, type UnitKind, type V2Kind } from '../game/balance'
import type { Game } from '../engine/game'
import { CAMP_DEFS } from '../world/camps'
import { ALTARS, heightMap, inWaterRect, PATHS, PLAY_HALF, toMap, WATER_LEVEL, ZONES, zoneWeights } from '../world/map'

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T

/** Half the width of the map drawn (m): a little past the playable edge. */
const EXTENT = PLAY_HALF + 10
const BASE = 320
