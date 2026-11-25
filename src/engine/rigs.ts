import * as THREE from 'three'
import { UNITS, type UnitKind } from '../game/balance'
import { bakeByMaterial } from './models'
import { COLOR } from './palette'
import type { Team, Unit } from './units'

const D = Math.PI / 180
const UP = new THREE.Vector3(0, 1, 0)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/** Steering passes per frame for the Hydra's necks, and how high a head's middle lies above its circle (m). */
const NECK_PASSES = 3
const HEAD_LIES = 1

