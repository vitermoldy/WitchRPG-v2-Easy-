import { MOVE } from '../game/balance'
import { forward, rightOf, type HeightFn } from './camera'
import type { Obstacles } from './obstacles'

export interface MoveInput {
  /** Strafe (-1 left, 1 right) and forward (-1 back, 1 forward), relative to the camera. */
  x: number
  y: number
  sprint: boolean
  dodge: boolean
