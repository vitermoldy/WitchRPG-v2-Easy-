// Every tuning number lives here. Values come from the GDD tables and are starting points for
// playtesting, not final numbers.

/** Third-person movement on foot. No free jump or flight in v2: Space dodges. */
/**
 * WitchRPG v2 (Easy): what this version changes from WitchRPG v2. Every Umbra Rite succeeds; the v1
 * formula (riteChance in progression.ts) stays, locked by its tests, and is simply never below this.
 */
export const EASY = { riteChance: 1 } as const

