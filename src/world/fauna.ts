import * as THREE from 'three'
import type { Game } from '../engine/game'
import type { Unit } from '../engine/units'
import { ALTARS, toWorld } from './map'

/**
 * The forest's wild creatures that never fight (PROMPT roster: not enemies): a Unicorn guards each
 * altar, a few Pegasi drift over the meadows. Each one only stands in the world while she is near,
 * like a camp, so the far ones cost nothing.
 */

const WAKE = 110
const SLEEP = 160

