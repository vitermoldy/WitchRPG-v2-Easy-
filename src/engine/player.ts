import { MOVE } from '../game/balance'
import { forward, rightOf, type HeightFn } from './camera'
import type { Obstacles } from './obstacles'

export interface MoveInput {
  /** Strafe (-1 left, 1 right) and forward (-1 back, 1 forward), relative to the camera. */
  x: number
  y: number
  sprint: boolean
  dodge: boolean
  /** B pressed: take to the air, or land. */
  fly?: boolean
  /** While flying: 1 climbs (Space), -1 sinks (C). */
  rise?: number
}

export interface Ground {
  height: HeightFn
  obstacles: Obstacles | null
  /**
   * True where she may not step to from (fx, fz): deep water, past the map edge, a seal. `air`: she
   * is flying, so deep water is no wall; the map edge, the seal and the lair still are.
   */
  blocked: (x: number, z: number, fx?: number, fz?: number, air?: boolean) => boolean
  /** Lowest she can fly at: the ground, or the water over a lake. */
  floor?: HeightFn
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/**
 * Ilyra on foot: weighty acceleration, turning toward where she goes, and a roll on Space with a short
