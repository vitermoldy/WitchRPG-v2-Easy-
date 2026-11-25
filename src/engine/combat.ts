import { COMBAT, type Swing } from '../game/balance'

export type Defense = 'parry' | 'block' | 'dodge' | 'hit'

/**
 * How a creature's blow on Ilyra resolves at the moment it lands.
 * - During the roll's untouchable window every blow misses.
 * - A line (fast flashing) attack cannot be blocked: it hits unless she rolled.
 * - A ring (slow pulse) attack from in front is parried when block was pressed within the parry window
 *   before the blow, blocked when block is held, and hits otherwise. From behind it always hits.
 * angle: direction to the attacker relative to where she faces (radians, 0 = straight ahead).
 */
export function resolveDefense(now: number, strike: 'ring' | 'line', invulnerable: boolean, blocking: boolean, blockPressedAt: number, angle: number): Defense {
  if (invulnerable) return 'dodge'
  if (strike === 'line') return 'hit'
  if (Math.abs(angle) > COMBAT.block.arc / 2) return 'hit'
  const since = now - blockPressedAt
  if (since >= 0 && since <= COMBAT.parry.window) return 'parry'
  if (blocking) return 'block'
  return 'hit'
}

/** Stun meter of one creature. Fills from heavy blows, parries, bolts and the staff; drains when left alone. */
export class StunMeter {
  value = 0
  /** Seconds left staggered (and open to an execution). */
  staggered = 0
  private since = 0
  constructor(readonly max: number) {}

  /** Adds stun; returns true when this fills the meter and starts a stagger. */
  add(amount: number): boolean {
    if (this.staggered > 0 || amount <= 0) return false
    this.value += amount
    this.since = 0
    if (this.value >= this.max) {
      this.value = this.max
      this.staggered = COMBAT.stagger
      return true
    }
    return false
  }

  update(dt: number) {
    if (this.staggered > 0) {
      this.staggered = Math.max(0, this.staggered - dt)
      if (this.staggered === 0) this.value = 0
      return
    }
    this.since += dt
    if (this.since > COMBAT.stunDrainDelay) this.value = Math.max(0, this.value - COMBAT.stunDrain * dt)
  }

  get share() {
    return this.max > 0 ? this.value / this.max : 0
  }
}

export interface SwingState {
  swing: Swing
  heavy: boolean
  /** 0, 1, 2 for the light chain. */
  index: number
  t: number
  hit: boolean
}

export type ComboEvent = { type: 'start'; s: SwingState } | { type: 'hit'; s: SwingState } | { type: 'end'; s: SwingState }

