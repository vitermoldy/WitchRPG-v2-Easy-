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
 * and the temple court keep their size so the fights in them stay as they were.
 */
export const SCALE = 1.9
const s = (x: number, y: number): [number, number] => [x * SCALE, y * SCALE]

export const ZONES: Zone[] = [
  { key: 'pembuka', name: 'Hutan Pembuka', tier: 'I', levels: [1, 3], c: s(0, -280), r: 230 * SCALE, fog: '#cddbea', sight: 260, ground: '#2a3322', sky: '#9fb7d4' },
  { key: 'tebing', name: 'Tebing Berangin', tier: 'II', levels: [4, 6], c: s(320, -40), r: 190 * SCALE, fog: '#e9c79c', sight: 430, ground: '#5b5141', sky: '#c9b394' },
  { key: 'rawa', name: 'Rawa Berkabut', tier: 'III', levels: [7, 9], c: s(-300, 40), r: 200 * SCALE, fog: '#a9c491', sight: 150, ground: '#283224', sky: '#a7b89a' },
  { key: 'kuil', name: 'Reruntuhan Kuil', tier: 'IV', levels: [10, 12], c: s(40, 330), r: 200 * SCALE, fog: '#8f9096', sight: 210, ground: '#373a33', sky: '#9a9ca4' },
  { key: 'bara', name: 'Lembah Bara', tier: 'V', levels: [13, 15], c: s(330, 330), r: 195 * SCALE, fog: '#d8622c', sight: 230, ground: '#1d1917', sky: '#8a4a34' },
  // the second batch of creatures (owner, 28 Nov 2026): a long band of odd country north of the old valley
  { key: 'ganjil', name: 'Tanah Ganjil', tier: 'VI', levels: [16, 18], c: s(0, 880), r: 280 * SCALE, rx: 900 * SCALE, south: 520 * SCALE, fog: '#a597bd', sight: 240, ground: '#38322a', sky: '#7e6f98' },
]

export const LAKE = { c: s(-330, 300), r: 95 }
/** The Marinus lagoon in the west of Tanah Ganjil: shallow water she can wade. */
export const LAGOON = { c: s(-650, 650), r: 150 }
/** The Duyung's mere in the west of Rawa Berkabut: shallow water too. */
export const MERE = { c: s(-620, -40), r: 130 }

/**
 * Places without monsters in the south of Hutan Pembuka (owner, 28 Nov 2026: fill the south, half new
 * monsters and half places to explore), each with an altar. Map coordinates as they stand (not scaled).
 */
export interface Landmark {
  key: string
  name: string
  kind: 'tower' | 'mere' | 'stones' | 'mushrooms'
  c: [number, number]
  r: number
}
export const LANDMARKS: Landmark[] = [
  { key: 'menara', name: 'Reruntuhan Menara', kind: 'tower', c: [-1350, -1450], r: 90 },
  { key: 'telaga', name: 'Telaga Bunga', kind: 'mere', c: [250, -1950], r: 100 },
  { key: 'batu', name: 'Batu Tegak', kind: 'stones', c: [-650, -2150], r: 80 },
  { key: 'jamur', name: 'Kebun Jamur', kind: 'mushrooms', c: [1150, -1750], r: 100 },
]
const POND = LANDMARKS[1]
/** The eastern lobe of the Tebing plateau: a second ellipse of the same cliff. */
export const TEBING_EAST = { c: s(660, -40), rx: 230 * SCALE, ry: 190 * SCALE }
export const ALTAR = s(-10, -395)
/**
 * Altars: heal, the point she rises at after a fall, and fast travel between the ones already lit
 * (like v1's altar). One by the start, one where the paths split, one on each new zone's path.
 */
