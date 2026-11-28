import { CAMP, MOVE, type V2Kind } from '../game/balance'
import { heightMap, inClearing, inWaterRect, LAGOON, LAKE, LANDMARKS, MERE, pathDist, PLAY_HALF, SPOTS, TEMPLE, WATER_LEVEL, ZONES, zoneAt, type Zone } from './map'

/**
 * Every creature kind has a ground of its own (owner, 28 Nov 2026: "setiap monster itu ada daerahnya
 * sendiri"), inside the zone of its level band. The grounds are scattered over each zone with ragged
 * outlines and uneven gaps (owner, same day: not in rows), from a fixed seed, so every load and every
 * test sees the same map. A few grounds sit on a landmark: the Imps by the start, the Hydra in Danau
 * Hitam, Atlas at the temple, Marinus in the lagoon, the Duyung in the mere. Map coordinates: x east, y north.
 */
export interface Territory {
  key: string
  name: string
  kind: V2Kind
  c: [number, number]
  /** Mean radius; the outline wanders between about 0.66 and 1.34 of it (see `reach`). */
  r: number
  /** Level of its first camp and its last; the camps in between climb evenly. */
  levels: [number, number]
  /** How many camps, and how many creatures each lists (spawned times CAMP.pack). */
  camps: number
  pack: number
  /** Elites in its last camp (the edge of the ground, PROMPT: "kamp elit ada di tepi zona"). */
  elites?: number
  /** One creature alone, standing again after CAMP.bossRespawn. */
  boss?: boolean
  /** Camps must stand at least this high (the Tebing plateau). */
  minHeight?: number
  /** Drawn by another system (the Hydra's lair): a name on the map, no camps. */
  noCamps?: boolean
  /** The outline: two waves around the centre (frequency, amplitude, phase). */
  wave: [number, number, number, number, number, number]
}

/** zone: where it may stand; at: a fixed centre; maxY: its centre lies south of this map y. */
type Plan = Omit<Territory, 'c' | 'wave'> & { zone: Zone['key']; at?: [number, number]; maxY?: number }

const PLATEAU = 30
const BLOB = 1.34

