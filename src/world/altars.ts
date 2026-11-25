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
/** HP and mana back per second at a lit altar, as a share of the maximum (v1's altar). */
const HEAL = 0.12

const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4448, roughness: 0.95 })

/**
 * Altars of the valley. Walking up to one lights it: from then on she rises there after a fall, it
 * heals her while she stands at it, and F there opens fast travel to every other lit altar and the
 * Ledger. An unlit altar's crystal is a dull grey; a lit one glows Umbra violet.
 */
export class Altars {
  readonly group = new THREE.Group()
  readonly list: Altar[]
  private readonly g: Game
  private readonly lit = new THREE.Color(COLOR.umbra).multiplyScalar(2.4)
  private readonly dull = new THREE.Color(0x2a2430)
