import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { Obstacles } from '../src/engine/obstacles'
import { Forest, scatterTile, TILE } from '../src/world/forest'
import { HALF, inClearing, pathDist, SPOTS, toMap, toWorld } from '../src/world/map'
import { Terrain } from '../src/world/terrain'

describe('the forest, one tile at a time (5000 m map)', () => {
  it('scatters the same trees in a tile whatever order the tiles come in', () => {
    const a = scatterTile(3, -2)
    scatterTile(0, 0)
    scatterTile(-5, 7)
    const b = scatterTile(3, -2)
    expect(a.length).toBeGreaterThan(50)
    expect(b).toEqual(a)
    // every tree stands inside its own tile
    for (const t of a) {
      expect(t.x).toBeGreaterThanOrEqual(3 * TILE - 2)
      expect(t.x).toBeLessThan(4 * TILE + 2)
      expect(t.z).toBeGreaterThanOrEqual(-2 * TILE - 2)
      expect(t.z).toBeLessThan(-1 * TILE + 2)
    }
  })

  it('keeps trees off the paths and the clearings, and leaves tiles past the terrain empty', () => {
    const [hx, hz] = toWorld(SPOTS.hero[0], SPOTS.hero[1])
    const trees = scatterTile(Math.floor(hx / TILE), Math.floor(hz / TILE))
    for (const t of trees) {
      if (t.kind === 'rock' || t.kind === 'rock_big') continue
      const [mx, my] = toMap(t.x, t.z)
      expect(pathDist(mx, my)).toBeGreaterThanOrEqual(3.5)
      expect(inClearing(mx, my)).toBe(false)
    }
    const far = Math.ceil((HALF + TILE) / TILE) + 1
    expect(scatterTile(far, 0)).toEqual([])
  })

  it('loads the tiles around her with their colliders, and more as she moves', () => {
    const obs = new Obstacles()
    const forest = new Forest(obs)
    const [hx, hz] = toWorld(SPOTS.hero[0], SPOTS.hero[1])
    forest.prepare(hx, hz)
    const first = obs.shapes.length
    expect(forest.count).toBeGreaterThan(1000)
    expect(first).toBeGreaterThan(forest.count)
    // a step further: the nearest missing tile comes in, one per update
