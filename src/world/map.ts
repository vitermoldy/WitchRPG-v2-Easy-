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
