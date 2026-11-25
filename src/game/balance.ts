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
} as const

export const RITE = {
  window: 20,
  range: 10,
  castTime: 1.5,
  castTimeUpgraded: 1,
  mana: 40,
  /** Holding R near several glowing bodies raises them all in one cast; each extra body costs this much more mana. */
  massRadius: 12,
  massManaPerExtra: 8,
  /** The Shadow Room has no slots; this only guards the save from running away. */
  maxShadows: 2000,
  /** A fallen shadow can be called again after this many seconds. */
  reform: 45,
  summonCooldown: 2.5,
  /** Each UMB point above 5 makes every shadow 2% tougher and stronger. */
  powerPerUmb: 0.02,
  /** How many shadows stand on the field at once. A setting: more costs frame rate. */
  /** Shadows nearest the camera drawn with their own animated model; the rest are drawn as one crowd. */
  // v2: 20 by default (v1: 40); its GLB creatures cost about ten times v1's procedural ones per animated shadow
  detail: { default: 20, min: 10, max: 120 },
  shadowXpShare: 0.3,
  minChance: 0.1,
  maxChance: 0.9,
  swapCooldown: 10,
  swapCooldownUpgraded: 6,
  focusBonus: 0.2,
  plainCorpseTime: 6,
} as const

export const XP = {
  base: 80,
  exponent: 1.5,
  perEnemyLevel: 10,
  perBossLevel: 15,
  statPointsPerLevel: 3,
  skillPointsPerLevel: 1,
  startStat: 5,
  maxLevel: 30,
  /**
   * The GDD's curve covers Lv 1 to 9. Above that each level costs this much more per level past 9,
   * so Tier IV and V take a few Rifts per level instead of one Rift for five.
   */
  lateSteep: 0.5,
} as const

export type RankId = 'prajurit' | 'ksatria' | 'jenderal' | 'marsekal'

export const RANKS: Record<RankId, { label: string; base: number }> = {
  prajurit: { label: 'Prajurit', base: 0.6 },
  ksatria: { label: 'Ksatria', base: 0.45 },
  jenderal: { label: 'Jenderal', base: 0.3 },
  marsekal: { label: 'Marsekal', base: 0.15 },
}

export type UnitKind =
  | 'husk' | 'hound' | 'spitter' | 'warden' | 'riftlord' | 'hollow' | 'harrier' | 'bombard'
  | 'imp' | 'hellhound' | 'harpy' | 'centaur' | 'naga' | 'minotaur' | 'medusa' | 'chimera'
  | 'cyclops' | 'succubus' | 'incubus' | 'phoenix' | 'hydra' | 'hydraHead'
  | 'griffin' | 'hippogriff' | 'pegasus' | 'unicorn' | 'cerberus' | 'lilith' | 'dragon' | 'typhon' | 'samael' | 'atlas'

/** v2 creatures of the forest; the v1 kinds above stay for the v1 formula tests and later phases. */
export const V2_KINDS = [
  'imp', 'hellhound', 'harpy', 'centaur', 'naga', 'minotaur', 'medusa', 'chimera', 'cyclops', 'succubus', 'incubus', 'phoenix', 'hydra',
  'griffin', 'hippogriff', 'pegasus', 'unicorn', 'cerberus', 'lilith', 'dragon', 'typhon', 'samael', 'atlas',
] as const
/** The bosses of the open world, each in a camp of its own with a boss bar (the Hydra has its lair). */
export const WORLD_BOSSES = ['cerberus', 'lilith', 'dragon', 'atlas', 'typhon', 'samael'] as const
/** Wild creatures that never fight: Unicorns guard the altars, Pegasi drift over the meadows. */
export const FAUNA = ['pegasus', 'unicorn'] as const
export type V2Kind = (typeof V2_KINDS)[number]

/**
 * One attack of a v2 creature. ring: a slow amber circle where it lands, blockable and parryable.
 * line: a fast flashing band along its path, only a roll avoids it. A creature with several attacks
 * picks one that fits the distance (and `behind` ones only when she is behind it).
 */
export interface AttackSpec {
  name: string
  strike: 'ring' | 'line'
  windup: number
  recover: number
  /** Starts when the target is within this reach (m), and not closer than minRange. */
  range: number
  minRange?: number
  /** Multiplier on the creature's damage. */
  damage?: number
  lungeSpeed?: number
  lungeTime?: number
  /** Radius of the circle a ring attack lands on (default 1.4 m). */
  ring?: number
  /** The circle lies this far in front of the creature (a breath) instead of on her. */
  ahead?: number
  /** Fires a projectile instead of lunging: an arrow along the line, or a glob onto the circle. */
  shot?: { speed: number; gravity: number; radius: number }
  /** What a landed blow does besides damage. petrify: she cannot move or act. poison: damage over time. */
  effect?: 'petrify' | 'poison'
  /** Used only when she is behind the creature (the Chimera's snake tail). */
  behind?: boolean
  /** Seconds before this attack can be used again. */
  cooldown?: number
}