const PLANS: Plan[] = [
  // I Hutan Pembuka (Lv 1 to 3)
  { key: 'imp', name: 'Sarang Imp', kind: 'imp', zone: 'pembuka', at: [38, -551], r: 200, levels: [1, 3], camps: 9, pack: 4, elites: 1 },
  { key: 'hellhound', name: 'Padang Hellhound', kind: 'hellhound', zone: 'pembuka', r: 210, levels: [1, 3], camps: 9, pack: 3, elites: 1 },
  // the south (owner, 28 Nov 2026): four new weak creatures among the places of the south
  { key: 'aziza', name: 'Taman Aziza', kind: 'aziza', zone: 'pembuka', maxY: -900, r: 170, levels: [1, 2], camps: 6, pack: 5, elites: 1 },
  { key: 'kitsune', name: 'Hutan Kitsune', kind: 'kitsune', zone: 'pembuka', maxY: -900, r: 170, levels: [1, 2], camps: 6, pack: 3, elites: 1 },
  { key: 'sylph', name: 'Padang Sylph', kind: 'sylph', zone: 'pembuka', maxY: -900, r: 170, levels: [2, 3], camps: 6, pack: 3, elites: 1 },
  { key: 'banshee', name: 'Kabut Banshee', kind: 'banshee', zone: 'pembuka', maxY: -900, r: 170, levels: [3, 3], camps: 6, pack: 2, elites: 1 },
  // II Tebing Berangin (Lv 4 to 6), all on the plateau and its eastern lobe
  { key: 'harpy', name: 'Puncak Harpy', kind: 'harpy', zone: 'tebing', r: 95, levels: [4, 5], camps: 4, pack: 3, minHeight: PLATEAU },
  { key: 'centaur', name: 'Padang Centaur', kind: 'centaur', zone: 'tebing', r: 95, levels: [4, 5], camps: 4, pack: 2, minHeight: PLATEAU },
  { key: 'griffin', name: 'Sarang Griffin', kind: 'griffin', zone: 'tebing', r: 95, levels: [5, 6], camps: 4, pack: 2, elites: 1, minHeight: PLATEAU },
  { key: 'hippogriff', name: 'Tebing Hippogriff', kind: 'hippogriff', zone: 'tebing', r: 95, levels: [5, 6], camps: 4, pack: 3, elites: 1, minHeight: PLATEAU },
  { key: 'aquilon', name: 'Puncak Aquilon', kind: 'aquilon', zone: 'tebing', r: 95, levels: [5, 6], camps: 4, pack: 2, elites: 1, minHeight: PLATEAU },
  // III Rawa Berkabut (Lv 7 to 9)
  { key: 'hydra', name: 'Danau Hitam', kind: 'hydra', zone: 'rawa', at: LAKE.c, r: LAKE.r, levels: [10, 10], camps: 0, pack: 0, noCamps: true, boss: true },
  { key: 'duyung', name: 'Telaga Duyung', kind: 'duyung', zone: 'rawa', at: MERE.c, r: 150, levels: [8, 9], camps: 5, pack: 2, elites: 1 },
  { key: 'naga', name: 'Rawa Naga', kind: 'naga', zone: 'rawa', r: 180, levels: [7, 8], camps: 7, pack: 3 },
  { key: 'minotaur', name: 'Padang Minotaur', kind: 'minotaur', zone: 'rawa', r: 180, levels: [7, 9], camps: 7, pack: 2, elites: 1 },
  { key: 'medusa', name: 'Kolam Medusa', kind: 'medusa', zone: 'rawa', r: 100, levels: [9, 9], camps: 1, pack: 1 },
  { key: 'chimera', name: 'Sarang Chimera', kind: 'chimera', zone: 'rawa', r: 100, levels: [9, 9], camps: 1, pack: 1 },
  // IV Reruntuhan Kuil (Lv 10 to 12, sealed until the Hydra falls)
  { key: 'atlas', name: 'Pelataran Atlas', kind: 'atlas', zone: 'kuil', at: [Math.round(TEMPLE[0]), Math.round(TEMPLE[1] - 18)], r: 45, levels: [17, 17], camps: 1, pack: 1, boss: true },
  { key: 'cyclops', name: 'Lembah Cyclops', kind: 'cyclops', zone: 'kuil', r: 95, levels: [10, 12], camps: 5, pack: 1, elites: 1 },
  { key: 'succubus', name: 'Taman Succubus', kind: 'succubus', zone: 'kuil', r: 95, levels: [10, 12], camps: 5, pack: 2, elites: 1 },
  { key: 'incubus', name: 'Lorong Incubus', kind: 'incubus', zone: 'kuil', r: 95, levels: [11, 12], camps: 5, pack: 2, elites: 1 },
  { key: 'aries', name: 'Lembah Aries', kind: 'aries', zone: 'kuil', r: 95, levels: [11, 12], camps: 5, pack: 2, elites: 1 },
  { key: 'typhon', name: 'Bukit Typhon', kind: 'typhon', zone: 'kuil', r: 60, levels: [18, 18], camps: 1, pack: 1, boss: true },
  // V Lembah Bara (Lv 13 to 15, sealed until the Hydra falls)
  { key: 'phoenix', name: 'Kawah Phoenix', kind: 'phoenix', zone: 'bara', r: 140, levels: [13, 15], camps: 7, pack: 2, elites: 2 },
  { key: 'manticore', name: 'Sarang Manticore', kind: 'manticore', zone: 'bara', r: 95, levels: [15, 15], camps: 1, pack: 1 },
  { key: 'cerberus', name: 'Gerbang Cerberus', kind: 'cerberus', zone: 'bara', r: 65, levels: [15, 15], camps: 1, pack: 1, boss: true },
  { key: 'lilith', name: 'Taman Lilith', kind: 'lilith', zone: 'bara', r: 65, levels: [16, 16], camps: 1, pack: 1, boss: true },
  { key: 'dragon', name: 'Sarang Dragon', kind: 'dragon', zone: 'bara', r: 65, levels: [17, 17], camps: 1, pack: 1, boss: true },
  { key: 'samael', name: 'Bawah Rift Samael', kind: 'samael', zone: 'bara', r: 65, levels: [19, 19], camps: 1, pack: 1, boss: true },
  { key: 'blackdragon', name: 'Kaldera Dragon Hitam', kind: 'blackdragon', zone: 'bara', r: 70, levels: [20, 20], camps: 1, pack: 1, boss: true },
  // VI Tanah Ganjil (Lv 16 to 18, sealed until the Hydra falls): the second batch
  { key: 'marinus', name: 'Laguna Marinus', kind: 'marinus', zone: 'ganjil', at: LAGOON.c, r: 170, levels: [17, 18], camps: 5, pack: 2, elites: 1 },
  { key: 'satyr', name: 'Padang Satyr', kind: 'satyr', zone: 'ganjil', r: 160, levels: [16, 17], camps: 5, pack: 3, elites: 1 },
  { key: 'silenus', name: 'Kebun Silenus', kind: 'silenus', zone: 'ganjil', r: 160, levels: [16, 17], camps: 5, pack: 3, elites: 1 },
  { key: 'blemmye', name: 'Dataran Blemmye', kind: 'blemmye', zone: 'ganjil', r: 160, levels: [16, 17], camps: 5, pack: 3, elites: 1 },
  { key: 'panotti', name: 'Ladang Panotti', kind: 'panotti', zone: 'ganjil', r: 160, levels: [16, 17], camps: 5, pack: 3, elites: 1 },
  { key: 'silvana', name: 'Belukar Silvana', kind: 'silvana', zone: 'ganjil', r: 160, levels: [16, 17], camps: 5, pack: 3, elites: 1 },
  { key: 'raia', name: 'Langit Raia', kind: 'raia', zone: 'ganjil', r: 160, levels: [16, 17], camps: 5, pack: 3, elites: 1 },
  { key: 'sirena', name: 'Karang Ravenna', kind: 'sirena', zone: 'ganjil', r: 160, levels: [16, 17], camps: 5, pack: 3, elites: 1 },
  { key: 'leonis', name: 'Gua Leonis', kind: 'leonis', zone: 'ganjil', r: 160, levels: [17, 18], camps: 5, pack: 2, elites: 1 },
  { key: 'cornutus', name: 'Tanduk Cornutus', kind: 'cornutus', zone: 'ganjil', r: 160, levels: [17, 18], camps: 5, pack: 2, elites: 1 },
  { key: 'cacodaemon', name: 'Menara Cacodaemon', kind: 'cacodaemon', zone: 'ganjil', r: 160, levels: [17, 18], camps: 5, pack: 2, elites: 1 },
  { key: 'cracovia', name: 'Rimba Cracovia', kind: 'cracovia', zone: 'ganjil', r: 160, levels: [17, 18], camps: 5, pack: 2, elites: 1 },
  { key: 'hippocentaurus', name: 'Padang Hippocentaurus', kind: 'hippocentaurus', zone: 'ganjil', r: 160, levels: [17, 18], camps: 5, pack: 2, elites: 1 },
  { key: 'triceps', name: 'Sarang Triceps', kind: 'triceps', zone: 'ganjil', r: 160, levels: [18, 18], camps: 5, pack: 1, elites: 1 },
  { key: 'tetrachiron', name: 'Bukit Tetrachiron', kind: 'tetrachiron', zone: 'ganjil', r: 160, levels: [18, 18], camps: 5, pack: 1, elites: 1 },
  { key: 'buer', name: 'Jalur Buer', kind: 'buer', zone: 'ganjil', r: 160, levels: [18, 18], camps: 5, pack: 1, elites: 1 },
  { key: 'septiceps', name: 'Takhta Discordia', kind: 'septiceps', zone: 'ganjil', r: 85, levels: [20, 20], camps: 1, pack: 1, boss: true },
  { key: 'asmodeus', name: 'Istana Asmodeus', kind: 'asmodeus', zone: 'ganjil', r: 85, levels: [21, 21], camps: 1, pack: 1, boss: true },
]

