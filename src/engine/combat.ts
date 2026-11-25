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
