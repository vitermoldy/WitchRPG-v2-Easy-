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

