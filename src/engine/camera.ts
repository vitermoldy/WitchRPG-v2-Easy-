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
}

export class CameraRig {
  yaw = 0
  pitch = rad(CAMERA.pitch)
  /** 0 normal, 1 aim. */
  aim = 0
  /** 0 free, 1 fully locked. */
  lock = 0
  /** Share of the wanted distance the camera currently sits at (eases back out after a block). */
  frac = 1
  /** First person wanted (P), and how far the view has blended there (0 behind her shoulder, 1 at her eyes). */
  firstPerson = false
  fp = 0
  private lastLock: LockView | null = null

  /** Mouse look; ignored while a lock-on holds the view. */
  look(dx: number, dy: number, sens: number) {
    if (this.lock > 0.5) return
    this.yaw = wrap(this.yaw - dx * sens)
    this.pitch = Math.min(rad(CAMERA.pitchMax), Math.max(rad(CAMERA.pitchMin), this.pitch - dy * sens))
  }

  params(): CamParams {
    const n = CAMERA.normal
    const a = CAMERA.aim
    const f = CAMERA.first
    const p = {
      dist: lerp(lerp(n.dist, a.dist, this.aim), -f.ahead, this.fp),
      shoulder: lerp(lerp(n.shoulder, a.shoulder, this.aim), 0, this.fp),
      height: lerp(n.height, a.height, this.aim),
      fov: lerp(lerp(n.fov, a.fov, this.aim), lerp(f.fov, f.aimFov, this.aim), this.fp),
    }
    const big = this.lastLock ? Math.min(1, Math.max(0, (this.lastLock.height - 2) / (LOCKON.bigHeight - 2))) * this.lock : 0
    // in first person the view stays at her eyes; only the lens widens for a big target
    p.dist += LOCKON.pullback * big * (1 - this.fp)
    p.fov += LOCKON.fovBoost * big
    return p
  }

  /**
   * Yaw and pitch that put the lock point on the upper-right third of the frame, measured from where
   * the camera stands (behind and right of her head), so near targets land on the third too.
   */
  lockAngles(from: Vec, target: LockView, fov: number): { yaw: number; pitch: number } {
    const tv = Math.tan(rad(fov) / 2)
    const th = tv * (16 / 9)
    const dx = target.point.x - from.x
    const dz = target.point.z - from.z
    const dy = target.point.y - from.y
    // in first person the target sits in the middle of the view, where the staff and the bolts go
    const third = 1 - this.fp
    const yaw = yawTo(0, 0, dx, dz) + Math.atan(LOCKON.thirdX * th * third)
    const pitch = Math.atan2(dy, Math.hypot(dx, dz)) - Math.atan(LOCKON.thirdY * tv * third)
    return { yaw, pitch: Math.min(rad(CAMERA.pitchMax), Math.max(rad(CAMERA.pitchMin), pitch)) }
  }

  update(dt: number, pivot: Vec, aiming: boolean, target: LockView | null, obstacles: Obstacles | null, height: HeightFn): CamPose {
    this.aim += ((aiming ? 1 : 0) - this.aim) * Math.min(1, CAMERA.blend * dt)
    this.fp += ((this.firstPerson ? 1 : 0) - this.fp) * Math.min(1, CAMERA.blend * dt)
    if (Math.abs(this.fp - (this.firstPerson ? 1 : 0)) < 0.002) this.fp = this.firstPerson ? 1 : 0
    this.lock += ((target ? 1 : 0) - this.lock) * Math.min(1, LOCKON.turn * dt)
    if (target) this.lastLock = target
    const p = this.params()
    if (target) {
      // the camera spot depends on the angles it is solving for; two passes settle it
      let a = { yaw: this.yaw, pitch: this.pitch }
      for (let i = 0; i < 2; i++) a = this.lockAngles(wanted(pivot, a.yaw, a.pitch, p), target, p.fov)
      const want = a
      const k = Math.min(1, LOCKON.turn * dt)
      this.yaw = wrap(this.yaw + wrap(want.yaw - this.yaw) * k)
      this.pitch += (want.pitch - this.pitch) * k
    }
    return this.place(dt, pivot, p, obstacles, height)
  }

  place(dt: number, pivot: Vec, p: CamParams, obstacles: Obstacles | null, height: HeightFn): CamPose {
    const want = wanted(pivot, this.yaw, this.pitch, p)
    const clear = clearFraction(pivot, want, obstacles, height)
    // Snap in at once so nothing is ever clipped; ease back out so the view does not jump.
    if (clear < this.frac) this.frac = clear
    else this.frac = Math.min(clear, this.frac + (clear - this.frac) * Math.min(1, CAMERA.release * dt) + 0.002)
    const t = this.frac
    return {
      pos: { x: pivot.x + (want.x - pivot.x) * t, y: pivot.y + (want.y - pivot.y) * t, z: pivot.z + (want.z - pivot.z) * t },
      dir: forward(this.yaw, this.pitch),
      fov: p.fov,
    }
  }
}
