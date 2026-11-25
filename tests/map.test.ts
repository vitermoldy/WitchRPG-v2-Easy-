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
    const step = 1
    for (const line of PATHS) {
      for (let i = 0; i < line.length - 1; i++) {
        const [ax, ay] = line[i]
        const [bx, by] = line[i + 1]
        const len = Math.hypot(bx - ax, by - ay)
        let prev = heightMap(ax, ay)
        for (let d = step; d <= len; d += step) {
          const x = ax + ((bx - ax) * d) / len
          const y = ay + ((by - ay) * d) / len
          const h = heightMap(x, y)
          const rise = h - prev
          expect(rise, `path ${line[0]} at ${x.toFixed(0)}, ${y.toFixed(0)}`).toBeLessThanOrEqual(MOVE.maxSlope * step)
          if (inWaterRect(x, y)) expect(WATER_LEVEL - h, `water at ${x.toFixed(0)}, ${y.toFixed(0)}`).toBeLessThanOrEqual(MOVE.maxWade)
          prev = h
        }
      }
    }
  })

