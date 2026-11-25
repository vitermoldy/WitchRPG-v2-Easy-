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
 * window in which nothing can hit her. Her yaw uses the camera convention (0 faces north, -z).
 */
export class Player {
  readonly pos = { x: 0, y: 0, z: 0 }
  vx = 0
  vz = 0
  vy = 0
  facing = 0
  /** Seconds into the current roll, or -1. */
  dodgeT = -1
  dodgeX = 0
  dodgeZ = 0
  dodgeCd = 0
  dodgeDistance: number = MOVE.dodge.distance
  speedMult = 1
  /** Walk cycle phase for the procedural animation (radians). */
  stride = 0
  /** Every roll started, for the debug readout and the bot. */
  dodges = 0
  hp = 100
  maxHp = 100
  mana = 100
  maxMana = 100
  alive = true
  /** Seconds turned to stone (Medusa's gaze): no moving, no acting. */
  petrified = 0
  /** Poison: seconds left and damage per second. */
  poisonT = 0
  poisonDps = 0
  /** Share of her pace she keeps this frame (block, swings); set by the fight each frame. */
  moveScale = 1
  /** In the air (B, as in v1). */
  flying = false
  /** B over deep water this frame: there is nowhere to land. */
  landRefused = false
  /** A short scripted push (a swing's step, a parry's recoil) that overrides steering while it lasts. */
  private nudgeX = 0
  private nudgeZ = 0
  private nudgeT = 0
  private nudgeTime = 1

  /** Moves her `dist` metres along (dx, dz) over `time` seconds, easing out. */
  nudge(dx: number, dz: number, dist: number, time: number) {
    const l = Math.hypot(dx, dz) || 1
    // 2 (1 - u) integrates to 1 over the push, like the roll's hard start
    this.nudgeX = ((dx / l) * dist * 2) / time
    this.nudgeZ = ((dz / l) * dist * 2) / time
    this.nudgeT = time
    this.nudgeTime = time
  }

  get speed() {
    return Math.hypot(this.vx, this.vz)
  }

  get dodging() {
    return this.dodgeT >= 0
  }

  get invulnerable() {
    return this.dodgeT >= MOVE.dodge.iframeStart && this.dodgeT <= MOVE.dodge.iframeEnd
  }

  place(x: number, z: number, g: Ground, facing = 0) {
    this.pos.x = x
    this.pos.z = z
    this.pos.y = g.height(x, z)
    this.vx = this.vz = this.vy = 0
    this.facing = facing
    this.dodgeT = -1
    this.nudgeT = 0
    this.flying = false
  }

  /**
   * face: a yaw to keep facing (lock-on target, aim direction), or null to turn toward the movement.
   * Aiming slows her to a careful walk and rules out sprinting.
   */
  update(dt: number, input: MoveInput, camYaw: number, face: number | null, aiming: boolean, g: Ground) {
    const f = forward(camYaw, 0)
    const r = rightOf(camYaw)
    let wx = f.x * input.y + r.x * input.x
    let wz = f.z * input.y + r.z * input.x
    const wl = Math.hypot(wx, wz)
    if (wl > 1) {
      wx /= wl
      wz /= wl
    }

