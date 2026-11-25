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
      if (want !== c.lod) {
        if (c.lod >= 0 && c.meshes[c.lod]) c.meshes[c.lod]!.visible = false
        c.meshes[want]!.visible = true
        c.lod = want
      }
    }
  }

  /** Builds the detail levels near a point right away (used before the first frame). */
  prepare(at: THREE.Vector3) {
    this.update(at, 1000)
  }

  private ensure(c: Chunk, lod: number) {
    if (c.meshes[lod]) return
    const mesh = new THREE.Mesh(this.geometry(c.ix, c.iz, LOD_STEP[lod]), this.material)
    mesh.receiveShadow = true
    mesh.visible = false
    mesh.matrixAutoUpdate = false
    mesh.name = `chunk ${c.ix},${c.iz} lod${lod}`
    this.group.add(mesh)
    c.meshes[lod] = mesh
    this.built++
  }

  private geometry(ix: number, iz: number, step: number): THREE.BufferGeometry {
    const n = Math.round(CHUNK / step)
    const x0 = -HALF + ix * CHUNK
    const z0 = -HALF + iz * CHUNK
    // heights on a grid one step wider on every side, so normals match across chunk edges
    const g = n + 3
    const hs = new Float32Array(g * g)
    for (let j = 0; j < g; j++) {
      for (let i = 0; i < g; i++) {
        const wx = x0 + (i - 1) * step
        const wz = z0 + (j - 1) * step
        hs[j * g + i] = heightMap(wx, -wz)
      }
    }
    const vcount = (n + 1) * (n + 1) + 4 * (n + 1)
    const pos = new Float32Array(vcount * 3)
    const nor = new Float32Array(vcount * 3)
    const col = new Float32Array(vcount * 3)
    const nv = new THREE.Vector3()
    let v = 0
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) {
        const gi = (j + 1) * g + (i + 1)
        const wx = x0 + i * step
        const wz = z0 + j * step
        const h = hs[gi]
        const dx = (hs[gi + 1] - hs[gi - 1]) / (2 * step)
        const dz = (hs[gi + g] - hs[gi - g]) / (2 * step)
        nv.set(-dx, 1, -dz).normalize()
        pos.set([wx, h, wz], v * 3)
        nor.set([nv.x, nv.y, nv.z], v * 3)
        const slope = Math.hypot(dx, dz)
        groundColour(wx, -wz, h, slope, this.tmp, this.w)
        col.set([this.tmp.r, this.tmp.g, this.tmp.b], v * 3)
        v++
      }
    }
    const idx: number[] = []
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const a = j * (n + 1) + i
        idx.push(a, a + n + 1, a + 1, a + 1, a + n + 1, a + n + 2)
      }
    }
    // skirts: copy each edge row down by SKIRT metres and stitch it to the edge
    const edges: number[][] = [[], [], [], []]
    for (let k = 0; k <= n; k++) {
      edges[0].push(k)
      edges[1].push(n * (n + 1) + k)
      edges[2].push(k * (n + 1))
      edges[3].push(k * (n + 1) + n)
    }
    edges.forEach((edge, e) => {
      const start = v
      for (const src of edge) {
        pos.set([pos[src * 3], pos[src * 3 + 1] - SKIRT, pos[src * 3 + 2]], v * 3)
        nor.set([nor[src * 3], nor[src * 3 + 1], nor[src * 3 + 2]], v * 3)
        col.set([col[src * 3] * 0.6, col[src * 3 + 1] * 0.6, col[src * 3 + 2] * 0.6], v * 3)
        v++
      }