export const ALTARS: { key: string; name: string; c: [number, number] }[] = [
  { key: 'pembuka', name: 'Altar Hutan Pembuka', c: ALTAR },
  { key: 'simpang', name: 'Altar Persimpangan', c: s(28, -114) },
  { key: 'tebing', name: 'Altar Tebing Berangin', c: s(242, -30) },
  { key: 'rawa', name: 'Altar Rawa Berkabut', c: s(-184, -10) },
  { key: 'danau', name: 'Altar Danau Hitam', c: s(-290, 200) },
  { key: 'kuil', name: 'Altar Reruntuhan Kuil', c: s(40, 236) },
  { key: 'bara', name: 'Altar Lembah Bara', c: s(268, 286) },
  // the wider map (owner, 28 Nov 2026): the southern meadow, the west of the swamp, the eastern plateau, Tanah Ganjil
  { key: 'selatan', name: 'Altar Padang Selatan', c: s(-60, -700) },
  { key: 'rawa_barat', name: 'Altar Rawa Barat', c: s(-640, -180) },
  { key: 'tebing_timur', name: 'Altar Tebing Timur', c: s(600, -35) },
  { key: 'ganjil', name: 'Altar Tanah Ganjil', c: s(12, 545) },
  { key: 'ganjil_barat', name: 'Altar Ganjil Barat', c: s(-520, 778) },
  { key: 'ganjil_timur', name: 'Altar Ganjil Timur', c: s(520, 778) },
  { key: 'ganjil_utara', name: 'Altar Ganjil Utara', c: s(0, 1030) },
  // one by each place of the south
  ...LANDMARKS.map((l) => ({ key: l.key, name: `Altar ${l.name}`, c: [l.c[0], l.c[1] - (l.kind === 'mere' ? l.r * 1.3 : l.r * 0.55)] as [number, number] })),
]
export const TEMPLE = s(40, 318)
/** Where the previz shots stood; the start point is the hero clearing of render 01. */
export const SPOTS = {
  hero: s(-34, -335),
  // in front of the temple, at its old distance from the court
  minotaur: [TEMPLE[0], TEMPLE[1] - 36] as [number, number],
  // on the lake shore, as far from the water as before
  hydra: [LAKE.c[0] + 0.673 * 100, LAKE.c[1] - 0.74 * 100] as [number, number],
  army: s(128, -258),
}
export const PATHS: [number, number][][] = [
  [[-10, -395], [-25, -330], [0, -230], [20, -120], [30, 0], [45, 120], [40, 250]],
  [[20, -120], [-90, -80], [-190, -20], [-260, 90], [-290, 200]],
  [[30, 0], [140, -20], [230, -40]],
  [[45, 120], [180, 200], [280, 290]],
  // the wider map: south to the Hellhound meadow, west to the mere, across the plateau, and north into Tanah Ganjil
  [[-25, -330], [-40, -440], [-45, -560], [-60, -700], [-75, -820]],
  [[-190, -20], [-420, -100], [-640, -180], [-900, -160]],
  [[230, -40], [420, -40], [600, -35]],
  [[40, 345], [30, 450], [12, 545], [0, 660], [0, 778]],
  [[-900, 778], [-650, 770], [-390, 780], [-130, 775], [0, 778], [130, 775], [390, 780], [650, 770], [900, 778]],
  [[0, 778], [0, 900], [0, 1030], [0, 1100]],
].map((line) => line.map(([x, y]) => s(x, y)))
// the south: from the end of the Hellhound road to the four places
PATHS.push(
  [[-142, -1558], [-700, -1500], [-1300, -1460]],
  [[-142, -1558], [-400, -1850], [-640, -2090]],
  [[-142, -1558], [100, -1750], [250, -1820]],
  [[100, -1750], [650, -1700], [1100, -1740]],
)
export const CLEARINGS: [[number, number], number][] = [
  ...LANDMARKS.map((l): [[number, number], number] => [l.c, l.r * 0.9]),
  [SPOTS.hero, 22], [SPOTS.army, 16], [ALTAR, 16], [TEMPLE, 30], [SPOTS.minotaur, 18], [SPOTS.hydra, 20],
  ...ALTARS.slice(1).map((a): [[number, number], number] => [a.c, 12]),
]
/** Half-size of the terrain (it runs past the playable map into the mountain ring); 44 chunks of 130 m. */
export const HALF = 2860
/** The playable map is 5000 x 5000 m (1000 until 28 Nov 2026, then 1800 and 2600); the mountains past it are scenery. */
export const PLAY_HALF = 2500
/** Where the mountain ring starts to rise (largest of |x| and |y|), and where it is full height. */
export const RING: [number, number] = [2515, 2675]

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
  // its eastern lobe: the same cliff on an ellipse that overlaps the first, so the two are one plateau
  const de = Math.hypot((x - TEBING_EAST.c[0]) / TEBING_EAST.rx, (y - TEBING_EAST.c[1]) / TEBING_EAST.ry) * t.r * 0.8
  plateau = Math.max(plateau, smooth(edge + 14, edge - 6, de))
  if (plateau > 0) h += plateau * (36 + 6 * fbm(x / 60, y / 60, 3, 2.0))
  // Reruntuhan Kuil: a gentle rise with a flat temple court
  const k = ZONES[3]
  h += 12 * smooth(k.r * 1.1, k.r * 0.5, dist(x, y, k.c))
  const court = smooth(36, 26, dist(x, y, TEMPLE))
  h = h * (1 - court) + court * 15.2
  // Rawa Berkabut: flattened to the water line, with pools
  const r = ZONES[2]
  const swamp = smooth(r.r * 1.15, r.r * 0.75, dist(x, y, r.c))
  let wet = swamp
  if (swamp > 0) h = h * (1 - swamp) + swamp * (0.35 + 0.9 * fbm(x / 28, y / 28, 3, 3.0))
  // Danau Hitam, with a steep bank so the shore is a line, not a marsh
  const lake = smooth(LAKE.r * 1.05, LAKE.r * 0.85, dist(x, y, LAKE.c))
  wet = Math.max(wet, lake)
  h = h * (1 - lake) + lake * -7
  // Lembah Bara: a burnt bowl with a rim
  const b = ZONES[4]
  const db = dist(x, y, b.c)
  h += -7 * smooth(b.r * 0.9, b.r * 0.2, db) + 6 * smooth(b.r * 0.7, b.r, db) * smooth(b.r * 1.4, b.r, db)
  // Tanah Ganjil: low rolling hills, and the shallow Marinus lagoon in its west
  const gj = smooth(470 * SCALE, 580 * SCALE, y)
  if (gj > 0) {
    h += gj * 5 * fbm(x / 70, y / 70, 3, 7.0)
    const lg = smooth(LAGOON.r * 1.2, LAGOON.r * 0.75, dist(x, y, LAGOON.c))
    if (lg > 0) h = h * (1 - lg) + lg * (0.05 + 0.75 * fbm(x / 22, y / 22, 3, 11.0))
    wet = Math.max(wet, lg)
  }
  // the places of the south: level ground round each, the flower pond shallow water
  for (const l of LANDMARKS) {
    const dl = dist(x, y, l.c)
    if (dl > l.r * 1.5) continue
    const level = 3.0 + 4.0 * fbm(l.c[0] / 160, l.c[1] / 160) + (l.kind === 'stones' ? 3 : 0)
    const flat = smooth(l.r * 1.5, l.r * 0.8, dl)
    h = h * (1 - flat) + flat * level
    if (l.kind === 'mere') {
      const pond = smooth(l.r * 0.85, l.r * 0.55, dl)
      h = h * (1 - pond) + pond * (0.1 + 0.6 * fbm(x / 18, y / 18, 3, 17.0))
      wet = Math.max(wet, pond)
    }
  }
  // the Duyung's mere in the west of the swamp
  const mr = smooth(MERE.r * 1.2, MERE.r * 0.75, dist(x, y, MERE.c))
  if (mr > 0) {
    h = h * (1 - mr) + mr * (0.05 + 0.75 * fbm(x / 22, y / 22, 3, 13.0))
    wet = Math.max(wet, mr)
  }
  // under the water planes only the swamp, the lake and the lagoon hold water: other hollows stay dry
  if (h < DRY && inWaterRect(x, y)) h = h * wet + DRY * (1 - wet)
  // the mountain ring that closes the valley
  const ringD = Math.max(Math.abs(x), Math.abs(y))
  if (ringD > RING[0] - 60) {
    const ring = smooth(RING[0], RING[1], ringD + 30 * fbm(x / 120, y / 120, 3, 4.0))
    if (ring > 0) h += ring * (110 + 70 * fbm(x / 90, y / 90, 4, 8.0))
  }
  return h
}

/** Ground height under a three.js world point. */
export const heightAt = (wx: number, wz: number) => heightMap(wx, -wz)

/** Water surface level over the swamp, Danau Hitam, the Marinus lagoon and the Duyung's mere. */
export const WATER_LEVEL = 0
/** Lowest ground under a water plane away from the swamp, the lake and the lagoon (m). */
const DRY = 0.4
const around = (w: { c: [number, number]; r: number }): [number, number, number, number] => [w.c[0] - w.r * 1.3, w.c[1] - w.r * 1.3, w.c[0] + w.r * 1.3, w.c[1] + w.r * 1.3]
/** The water planes, as map rectangles (x0, y0, x1, y1): the swamp with Danau Hitam, the lagoon, the mere. */
export const WATER_RECTS: [number, number, number, number][] = [
  [-560 * SCALE, -170 * SCALE, -90 * SCALE, 420 * SCALE],
  around(LAGOON),
  around(MERE),

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
