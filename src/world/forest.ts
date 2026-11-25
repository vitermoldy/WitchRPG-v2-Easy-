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
