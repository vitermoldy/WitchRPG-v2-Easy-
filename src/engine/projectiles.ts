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
