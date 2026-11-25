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

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/** Where the camera wants to be for this pivot and view, before anything blocks it. */
export function wanted(pivot: Vec, yaw: number, pitch: number, p: CamParams): Vec {
  const f = forward(yaw, pitch)
  const r = rightOf(yaw)
  return {
    x: pivot.x - f.x * p.dist + r.x * p.shoulder,
    y: pivot.y - f.y * p.dist,
    z: pivot.z - f.z * p.dist + r.z * p.shoulder,
  }
}

/** Furthest clear share of the way from the pivot to the wanted spot (0 to 1). */
export function clearFraction(pivot: Vec, want: Vec, obstacles: Obstacles | null, height: HeightFn, radius = CAMERA.radius): number {
  let f = obstacles ? obstacles.sweep(pivot.x, pivot.y, pivot.z, want.x, want.y, want.z, radius) : 1
  const steps = 14
  let last = 0
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * f
    const x = pivot.x + (want.x - pivot.x) * t
    const y = pivot.y + (want.y - pivot.y) * t
    const z = pivot.z + (want.z - pivot.z) * t
    if (y < height(x, z) + radius + 0.05) {
      f = last
      break
    }
    last = t
  }
  return f
}

export interface LockView {
  /** Point on the target the camera frames (its chest). */
  point: Vec
  /** Target height, for pulling back from big creatures. */
  height: number
