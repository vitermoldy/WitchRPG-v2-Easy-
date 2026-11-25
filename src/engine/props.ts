import * as THREE from 'three'
import { HYDRA, SPELL } from '../game/balance'
import { impactDamage } from '../game/progression'
import type { Game } from './game'
import { COLOR } from './palette'

export interface Prop {
  readonly pos: THREE.Vector3
  readonly vel: THREE.Vector3
  readonly mass: number
  readonly radius: number
  held: boolean
  /** Thrown by Telekinesis: it hurts the first creature it meets. */
  thrown: boolean
  flight: number
  spin: number
}

const CAP = 16

/**
 * Boulders she can lift with Telekinesis and throw (the Hydra's islands keep a few). A thrown boulder
 * hurts the first creature it meets by its weight and speed, as a thrown body does, and counts as a
 * thrown thing (it goes through the Minotaur's shield and does 150% to the Hydra's slimy skin).
 */
export class Props {
  readonly list: Prop[] = []
  readonly mesh: THREE.InstancedMesh
  private readonly g: Game
