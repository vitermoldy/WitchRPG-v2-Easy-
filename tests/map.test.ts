import { describe, expect, it } from 'vitest'
import { MOVE, WORLD_BOSSES } from '../src/game/balance'
import { ALTARS, heightMap, inWaterRect, PATHS, SPOTS, WATER_LEVEL, ZONES, zoneAt, zoneWeights } from '../src/world/map'
import { CAMP_DEFS } from '../src/world/camps'

/** Highest rise over one metre around a point, the way her feet would feel it. */
function steepest(x: number, y: number) {
  const h = heightMap(x, y)
  let worst = 0
  for (let a = 0; a < 8; a++) worst = Math.max(worst, Math.abs(heightMap(x + Math.cos(a * 0.785), y + Math.sin(a * 0.785)) - h))
  return worst
}

describe('the forest valley', () => {
  it('lets her walk every path end to end: no cliff steeper than she can climb, no deep water', () => {
