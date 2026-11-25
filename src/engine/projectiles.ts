import * as THREE from 'three'
import { SPELL, type AttackSpec } from '../game/balance'
import type { Game } from './game'
import { COLOR } from './palette'
import { ringOf, type Unit } from './units'

interface Shot {
  pos: THREE.Vector3
  prev: THREE.Vector3
  vel: THREE.Vector3
  gravity: number
  radius: number
  source: Unit
  atk: AttackSpec
  /** Where a glob lands (the centre of its amber circle). */
  aim: THREE.Vector3
  life: number
  mesh: THREE.Mesh
  /** Turned back by Reality Warp: it now flies at the creature that shot it. */
  reflected: boolean
}

const globGeo = new THREE.IcosahedronGeometry(1, 1)
const arrowGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.1, 5)
arrowGeo.rotateX(Math.PI / 2)
const amber = new THREE.MeshBasicMaterial({ color: new THREE.Color(COLOR.rift).multiplyScalar(2.6) })
const red = new THREE.MeshBasicMaterial({ color: new THREE.Color(COLOR.chaos).multiplyScalar(3) })

/**
 * Creature projectiles: Centaur arrows fly along the flashing line (only a roll avoids them), Naga globs
 * arc onto the amber circle (block or parry them, or step out). Shadows in the way are hit as well.
 * Inside a Reality Warp field they turn back on whoever shot them, as in v1.
 */
export class Projectiles {
  readonly group = new THREE.Group()
  private readonly shots: Shot[] = []
  private readonly g: Game
  private readonly seg = new THREE.Vector3()
  private readonly c = new THREE.Vector3()

  constructor(g: Game) {
    this.g = g
    this.group.name = 'shots'
  }

  get count() {
    return this.shots.length
