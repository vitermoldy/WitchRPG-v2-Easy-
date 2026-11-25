// The forest valley, ported from the phase 0 previz (previz/blender/pv_world.py) so the game and the
// previz share one layout. Map coordinates: x east, y north, metres. The three.js scene puts north
// at -z, so a map point (x, y) sits at world (x, -y): see toWorld / toMap.

export interface Zone {
  key: 'pembuka' | 'tebing' | 'rawa' | 'kuil' | 'bara'
  name: string
  tier: string
  levels: [number, number]
  c: [number, number]
  r: number
  /** Fog colour and how far one can see in it (metres to about 4% visibility). */
  fog: string
  sight: number
  ground: string
  sky: string
}

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
