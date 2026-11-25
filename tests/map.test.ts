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

  it('starts her and every previz spot on dry ground', () => {
    for (const [name, [x, y]] of Object.entries(SPOTS)) {
      expect(heightMap(x, y), name).toBeGreaterThan(WATER_LEVEL + 0.3)
    }
  })

  it('blends zones that add up to one and name the zone at its own centre', () => {
    for (const z of ZONES) {
      const w = zoneWeights(z.c[0], z.c[1])
      expect(w.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 5)
      expect(zoneAt(z.c[0], z.c[1]).key).toBe(z.key)
    }
  })

  it('keeps every camp inside its zone and the zone level band (three levels per tier, as in v1)', () => {
    for (const camp of CAMP_DEFS.filter((c) => !c.boss)) {
      const z = zoneAt(camp.c[0], camp.c[1])
      expect(camp.levels[0], `camp at ${camp.c} in ${z.name}`).toBeGreaterThanOrEqual(z.levels[0])
      expect(camp.levels[1], `camp at ${camp.c} in ${z.name}`).toBeLessThanOrEqual(z.levels[1])
      expect(z.levels[1] - z.levels[0]).toBe(2)
    }
    // every zone of phase 4 has camps
    for (const key of ['pembuka', 'tebing', 'rawa', 'kuil', 'bara']) expect(CAMP_DEFS.some((c) => zoneAt(c.c[0], c.c[1]).key === key), key).toBe(true)
  })

  it('gives every boss of the open world a camp of its own behind the seal, above its zone band', () => {
    for (const kind of WORLD_BOSSES) {
      const camps = CAMP_DEFS.filter((c) => c.boss && c.pack[kind])
      expect(camps.length, kind).toBe(1)
      const [camp] = camps
      expect(Object.keys(camp.pack), kind).toEqual([kind])
      const z = zoneAt(camp.c[0], camp.c[1])
      expect(['kuil', 'bara'], kind).toContain(z.key)
      expect(camp.levels[0], kind).toBeGreaterThanOrEqual(z.levels[1])
    }
  })

  it('stands every camp and altar on ground she can walk: not deep water, not a cliff', () => {
    const spots = [...CAMP_DEFS.map((c) => ({ name: `kamp ${c.c}`, c: c.c })), ...ALTARS.map((a) => ({ name: a.name, c: a.c }))]
    for (const { name, c } of spots) {
      const [x, y] = c
      if (inWaterRect(x, y)) expect(WATER_LEVEL - heightMap(x, y), name).toBeLessThanOrEqual(MOVE.maxWade)
      expect(steepest(x, y), name).toBeLessThan(MOVE.maxSlope)
    }
  })

  it('puts the Tebing camps and altar up on the plateau, reached by the ramp', () => {
    const floor = heightMap(0, -280)
    for (const camp of CAMP_DEFS.filter((c) => zoneAt(c.c[0], c.c[1]).key === 'tebing')) expect(heightMap(camp.c[0], camp.c[1]) - floor, `kamp ${camp.c}`).toBeGreaterThan(20)
    const altar = ALTARS.find((a) => a.key === 'tebing')!
    expect(heightMap(altar.c[0], altar.c[1]) - floor).toBeGreaterThan(20)
  })

  it('raises Tebing Berangin as a plateau above the forest floor', () => {
    const t = ZONES.find((z) => z.key === 'tebing')!
    expect(heightMap(t.c[0], t.c[1]) - heightMap(0, -280)).toBeGreaterThan(25)
  })
})
