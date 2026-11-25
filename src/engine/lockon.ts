import { LOCKON } from '../game/balance'
import { yawTo, type Vec } from './camera'

export interface Target {
  /** Feet position (world). */
  x: number
  y: number
  z: number
  height: number
  alive: boolean
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/** The point on a target the camera frames: about chest height. */
export const lockPoint = (t: Target): Vec => ({ x: t.x, y: t.y + t.height * 0.62, z: t.z })

/**
 * Middle-click locks on to the creature nearest the middle of the view; a quick sideways flick of the
 * mouse moves the lock to the next creature on that side. The lock lets go when the target dies, walks
 * out of range, or stays hidden behind trees for too long.
 */
export class LockOn {
  current: Target | null = null
  private lost = 0

  /** Angle of a target from the camera's view direction (radians, positive = to the left). */
  private angleOf(t: Target, from: Vec, camYaw: number) {
    return wrap(yawTo(from.x, from.z, t.x, t.z) - camYaw)
  }

  pick(targets: Target[], player: Vec, camYaw: number): Target | null {
    let best: Target | null = null
    let score = Infinity
    for (const t of targets) {
      if (!t.alive) continue
      const d = Math.hypot(t.x - player.x, t.z - player.z)
      if (d > LOCKON.range) continue
      const a = Math.abs(this.angleOf(t, player, camYaw))
      if (a > LOCKON.cone) continue
      const s = a + (d / LOCKON.range) * 0.5
      if (s < score) {
        score = s
        best = t
      }
    }
    return best
  }

  toggle(targets: Target[], player: Vec, camYaw: number) {
    if (this.current) {
      this.current = null
      return
    }
    this.current = this.pick(targets, player, camYaw)
    this.lost = 0
  }

  /** Moves the lock to the nearest target on the given side (1 = right, -1 = left) of the current one. */
  switchSide(targets: Target[], player: Vec, side: number): boolean {
