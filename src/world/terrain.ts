import * as THREE from 'three'
import { fbm, HALF, heightMap, pathDist, smooth, ZONES, zoneWeights } from './map'

/** Terrain chunks: 10 x 10 of 130 m. Each has three levels of detail, made when first needed. */
export const CHUNK = 130
export const CHUNKS = Math.round((HALF * 2) / CHUNK)
