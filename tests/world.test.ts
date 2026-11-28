import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { Obstacles } from '../src/engine/obstacles'
import { Forest, scatterTile, TILE } from '../src/world/forest'
import { HALF, inClearing, pathDist, SPOTS, toMap, toWorld } from '../src/world/map'
import { Terrain } from '../src/world/terrain'

describe('the forest, one tile at a time (5000 m map)', () => {
