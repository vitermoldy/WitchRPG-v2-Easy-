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
export type HeightFn = (x: number, z: number) => number
export interface CamParams {
  dist: number
  shoulder: number
  height: number
  fov: number
}
export interface CamPose {
  pos: Vec
  dir: Vec
  fov: number
}

export const rad = (d: number) => (d * Math.PI) / 180
export const forward = (yaw: number, pitch: number): Vec => ({
  x: -Math.sin(yaw) * Math.cos(pitch),
  y: Math.sin(pitch),
  z: -Math.cos(yaw) * Math.cos(pitch),
})
export const rightOf = (yaw: number): Vec => ({ x: Math.cos(yaw), y: 0, z: -Math.sin(yaw) })
/** Yaw that looks from a toward b. */
export const yawTo = (ax: number, az: number, bx: number, bz: number) => Math.atan2(-(bx - ax), -(bz - az))

