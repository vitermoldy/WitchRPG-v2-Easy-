// Every tuning number lives here. Values come from the GDD tables and are starting points for
// playtesting, not final numbers.

/** Third-person movement on foot. No free jump or flight in v2: Space dodges. */
/**
 * WitchRPG v2 (Easy): what this version changes from WitchRPG v2. Every Umbra Rite succeeds; the v1
 * formula (riteChance in progression.ts) stays, locked by its tests, and is simply never below this.
 */
export const EASY = { riteChance: 1 } as const

export const MOVE = {
  /** Default pace with WASD, and with Shift held. */
  jog: 4.4,
  sprint: 7.0,
  /** Speed changes are deliberately slow to start and quick to stop: weight without sliding. */
  accel: 16,
  decel: 22,
  /** How fast she turns toward the way she moves (radians per second). */
  turn: 11,
  radius: 0.38,
  height: 1.7,
  gravity: 22,
  /** Steepest slope she can walk up, as rise over run; the cliffs of Tebing Berangin are steeper. */
  maxSlope: 1.0,
  /** Deepest water she wades into; Danau Hitam and the swamp pools are deeper. */
  maxWade: 0.9,
  /** Flight (B, from v1): pace, with Shift, climb with Space or C, how fast she reaches them (m/s, m/s2), and how high above the ground she may rise (m). */
  fly: { speed: 13, boost: 26, climb: 8, accel: 30, ceiling: 40 },
  dodge: {
