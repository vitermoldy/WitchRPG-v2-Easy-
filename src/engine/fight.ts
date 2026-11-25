import * as THREE from 'three'
import { COMBAT, type Swing } from '../game/balance'
import { yawTo } from './camera'
import { Combo, inSwing, type ComboEvent, type SwingState } from './combat'
import type { Game } from './game'
import type { IlyraPose } from './models'
import { COLOR } from './palette'
import type { Unit } from './units'

export interface FightInput {
  attackPressed: boolean
  attackHeld: boolean
  blockHeld: boolean
  blockPressed: boolean
  execute: boolean
  throwStaff: boolean
  /** Steering this frame in world space (for which way a swing goes), zero when none is held. */
  dirX: number
  dirZ: number
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
const Y = new THREE.Vector3(0, 1, 0)

/** Throw time of the staff: when in the throw it leaves her hand, and how long the throw plays. */
const THROW_TIME = 0.36
const THROW_RELEASE = 0.15
const CATCH_TIME = 0.25

/**
 * The staff thrown with H: it flies straight at the aim point, sticks in whatever it meets, and comes
 * back on the second H, hitting every creature on its way home.
 */
