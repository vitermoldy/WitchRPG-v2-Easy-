import * as THREE from 'three'
import { UNITS, type UnitKind } from '../game/balance'
import { bakeByMaterial } from './models'
import { COLOR } from './palette'
import type { Team, Unit } from './units'

const D = Math.PI / 180
const UP = new THREE.Vector3(0, 1, 0)
