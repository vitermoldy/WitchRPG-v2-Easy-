// The forest valley, ported from the phase 0 previz (previz/blender/pv_world.py) so the game and the
// previz share one layout. Map coordinates: x east, y north, metres. The three.js scene puts north
// at -z, so a map point (x, y) sits at world (x, -y): see toWorld / toMap.

export interface Zone {
  key: 'pembuka' | 'tebing' | 'rawa' | 'kuil' | 'bara' | 'ganjil'
  name: string
  tier: string
  levels: [number, number]
  c: [number, number]
  /** North-south radius; `rx` (east-west) makes the zone an ellipse. */
  r: number
  rx?: number
  /** Its share fades out south of this map y (Tanah Ganjil, so the wide ellipse keeps to the north). */
  south?: number
  /** Fog colour and how far one can see in it (metres to about 4% visibility). */
  fog: string
  sight: number
  ground: string
  sky: string
}

/**
 * The layout grew 1.9 times on 28 Nov 2026 (owner: a 5,000 m map, the zones made bigger in the same
 * arrangement). Places are written at the size of the 2,600 m map and scaled here; the Hydra's lake
export const ZONES: Zone[] = [
  { key: 'pembuka', name: 'Hutan Pembuka', tier: 'I', levels: [1, 3], c: [0, -280], r: 230, fog: '#cddbea', sight: 260, ground: '#2a3322', sky: '#9fb7d4' },
  { key: 'tebing', name: 'Tebing Berangin', tier: 'II', levels: [4, 6], c: [320, -40], r: 190, fog: '#e9c79c', sight: 430, ground: '#5b5141', sky: '#c9b394' },
  { key: 'rawa', name: 'Rawa Berkabut', tier: 'III', levels: [7, 9], c: [-300, 40], r: 200, fog: '#a9c491', sight: 150, ground: '#283224', sky: '#a7b89a' },
  { key: 'kuil', name: 'Reruntuhan Kuil', tier: 'IV', levels: [10, 12], c: [40, 330], r: 170, fog: '#8f9096', sight: 210, ground: '#373a33', sky: '#9a9ca4' },
  { key: 'bara', name: 'Lembah Bara', tier: 'V', levels: [13, 15], c: [330, 330], r: 165, fog: '#d8622c', sight: 230, ground: '#1d1917', sky: '#8a4a34' },
]

export const LAKE = { c: [-330, 300] as [number, number], r: 95 }
export const ALTAR: [number, number] = [-10, -395]
/**
 * Altars: heal, the point she rises at after a fall, and fast travel between the ones already lit
 * (like v1's altar). One by the start, one where the paths split, one on each new zone's path.
 */
export const ALTARS: { key: string; name: string; c: [number, number] }[] = [
  { key: 'pembuka', name: 'Altar Hutan Pembuka', c: ALTAR },
  { key: 'simpang', name: 'Altar Persimpangan', c: [28, -114] },
  { key: 'tebing', name: 'Altar Tebing Berangin', c: [242, -30] },
  { key: 'rawa', name: 'Altar Rawa Berkabut', c: [-184, -10] },
  { key: 'danau', name: 'Altar Danau Hitam', c: [-290, 200] },
  { key: 'kuil', name: 'Altar Reruntuhan Kuil', c: [40, 236] },
  { key: 'bara', name: 'Altar Lembah Bara', c: [268, 286] },
]
export const TEMPLE: [number, number] = [40, 318]
/** Where the previz shots stood; the start point is the hero clearing of render 01. */
export const SPOTS = {
  hero: [-34, -335] as [number, number],
  minotaur: [40, 282] as [number, number],
  hydra: [-330 + 0.673 * 100, 300 - 0.74 * 100] as [number, number],
  army: [128, -258] as [number, number],
}
export const PATHS: [number, number][][] = [
  [[-10, -395], [-25, -330], [0, -230], [20, -120], [30, 0], [45, 120], [40, 250]],
  [[20, -120], [-90, -80], [-190, -20], [-260, 90], [-290, 200]],
  [[30, 0], [140, -20], [230, -40]],
  [[45, 120], [180, 200], [280, 290]],
]
export const CLEARINGS: [[number, number], number][] = [
  [SPOTS.hero, 22], [SPOTS.army, 16], [ALTAR, 16], [TEMPLE, 30], [SPOTS.minotaur, 18], [SPOTS.hydra, 20],
  ...ALTARS.slice(1).map((a): [[number, number], number] => [a.c, 12]),
]
/** Half-size of the terrain (it runs past the playable map into the mountain ring). */
export const HALF = 650
/** The playable map is 1000 x 1000 m; the mountains past it are scenery. */
export const PLAY_HALF = 470

export const toWorld = (x: number, y: number): [number, number] => [x, -y]
export const toMap = (wx: number, wz: number): [number, number] => [wx, -wz]

// ------------------------------------------------------------ noise

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const LAT = (() => {
  const rnd = mulberry32(20261124)
  const a = new Float32Array(256 * 256)
  for (let i = 0; i < a.length; i++) a[i] = rnd() * 2 - 1
  return a
})()

