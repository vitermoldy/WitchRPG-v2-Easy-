import * as THREE from 'three'
import { fbm, HALF, heightMap, pathDist, smooth, ZONES, zoneWeights } from './map'

/** Terrain chunks: 10 x 10 of 130 m. Each has three levels of detail, made when first needed. */
export const CHUNK = 130
export const CHUNKS = Math.round((HALF * 2) / CHUNK)
/** Vertex spacing per level of detail (metres) and the distance up to which each is used. */
const LOD_STEP = [2, 5, 10]
const LOD_RANGE = [190, 420, Infinity]
/** Skirts hang below every chunk edge so neighbours at different detail never show a gap. */
const SKIRT = 5

const hex = (h: string) => new THREE.Color(h)
const GROUND = ZONES.map((z) => hex(z.ground))
const ROCK = hex('#4a4642')
const MUD = hex('#1a1d14')
const SNOW = hex('#c9ced6')