/** What petrifying and poison do to her. */
export const EFFECTS = { petrify: 2.2, poisonTime: 4, poisonShare: 0.15 } as const

export interface UnitSpec {
  name: string
  rank: RankId
  hp: number
  damage: number
  speed: number
  radius: number
  height: number
  mass: number
  attackRange: number
  windup: number
  recover: number
  cooldown: number
  lungeSpeed?: number
  lungeTime?: number
  /** Fires globs instead of hitting in melee. `blast`: the glob bursts over this radius where it lands. */
  shot?: { speed: number; gravity: number; radius: number; keepAway: number; blast?: number }
  /** Flies: hovers this high over the ground and dives at its target instead of walking. */
  fly?: { height: number }
  /** Share of damage a raised shield stops when hit from the front. */
  shield?: number
  /** Ground slam: everything of the other side inside this radius is hit. */
  slam?: number
  /** Calls husks out of the Rift every few seconds. */
  summon?: { every: number; count: number; max: number }
  /** Too big to be lifted or flipped by Reality Warp. */
  anchored?: boolean
  /** v2: how its attack is announced. ring: slow amber pulse, can be blocked or parried. line: fast amber flash, must be dodged. */
  strike?: 'ring' | 'line'
  /** v2: stun meter size; heavy blows, parries, bolts and the thrown staff fill it. */
  stun?: number
  /** v2: circles to her side before it attacks. */
  flank?: boolean
  /** v2: its attacks; without them it has one attack made from the fields above. */
  attacks?: AttackSpec[]
  /** v2: keeps this far from her while it shoots, backing off when she comes closer. */
  keepAway?: number
  /** v2: dives out of reach for this many seconds when hurt, and comes up a few metres away. */
  dive?: number
  /** v2: the helpers its summons call. */
  summonKind?: UnitKind
  /** v2: a mini-boss, with the big health bar at the top of the screen. */
  boss?: boolean
  /** v2: blinks this far away (m) when she closes in, at most once per `every` seconds (Succubus, Incubus). */
  blink?: { range: number; every: number }
  /** v2: the first fall turns it to ashes for a moment; it rises once more, and bursts when it falls again (Phoenix). */
  rebirth?: { ashes: number; hp: number; burst: number; delay: number }
  /** v2: its rank for the Umbra Rite when it comes out elite (an elite Cyclops is a Jenderal). */
  eliteRank?: RankId
  /** v2: drawn by the Hydra's rig (a head); has no model of its own. */
  part?: boolean
  /** v2 fauna: never attacks, cannot be struck or raised, keeps away from her. */
  passive?: boolean
}

export const UNITS: Record<UnitKind, UnitSpec> = {
  husk: {
    name: 'Husk',
    rank: 'prajurit',
    hp: 40,
    damage: 10,
    speed: 3.1,
    radius: 0.45,
    height: 1.8,
    mass: 70,
    attackRange: 1.7,
    windup: 0.55,
    recover: 0.8,
    cooldown: 1.3,
  },
  hound: {
    name: 'Rift Hound',
    rank: 'prajurit',
    hp: 26,
    damage: 12,
    speed: 6.4,
    radius: 0.5,
    height: 1.1,
    mass: 45,
    attackRange: 7.5,
    windup: 0.45,
    recover: 0.9,
    cooldown: 1.8,
    lungeSpeed: 15,
    lungeTime: 0.45,
  },
  spitter: {
    name: 'Spitter',
    rank: 'prajurit',
    hp: 30,
    damage: 11,
    speed: 2.6,
    radius: 0.45,
    height: 1.5,
    mass: 55,
    attackRange: 26,
    windup: 0.6,
    recover: 0.5,
    cooldown: 2.4,
    shot: { speed: 17, gravity: 9, radius: 0.3, keepAway: 11 },
  },
  warden: {
    name: 'Warden',
    rank: 'ksatria',
    hp: 110,
    damage: 18,
    speed: 2.3,
    radius: 0.62,
    height: 2.25,
    mass: 260,
    attackRange: 2.3,
    windup: 0.8,
    recover: 1,
    cooldown: 2,
    shield: 0.85,
  },
  riftlord: {
    name: 'Rift Lord',
    rank: 'jenderal',
    hp: 260,
    damage: 22,
    speed: 2.5,
    radius: 0.95,
    height: 3.2,
    mass: 900,
    attackRange: 4.2,
    windup: 1.1,
    recover: 1.1,
    cooldown: 3.2,
    slam: 5,
    summon: { every: 14, count: 3, max: 6 },
    anchored: true,
  },
  hollow: {
    name: 'The Hollow Warden',
    rank: 'marsekal',
