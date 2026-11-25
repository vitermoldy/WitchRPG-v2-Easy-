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
const PATH = hex('#4a3b2c')

interface Chunk {
  ix: number
  iz: number
  centre: THREE.Vector3
  meshes: (THREE.Mesh | null)[]
  lod: number
}

/** Ground colour at a map point, from the zone blend, slope, wetness, height and paths. */
function groundColour(x: number, y: number, h: number, slope: number, out: THREE.Color, w: Float32Array) {
  zoneWeights(x, y, w)
  out.setRGB(0, 0, 0)
  for (let i = 0; i < GROUND.length; i++) {
    out.r += GROUND[i].r * w[i]
    out.g += GROUND[i].g * w[i]
    out.b += GROUND[i].b * w[i]
  }
  out.lerp(ROCK, smooth(0.45, 0.9, slope))
  out.lerp(MUD, 0.6 * smooth(0.9, 0.2, h) * smooth(-3, 0, h))
  out.lerp(SNOW, smooth(150, 190, h))
  const pd = pathDist(x, y)
  if (pd < 3.5) out.lerp(PATH, 0.7 * smooth(3.2, 1.2, pd) * (1 - smooth(0.3, 0.6, slope)))
  const v = 0.82 + 0.3 * (fbm(x / 6, y / 6, 3, 12) * 0.5 + 0.5)
  out.multiplyScalar(v)
}

export class Terrain {
  readonly group = new THREE.Group()
  // double-sided so the skirts show whichever way they face
  readonly material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })
  private readonly chunks: Chunk[] = []
  private readonly w = new Float32Array(ZONES.length)
  private readonly tmp = new THREE.Color()
  /** Chunk meshes built so far, for the debug readout. */
  built = 0

  constructor() {
    this.group.name = 'terrain'
    for (let iz = 0; iz < CHUNKS; iz++) {
      for (let ix = 0; ix < CHUNKS; ix++) {
        const cx = -HALF + (ix + 0.5) * CHUNK
        const cz = -HALF + (iz + 0.5) * CHUNK
        this.chunks.push({ ix, iz, centre: new THREE.Vector3(cx, heightMap(cx, -cz), cz), meshes: [null, null, null], lod: -1 })
      }
    }
    // the far detail of every chunk exists from the start, so nothing is ever missing on screen
    for (const c of this.chunks) this.ensure(c, 2)
  }

  /** Picks each chunk's detail for the camera position; builds at most `budget` new meshes. */
  update(at: THREE.Vector3, budget = 1) {
    let made = 0
    for (const c of this.chunks) {
      const d = Math.hypot(c.centre.x - at.x, c.centre.z - at.z)
      let want = LOD_RANGE.findIndex((r) => d < r)
      if (!c.meshes[want] && want < 2) {
        if (made < budget) {
          this.ensure(c, want)
          made++
        } else {
          // use the closest detail already built until this one is made
          want = c.meshes[1] && want === 0 ? 1 : 2
        }
      }
