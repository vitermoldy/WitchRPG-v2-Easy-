import { CAMERA, LOCKON } from '../game/balance'
import type { Obstacles } from './obstacles'

/**
 * The single over-the-shoulder camera. It never cuts: normal, aim and lock-on are blends of one rig.
 * It never passes through a tree, rock or the ground: the way from her head to the wanted spot is
 * swept with a sphere, and the camera stops at the first thing it would touch.
 * yaw 0 looks north (-z); yaw grows to the left. pitch grows upward.
 */
export interface Vec {
  x: number
  y: number
  z: number
}
