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

interface Spot {
  kind: 'unicorn' | 'pegasus'
  x: number
  z: number
  unit: Unit | null
}

// meadows (map coordinates) checked like the camps: dry, gentle ground
const MEADOWS: [number, number][] = [
  [-100, -360],
  [120, -300],
  [300, 100],
  [-20, 380],
]

export class Fauna {
