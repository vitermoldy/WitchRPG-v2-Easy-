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