const SEED = 20261128

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** How far the outline of a territory reaches in a direction (radians, map angle), in metres. */
export function reach(t: Pick<Territory, 'r' | 'wave'>, a: number) {
  const [f1, a1, p1, f2, a2, p2] = t.wave
  return t.r * (1 + a1 * Math.sin(f1 * a + p1) + a2 * Math.sin(f2 * a + p2))
}

/** True when the map point lies inside the territory's ragged outline. */
export function inside(t: Territory, x: number, y: number) {
  const d = Math.hypot(x - t.c[0], y - t.c[1])
  if (d > t.r * BLOB) return false
  return d < reach(t, Math.atan2(y - t.c[1], x - t.c[0]))
}

const WATERS = [LAGOON, MERE]

/** Places every territory: landmarks first, then the big grounds of each zone, then the boss arenas. */
function place(): Territory[] {
  const out: Territory[] = []
  const margin = new Map<string, number>()
  const order = [...PLANS].sort((a, b) => Number(!!b.at) - Number(!!a.at) || Number(!!a.boss) - Number(!!b.boss) || b.r - a.r)
  for (const plan of order) {
    const rnd = rng(SEED + [...plan.key].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) >>> 0, 7))
    const wave: Territory['wave'] = plan.at
      ? [2, 0.12, rnd() * 6.28, 5, 0.06, rnd() * 6.28]
      : [2 + Math.floor(rnd() * 2), 0.14 + rnd() * 0.08, rnd() * 6.28, 4 + Math.floor(rnd() * 2), 0.06 + rnd() * 0.06, rnd() * 6.28]
    const own = 10 + rnd() * 40
    const { zone, at, maxY, ...rest } = plan
    const z = ZONES.find((zz) => zz.key === zone)!
    let spot: [number, number] | null = at ?? null
    const span = (z.rx ?? z.r) * 2.2
    // a crowded zone: the ground shrinks a tenth at a time until it fits
    for (let k = 0; k < 6000 && !spot; k++) {
      if (k > 0 && k % 1500 === 0) rest.r = Math.round(rest.r * 0.9)
      // a ground kept to the south searches the whole width of the map south of its line
      const x = Math.round(maxY !== undefined ? (rnd() * 2 - 1) * PLAY_HALF : z.c[0] + (rnd() * 2 - 1) * span)
      const y = Math.round(maxY !== undefined ? maxY - rnd() * (PLAY_HALF + maxY) : z.c[1] + (rnd() * 2 - 1) * z.r * 2.2)
      if (fits({ ...rest, c: [x, y], wave }, zone, own, out, margin)) spot = [x, y]
    }
    if (!spot) throw new Error(`territory ${plan.key} found no room in ${zone}`)
    margin.set(plan.key, own)
    out.push({ ...rest, c: spot, wave })
  }
  // back in the order of the plan (zones, then kinds), for the map and the tests
  return PLANS.map((p) => out.find((t) => t.key === p.key)!)
}

