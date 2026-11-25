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

    this.dodgeCd = Math.max(0, this.dodgeCd - dt)
    this.landRefused = false
    if (input.fly) this.toggleFlight(g)
    if (this.flying) {
      this.fly(dt, input, wx, wz, wl, face, g)
      return
    }
    if (input.dodge && this.dodgeT < 0 && this.dodgeCd <= 0) {
      this.nudgeT = 0
      // roll the way she is steering; with no direction held, step back from where she faces
      let dx = wx
      let dz = wz
      if (Math.hypot(dx, dz) < 0.2) {
        dx = Math.sin(this.facing)
        dz = Math.cos(this.facing)
      }
      const l = Math.hypot(dx, dz)
      this.dodgeX = dx / l
      this.dodgeZ = dz / l
      this.dodgeT = 0
      this.dodges++
    }

    if (this.dodgeT >= 0) {
      const T = MOVE.dodge.time
      const u = Math.min(1, this.dodgeT / T)
      // 1.5 (1 - u^2) integrates to 1 over the roll: a hard push off, then it settles
      const v = ((1.5 * this.dodgeDistance) / T) * (1 - u * u)
      this.vx = this.dodgeX * v
      this.vz = this.dodgeZ * v
      this.dodgeT += dt
      if (this.dodgeT >= T) {
        this.dodgeT = -1
        this.dodgeCd = MOVE.dodge.cooldown
        this.vx *= 0.3
        this.vz *= 0.3
      }
    } else if (this.nudgeT > 0) {
      const u = 1 - this.nudgeT / this.nudgeTime
      this.vx = this.nudgeX * (1 - u)
      this.vz = this.nudgeZ * (1 - u)
      this.nudgeT -= dt
    } else {
      const sprint = input.sprint && !aiming && this.moveScale >= 1
      const top = (sprint ? MOVE.sprint : aiming ? MOVE.jog * 0.6 : MOVE.jog) * this.speedMult * this.moveScale
      const tx = wx * top
      const tz = wz * top
      // exponential approach: at a jog she reaches speed in about 0.14 s and stops in about 0.1 s
      const rate = wl > 0.05 ? MOVE.accel : MOVE.decel
      const k = 1 - Math.exp(-(rate / Math.max(top, 1)) * 2 * dt)
      this.vx += (tx - this.vx) * k
      this.vz += (tz - this.vz) * k
    }

    this.moveAxis(this.vx * dt, 0, g)
    this.moveAxis(0, this.vz * dt, g)
    g.obstacles?.pushOut(this.pos, MOVE.radius, MOVE.height)

    // stay on the ground; step off a ledge and fall
    const ground = g.height(this.pos.x, this.pos.z)
    if (this.pos.y > ground + 0.6 || this.vy > 0) {
      this.vy -= MOVE.gravity * dt
      this.pos.y += this.vy * dt
      if (this.pos.y <= ground) {
        this.pos.y = ground
        this.vy = 0
      }
    } else {
      this.pos.y = ground
      this.vy = 0
    }

    this.turn(face, dt)
    this.stride += this.speed * dt * 2.4
  }

  /** Toward a held yaw, else toward the way she is going. */
  private turn(face: number | null, dt: number) {
    let want: number | null = face
    if (want === null && this.speed > 0.3) want = Math.atan2(-this.vx, -this.vz)
    if (want !== null && !this.dodging) {
      const d = wrap(want - this.facing)
      const step = MOVE.turn * dt
      this.facing = wrap(this.facing + Math.max(-step, Math.min(step, d)))
    }
  }

  private toggleFlight(g: Ground) {
    if (!this.flying) {
      this.flying = true
      this.dodgeT = -1
      this.nudgeT = 0
      this.vy = Math.max(this.vy, 3)
      return
    }
    // she lands only where she can stand, never into deep water
    if (g.blocked(this.pos.x, this.pos.z)) {
      this.landRefused = true
      return
    }
    this.flying = false
  }

  /**
   * v1's flight: she eases toward the wanted velocity in all three axes, never higher than the ceiling
   * over the ground below, never lower than the ground or the water. Sinking onto ground she can stand
   * on lands her.
   */
  private fly(dt: number, input: MoveInput, wx: number, wz: number, wl: number, face: number | null, g: Ground) {
    const F = MOVE.fly
    const boost = input.sprint && wl > 0.05
    const speed = (boost ? F.boost : F.speed) * this.speedMult
    const rise = input.rise ?? 0
    const gx = wx * speed - this.vx
    const gy = rise * F.climb * (boost ? 1.5 : 1) - this.vy
    const gz = wz * speed - this.vz
    const len = Math.hypot(gx, gy, gz)
    const k = len > F.accel * dt ? (F.accel * dt) / len : 1
    this.vx += gx * k
    this.vy += gy * k
    this.vz += gz * k
    this.moveAxis(this.vx * dt, 0, g, true)
    this.moveAxis(0, this.vz * dt, g, true)
    g.obstacles?.pushOut(this.pos, MOVE.radius, MOVE.height)
    const floor = (g.floor ?? g.height)(this.pos.x, this.pos.z)
    this.pos.y += this.vy * dt
    if (this.pos.y > floor + F.ceiling) {
      this.pos.y = floor + F.ceiling
      this.vy = Math.min(0, this.vy)
    }
    if (this.pos.y <= floor) {
      this.pos.y = floor
      this.vy = Math.max(0, this.vy)
      if (rise < 0 && !g.blocked(this.pos.x, this.pos.z)) this.flying = false
    }
    this.turn(face, dt)
  }

  /** Moves along one axis unless that would climb a cliff or wade into deep water (in the air: only walls). */
  private moveAxis(dx: number, dz: number, g: Ground, air = false) {
    if (dx === 0 && dz === 0) return
    const nx = this.pos.x + dx
    const nz = this.pos.z + dz
    if (g.blocked(nx, nz, this.pos.x, this.pos.z, air)) return
    if (air) {
      this.pos.x = nx
      this.pos.z = nz
      return
    }
    const h0 = g.height(this.pos.x, this.pos.z)
    const h1 = g.height(nx, nz)
    const run = Math.hypot(dx, dz)
    if (h1 - h0 > MOVE.maxSlope * run && this.pos.y <= h0 + 0.05) return
    this.pos.x = nx
    this.pos.z = nz
  }
}
