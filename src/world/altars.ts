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
  private spin = 0

  constructor(g: Game) {
    this.g = g
    this.group.name = 'altars'
    const baseGeo = new THREE.CylinderGeometry(1.7, 2.1, 0.55, 8)
    const stoneGeo = new THREE.BoxGeometry(0.5, 2.2, 0.35)
    const crystalGeo = new THREE.OctahedronGeometry(0.42, 0)
    crystalGeo.scale(1, 1.7, 1)
    const runeGeo = new THREE.RingGeometry(2.3, 2.55, 48)
    runeGeo.rotateX(-Math.PI / 2)