/** Whether a territory fits: inside its zone and the map, apart from the others, off the landmarks it does not own. */
function fits(t: Territory, zone: string, own: number, placed: Territory[], margin: Map<string, number>) {
  const [cx, cy] = t.c
  const big = t.r * BLOB
  if (Math.max(Math.abs(cx), Math.abs(cy)) + big > PLAY_HALF - 60) return false
  for (const o of placed) {
    if (Math.hypot(cx - o.c[0], cy - o.c[1]) < big + o.r * BLOB + own + (margin.get(o.key) ?? 0)) return false
  }
  if (Math.hypot(cx - LAKE.c[0], cy - LAKE.c[1]) < LAKE.r * 1.2 + big + 30) return false
  for (const w of WATERS) if (Math.hypot(cx - w.c[0], cy - w.c[1]) < w.r * 1.3 + big) return false
  if (Math.hypot(cx - SPOTS.hero[0], cy - SPOTS.hero[1]) < big + 150) return false
  if (Math.hypot(cx - TEMPLE[0], cy - TEMPLE[1]) < big + 60) return false
  for (const l of LANDMARKS) if (Math.hypot(cx - l.c[0], cy - l.c[1]) < l.r * 1.5 + big + 30) return false
  // the whole outline lies in the zone (and on the plateau, for Tebing)
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const rr = i === 12 ? 0 : reach(t, a)
    const x = cx + Math.cos(a) * rr
    const y = cy + Math.sin(a) * rr
    if (zoneAt(x, y).key !== zone) return false
    if (t.minHeight !== undefined && heightMap(x, y) < t.minHeight + 2) return false
  }
  return true
}

export const TERRITORIES: Territory[] = place()

/** Highest rise over one metre around a point, the way her feet would feel it. */
export function steepest(x: number, y: number) {
  const h = heightMap(x, y)
  let worst = 0
  for (let a = 0; a < 8; a++) worst = Math.max(worst, Math.abs(heightMap(x + Math.cos(a * 0.785), y + Math.sin(a * 0.785)) - h))
  return worst
}

/** Can a camp of this territory stand here: same zone, firm or wadeable ground, not on an altar, the lake or a path. */
export function campGround(t: Territory, x: number, y: number) {
  if (zoneAt(x, y).key !== zoneAt(t.c[0], t.c[1]).key) return false
  if (steepest(x, y) > MOVE.maxSlope * 0.6) return false
  const h = heightMap(x, y)
  if (inWaterRect(x, y) && WATER_LEVEL - h > MOVE.maxWade * 0.8) return false
  if (Math.hypot(x - LAKE.c[0], y - LAKE.c[1]) < LAKE.r * 1.1) return false
  if (inClearing(x, y, 6) || pathDist(x, y) < 6) return false
  if (t.minHeight !== undefined && h < t.minHeight) return false
