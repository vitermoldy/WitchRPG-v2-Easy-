import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CYL, Obstacles, SPHERE } from '../engine/obstacles'
import { heightMap, inClearing, lakeDist, LAKE, pathDist, smooth, ZONES, zoneWeights } from './map'

/**
 * The forest, scattered like the previz (pv_world.py build_forest): a jittered 4 m grid, each spot
 * taking its zone's tree mix and density. All trees and rocks are one BatchedMesh, so the whole
 * forest is one draw call and every tree is frustum-culled on its own.
 */
type Kind = 'pine' | 'pine_tall' | 'pine_warm' | 'birch' | 'swamp' | 'dead' | 'burnt' | 'rock' | 'rock_big'

/** Shape of each kind at scale 1, for the colliders: trunk radius and height, crown base, radius and top. */
const SHAPE: Record<Kind, { trunk: number; h: number; crown: [number, number, number] | null }> = {
  pine: { trunk: 0.3, h: 13, crown: [3.6, 2.4, 13.5] },
  pine_tall: { trunk: 0.32, h: 20, crown: [5.6, 2.6, 20.5] },
  pine_warm: { trunk: 0.3, h: 11, crown: [3.1, 2.7, 11.5] },
  birch: { trunk: 0.2, h: 11, crown: [6.4, 2.2, 11.5] },
  swamp: { trunk: 0.45, h: 9, crown: [6.2, 2.8, 10.6] },
  dead: { trunk: 0.35, h: 8, crown: null },
  burnt: { trunk: 0.35, h: 8, crown: null },
  rock: { trunk: 1.2, h: 0, crown: null },
  rock_big: { trunk: 4.2, h: 0, crown: null },
}

const MIX: Record<string, [Partial<Record<Kind, number>>, number]> = {
  pembuka: [{ pine: 0.45, pine_tall: 0.2, birch: 0.35 }, 2.4],
  tebing: [{ pine_warm: 0.7, pine: 0.3 }, 0.32],
  rawa: [{ swamp: 0.55, dead: 0.3, pine: 0.15 }, 0.95],
  kuil: [{ pine: 0.5, pine_tall: 0.35, birch: 0.15 }, 1.3],
  bara: [{ burnt: 0.85, dead: 0.15 }, 0.85],
}

// ------------------------------------------------------------ geometry

const C = (h: string) => new THREE.Color(h)
const PAL = {
  bark: C('#2a211c'), needle: C('#1a2d22'), needle2: C('#2a3524'), birch: C('#cfcac0'), leaf: C('#56703a'),
  moss: C('#3a4a2c'), swampwood: C('#26241d'), dead: C('#4a4540'), burnt: C('#1a1310'), rock: C('#55524e'), rock2: C('#6e6252'),
