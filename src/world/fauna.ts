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
  readonly spots: Spot[]
  private readonly g: Game

  constructor(g: Game) {
    this.g = g
    const spot = (kind: Spot['kind'], mx: number, my: number): Spot => {
      const [x, z] = toWorld(mx, my)
      return { kind, x, z, unit: null }
    }
    // the Unicorn stands a few metres off the altar, out of the way of the stone
    this.spots = [...ALTARS.map((a) => spot('unicorn', a.c[0] + 7, a.c[1] + 5)), ...MEADOWS.map(([x, y]) => spot('pegasus', x, y))]
  }

  update() {
    const g = this.g
    const p = g.player.pos
    for (const s of this.spots) {
      const d = Math.hypot(p.x - s.x, p.z - s.z)
      if (!s.unit && d < WAKE) {
        const u = g.units.spawn(s.kind, 'enemy', 1, { x: s.x, z: s.z })
        u.home = new THREE.Vector3(s.x, 0, s.z)
        u.aggro = false
        s.unit = u
      } else if (s.unit && d > SLEEP) {
        g.units.remove(s.unit)
        s.unit = null
      }
    }
  }

  /** Where each one lives, for the map. */
  list() {
    return this.spots.map((s) => ({ kind: s.kind, x: s.x, z: s.z }))