export function vnoise(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const fx = x - xi
  const fy = y - yi
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  const x0 = xi & 255
  const y0 = yi & 255
  const x1 = (x0 + 1) & 255
  const y1 = (y0 + 1) & 255
  const a = LAT[x0 * 256 + y0]
  const b = LAT[x1 * 256 + y0]
  const c = LAT[x0 * 256 + y1]
  const d = LAT[x1 * 256 + y1]
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

export function fbm(x: number, y: number, octaves = 4, seed = 0): number {
  let s = 0
  let amp = 1
  let f = 1
  let norm = 0
  for (let k = 0; k < octaves; k++) {
    s += amp * vnoise(x * f + 37.1 * k + seed, y * f - 11.7 * k + seed)
    norm += amp
    amp *= 0.5
    f *= 2
  }
  return s / norm
}

export function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

const dist = (x: number, y: number, c: [number, number]) => Math.hypot(x - c[0], y - c[1])

function segDist(x: number, y: number, a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const t = Math.min(1, Math.max(0, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy))
}

// ------------------------------------------------------------ height

/** Ground height at a map point. */
export function heightMap(x: number, y: number): number {
  let h = 3.0 + 4.0 * fbm(x / 160, y / 160) + 1.3 * fbm(x / 45, y / 45, 3, 5.0)
  // Tebing Berangin: a raised plateau with a broken cliff edge
  const t = ZONES[1]
  const edge = t.r * 0.8 + 18 * fbm(x / 40, y / 40, 3, 9.0)
  const dt = dist(x, y, t.c)
  let plateau = smooth(edge + 14, edge - 6, dt)
  // where the path climbs onto the plateau the cliff becomes a long ramp (about 40 m up over 80 m)
  const toPath = Math.min(segDist(x, y, PATHS[2][0], PATHS[2][1]), segDist(x, y, PATHS[2][1], PATHS[2][2]))
  const ramp = smooth(14, 5, toPath)
  // the ramp ignores the ragged edge noise so its grade stays even
  if (ramp > 0) plateau = plateau * (1 - ramp) + ramp * smooth(t.r * 0.8 + 100, t.r * 0.8 - 10, dt)
  if (plateau > 0) h += plateau * (36 + 6 * fbm(x / 60, y / 60, 3, 2.0))
  // Reruntuhan Kuil: a gentle rise with a flat temple court
  const k = ZONES[3]
  h += 12 * smooth(k.r * 1.1, k.r * 0.5, dist(x, y, k.c))
  const court = smooth(36, 26, dist(x, y, TEMPLE))
  h = h * (1 - court) + court * 15.2
  // Rawa Berkabut: flattened to the water line, with pools
  const r = ZONES[2]
  const swamp = smooth(r.r * 1.15, r.r * 0.75, dist(x, y, r.c))
  if (swamp > 0) h = h * (1 - swamp) + swamp * (0.35 + 0.9 * fbm(x / 28, y / 28, 3, 3.0))
  // Danau Hitam, with a steep bank so the shore is a line, not a marsh
  const lake = smooth(LAKE.r * 1.05, LAKE.r * 0.85, dist(x, y, LAKE.c))
  h = h * (1 - lake) + lake * -7
  // Lembah Bara: a burnt bowl with a rim
  const b = ZONES[4]
  const db = dist(x, y, b.c)
  h += -7 * smooth(b.r * 0.9, b.r * 0.2, db) + 6 * smooth(b.r * 0.7, b.r, db) * smooth(b.r * 1.4, b.r, db)
  // the mountain ring that closes the valley
  const ringD = Math.max(Math.abs(x), Math.abs(y))
  if (ringD > 380) {
    const ring = smooth(440, 600, ringD + 30 * fbm(x / 120, y / 120, 3, 4.0))
    if (ring > 0) h += ring * (110 + 70 * fbm(x / 90, y / 90, 4, 8.0))
  }
  return h
}

/** Ground height under a three.js world point. */
export const heightAt = (wx: number, wz: number) => heightMap(wx, -wz)

/** Water surface level over the swamp and Danau Hitam. */
export const WATER_LEVEL = 0
/** The water plane covers this map rectangle (x0, y0, x1, y1). */
export const WATER_RECT: [number, number, number, number] = [-560, -170, -90, 420]

export function inWaterRect(x: number, y: number) {
  return x > WATER_RECT[0] && x < WATER_RECT[2] && y > WATER_RECT[1] && y < WATER_RECT[3]
}

// ------------------------------------------------------------ zones, paths

/** Soft share of each zone at a map point; they add up to 1. */
export function zoneWeights(x: number, y: number, out: Float32Array<ArrayBufferLike> = new Float32Array(ZONES.length)): Float32Array<ArrayBufferLike> {
  let sum = 0
  for (let i = 0; i < ZONES.length; i++) {
    const z = ZONES[i]
    const d = dist(x, y, z.c) / z.r
    out[i] = Math.exp(-3 * d * d)
    sum += out[i]
  }
  for (let i = 0; i < ZONES.length; i++) out[i] /= Math.max(sum, 1e-9)
  return out
}

export function zoneAt(x: number, y: number): Zone {
  const w = zoneWeights(x, y)
  let best = 0
  for (let i = 1; i < w.length; i++) if (w[i] > w[best]) best = i
  return ZONES[best]
}

export function pathDist(x: number, y: number): number {
  let best = 1e9
  for (const line of PATHS) {
    for (let i = 0; i < line.length - 1; i++) {
      const [ax, ay] = line[i]
      const [bx, by] = line[i + 1]
      const dx = bx - ax
      const dy = by - ay
      const t = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
      best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)))
    }
  }
  return best
}

export function inClearing(x: number, y: number, pad = 0): boolean {
  for (const [c, r] of CLEARINGS) if (dist(x, y, c) < r + pad) return true
  return false
}

export const lakeDist = (x: number, y: number) => dist(x, y, LAKE.c)
