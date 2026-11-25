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
    distance: 4.2,
    time: 0.42,
    /** She cannot be hit between these two moments of the roll (seconds from its start). */
    iframeStart: 0.04,
    iframeEnd: 0.32,
    cooldown: 0.25,
  },
  dodgePerAgi: 0.05,
  interactRange: 3,
} as const

/**
 * Over-the-right-shoulder camera, numbers settled in the phase 0 previz (previz/PREVIZ.md).
 * fov is vertical, as PerspectiveCamera.fov counts it. height is the pivot above her feet.
 */
export const CAMERA = {
  normal: { dist: 3.4, shoulder: 0.8, height: 1.6, fov: 50 },
  aim: { dist: 2.0, shoulder: 0.65, height: 1.6, fov: 40 },
  /** First person (P): the eye a little in front of her head, and a wider view like v1 (vertical degrees). */
  first: { ahead: 0.16, fov: 68, aimFov: 54 },
  pitch: -6,
  pitchMin: -55,
  pitchMax: 62,
  /** Rate the camera blends between normal and aim (1/s). */
  blend: 9,
  /** Radius of the sphere swept from the pivot to the camera; nothing may come closer. */
  radius: 0.24,
  /** Rate the camera eases back out after an obstacle stops blocking it (1/s). */
  release: 4,
  near: 0.1,
  far: 1200,
  sensitivity: 0.0022,
} as const

export const LOCKON = {
  range: 30,
  /** A locked target further than this, or hidden this long, lets go. */
  keepRange: 40,
  lostTime: 1.5,
  /** Half-angle in front of the camera a new target is picked from (radians). */
  cone: 0.95,
  /** Mouse travel (px) in one frame that switches to the next target on that side. */
  flick: 38,
  /** Target point sits at 2/3 of the width and 1/3 of the height from the top. */
  thirdX: 1 / 3,
  thirdY: 1 / 3,
  /** Targets taller than this pull the camera back and widen the view a little. */
  bigHeight: 6,
  pullback: 1.6,
  fovBoost: 6,
  turn: 7,
} as const

export const PLAYER = {
  baseHp: 100,
  hpPerVit: 10,
  baseMana: 100,
  manaPerSpr: 5,
  manaRegen: 7,
  manaRegenPerSpr: 0.04,
  damagePerHex: 0.02,
  /** The Ledger steadies her Chaos as she grows: +5% damage and +8 HP per level. */
  damagePerLevel: 0.05,
  hpPerLevel: 8,
  speedPerAgi: 0.01,
  hurtInvuln: 0.25,
} as const

export const CHAOS = {
  max: 100,
  perDamageDealt: 0.05,
  perDamageTaken: 0.45,
  overloadTime: 12,
  overloadDamage: 1.5,
  backlashTime: 3,
  backlashHpLoss: 0.1,
} as const

export const SPELL = {
  // v2: a bolt also fills the stun meter and knocks a hovering Harpy down for `down` seconds
  bolt: { damage: 12, mana: 0, cooldown: 0.4, speed: 48, life: 1.6, radius: 0.28, spreadDamage: 6, spreadAngle: 0.07, stun: 6, down: 2.5 },
  grip: { manaPerSec: 4, maxMass: 500, range: 26, holdDistance: 6.5, throwSpeed: 30, heavyThrowSpeed: 18, aimCone: 0.07, flight: 0.9, flightGravity: 0.12 },
  impact: { coefficient: 0.14, exponent: 0.6, minSpeed: 6 },
  burst: { damage: 40, mana: 30, cooldown: 8, radius: 8, radiusUpgrade: 2, range: 24, push: 14, lift: 6 },
  snare: { mana: 25, cooldown: 12, radius: 6, duration: 6, durationUpgrade: 2, slow: 0.4, vulnerability: 0.25, range: 24 },
  barrier: { mana: 20, cooldown: 15, duration: 3, absorb: 150, absorbUpgrade: 50, blastRadius: 6, blastDamage: 25, push: 12 },
  warp: { mana: 60, cooldown: 30, radius: 10, duration: 5, durationUpgrade: 2, range: 26, liftHeight: 3.6, reflectDamage: 1.6 },
