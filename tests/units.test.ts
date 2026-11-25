import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { COMBAT, UNITS } from '../src/game/balance'
import { Obstacles } from '../src/engine/obstacles'
import { RING_RADIUS, shieldShare, Unit, UnitSystem, type Foe, type UnitHost } from '../src/engine/units'

/** A flat empty clearing with her standing still at the origin. */
function world(groundHeight = 0) {
