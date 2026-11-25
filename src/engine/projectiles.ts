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
