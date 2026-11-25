import * as THREE from 'three'
import type { Game } from '../engine/game'
import { COLOR } from '../engine/palette'
import { ALTARS, toWorld } from './map'

export interface Altar {
  key: string
  name: string
  pos: THREE.Vector3
  crystal: THREE.Mesh
  rune: THREE.Mesh
}

/** She lights an altar by walking within this distance; it heals her within the same reach. */
export const ALTAR_REACH = 7
