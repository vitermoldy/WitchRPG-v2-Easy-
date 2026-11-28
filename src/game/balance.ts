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
  | 'satyr' | 'blemmye' | 'panotti' | 'silvana' | 'leonis' | 'cornutus' | 'sirena' | 'cacodaemon' | 'raia' | 'marinus'
  | 'cracovia' | 'tetrachiron' | 'triceps' | 'buer' | 'septiceps' | 'asmodeus'
  | 'silenus' | 'hippocentaurus' | 'aquilon' | 'duyung' | 'aries' | 'manticore' | 'blackdragon'
  | 'aziza' | 'kitsune' | 'sylph' | 'banshee'

/** v2 creatures of the forest; the v1 kinds above stay for the v1 formula tests and later phases. */
export const V2_KINDS = [
  'imp', 'hellhound', 'harpy', 'centaur', 'naga', 'minotaur', 'medusa', 'chimera', 'cyclops', 'succubus', 'incubus', 'phoenix', 'hydra',
  'griffin', 'hippogriff', 'pegasus', 'unicorn', 'cerberus', 'lilith', 'dragon', 'typhon', 'samael', 'atlas',
  // Easy, Tanah Ganjil (owner, 28 Nov 2026: assets/Monster pt2)
  'satyr', 'blemmye', 'panotti', 'silvana', 'leonis', 'cornutus', 'sirena', 'cacodaemon', 'raia', 'marinus',
  'cracovia', 'tetrachiron', 'triceps', 'buer', 'septiceps', 'asmodeus',
  // Easy, the third batch (owner, 28 Nov 2026: the prompt sheet)
  'silenus', 'hippocentaurus', 'aquilon', 'duyung', 'aries', 'manticore', 'blackdragon',
  // Easy, the south of Hutan Pembuka
  'aziza', 'kitsune', 'sylph', 'banshee',
] as const
/** The bosses of the open world, each in a camp of its own with a boss bar (the Hydra has its lair). */
export const WORLD_BOSSES = ['cerberus', 'lilith', 'dragon', 'atlas', 'typhon', 'samael', 'septiceps', 'asmodeus', 'blackdragon'] as const
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
    hp: 2400,
    damage: 22,
    speed: 2.8,
    radius: 1.35,
    height: 4.6,
    mass: 3000,
    attackRange: 4.8,
    // A long windup and a circle that fits on a pillar: the slam is there to be stepped out of.
    windup: 1.3,
    recover: 1,
    cooldown: 2.6,
    slam: 5,
    summon: { every: 15, count: 6, max: 10 },
    anchored: true,
  },
  // Tier IV: hovers out of reach and dives. Telekinesis pulls it down, Chaos Burst knocks it out of the air.
  harrier: {
    name: 'Harrier',
    rank: 'prajurit',
    hp: 32,
    damage: 16,
    speed: 7,
    radius: 0.55,
    height: 1,
    mass: 30,
    attackRange: 15,
    windup: 0.7,
    recover: 1.4,
    cooldown: 2.6,
    lungeSpeed: 19,
    lungeTime: 0.9,
    fly: { height: 7 },
  },
  // Tier V: lobs a heavy charge onto a warning circle. Hex Barrier eats it, Reality Warp sends it back.
  bombard: {
    name: 'Bombard',
    rank: 'ksatria',
    hp: 140,
    damage: 20,
    speed: 1.7,
    radius: 0.75,
    height: 2.3,
    mass: 420,
    attackRange: 34,
    windup: 1.3,
    recover: 1,
    cooldown: 5.5,
    // A slow, high arc (about 12 m at 26 m range) clears street cover and gives time to step out of the circle.
    shot: { speed: 10, gravity: 14, radius: 0.55, keepAway: 16, blast: 3.5 },
  },
  // v2, Hutan Pembuka: crowds in. Leaps and claws after a 0.5 s crouch under a slow amber ring: block or parry it.
  imp: {
    name: 'Imp',
    rank: 'prajurit',
    hp: 34,
    damage: 9,
    speed: 3.6,
    radius: 0.42,
    height: 1.3,
    mass: 30,
    attackRange: 2.2,
    windup: 0.5,
    recover: 0.8,
    cooldown: 1.6,
    lungeSpeed: 7,
    lungeTime: 0.3,
    strike: 'ring',
    stun: 30,
  },
  // v2, Hutan Pembuka: packs of three to five. Circles to her side and lunges along a flashing line: dodge it.
  hellhound: {
    name: 'Hellhound',
    rank: 'prajurit',
    hp: 30,
    damage: 12,
    speed: 6.2,
    radius: 0.55,
    height: 1.6,
    mass: 45,
    attackRange: 7.5,
    windup: 0.55,
    recover: 0.9,
    cooldown: 2.2,
    lungeSpeed: 15,
    lungeTime: 0.45,
    strike: 'line',
    stun: 30,
    flank: true,
  },
  // v2, Tebing Berangin: hovers, screams for 0.7 s, then dives along a flashing line. A Hex Bolt or Telekinesis brings it down.
  harpy: {
    name: 'Harpy',
    rank: 'prajurit',
    hp: 30,
    damage: 14,
    speed: 6.5,
    radius: 0.55,
    height: 1.7,
    mass: 35,
    attackRange: 15,
    windup: 0.7,
    recover: 1.3,
    cooldown: 2.8,
    lungeSpeed: 18,
    lungeTime: 0.8,
    fly: { height: 6 },
    strike: 'line',
    stun: 25,
  },
  // v2, Tebing Berangin: shoots from range and backs away. The arrow flies along a flashing line: roll aside.
  centaur: {
    name: 'Centaur',
    rank: 'prajurit',
    hp: 44,
    damage: 13,
    speed: 5.2,
    radius: 0.8,
    height: 2.8,
    mass: 320,
    attackRange: 26,
    windup: 0.75,
    recover: 0.6,
    cooldown: 2.6,
    stun: 40,
    keepAway: 13,
    attacks: [
      { name: 'panah', strike: 'line', windup: 0.75, recover: 0.6, range: 26, minRange: 3, shot: { speed: 34, gravity: 3, radius: 0.14 } },
      { name: 'tendang', strike: 'ring', windup: 0.6, recover: 0.8, range: 3, lungeSpeed: 6, lungeTime: 0.3, ring: 1.8 },
    ],
  },
  // v2, Rawa Berkabut: spits a glob onto an amber circle from the swamp and dives when it is hurt.
  naga: {
    name: 'Naga Rawa',
    rank: 'prajurit',
    hp: 48,
    damage: 14,
    speed: 3.4,
    radius: 0.6,
    height: 3.1,
    mass: 220,
    attackRange: 20,
    windup: 0.9,
    recover: 0.7,
    cooldown: 2.8,
    stun: 40,
    keepAway: 8,
    dive: 3,
    attacks: [
      { name: 'semburan', strike: 'ring', windup: 0.9, recover: 0.7, range: 20, minRange: 4, ring: 2, shot: { speed: 13, gravity: 12, radius: 0.35 } },
      { name: 'gigit', strike: 'ring', windup: 0.55, recover: 0.7, range: 3.2, lungeSpeed: 8, lungeTime: 0.3 },
    ],
  },
  // v2, Rawa Berkabut: axe under a circle, or a charge along a line. Its front takes 85% less from blows and bolts.
  minotaur: {
    name: 'Minotaur',
    rank: 'ksatria',
    hp: 150,
    damage: 20,
    speed: 3.2,
    radius: 0.75,
    height: 3.1,
    mass: 420,
    attackRange: 3.2,
    windup: 0.9,
    recover: 1,
    cooldown: 2.2,
    shield: 0.85,
    stun: 85,
    attacks: [
      { name: 'kapak', strike: 'ring', windup: 0.9, recover: 1, range: 3.2, ring: 1.8, lungeSpeed: 5, lungeTime: 0.35 },
      { name: 'seruduk', strike: 'line', windup: 0.8, recover: 1.2, range: 14, minRange: 6, damage: 1.3, lungeSpeed: 14, lungeTime: 0.75, cooldown: 5 },
    ],
  },
  // v2 mini-boss, Rawa Berkabut: snake bite, and a gaze that turns her to stone unless she blocks it.
  medusa: {
    name: 'Medusa',
    rank: 'jenderal',
    hp: 620,
    damage: 18,
    speed: 2.8,
    radius: 0.8,
    height: 2.5,
    mass: 900,
    attackRange: 20,
    windup: 0.6,
    recover: 0.8,
    cooldown: 1.8,
    stun: 140,
    boss: true,
    attacks: [
      { name: 'tatapan', strike: 'ring', windup: 1.3, recover: 1.2, range: 20, minRange: 4, ring: 2.2, damage: 0.6, effect: 'petrify', cooldown: 7 },
      { name: 'gigitan ular', strike: 'ring', windup: 0.6, recover: 0.8, range: 3.4, ring: 1.8, lungeSpeed: 6, lungeTime: 0.3 },
    ],
  },
  // v2 mini-boss, Rawa Berkabut: lion's fire in front, goat's charge from afar, snake's sting behind. Calls Imps.
  chimera: {
    name: 'Chimera',
    rank: 'jenderal',
    hp: 720,
    damage: 22,
    speed: 4.2,
    radius: 1.3,
    height: 2.4,
    mass: 1300,
    attackRange: 7,
    windup: 1,
    recover: 1,
    cooldown: 1.6,
    stun: 160,
    anchored: true,
    boss: true,
    summon: { every: 16, count: 2, max: 4 },
    summonKind: 'imp',
    attacks: [
      { name: 'sengat ular', strike: 'ring', windup: 0.7, recover: 0.8, range: 6, ring: 1.8, behind: true, damage: 0.7, effect: 'poison' },
      { name: 'seruduk kambing', strike: 'line', windup: 0.8, recover: 1.3, range: 16, minRange: 7, damage: 1.2, lungeSpeed: 15, lungeTime: 0.8, cooldown: 6 },
      { name: 'napas api', strike: 'ring', windup: 1, recover: 1, range: 7, ring: 3, ahead: 4 },
    ],
  },
  // v2, Reruntuhan Kuil and Lembah Bara: a giant that throws boulders onto amber circles and clubs up close.
  // Too heavy to lift or throw. An elite Cyclops raises as a Jenderal.
  cyclops: {
    name: 'Cyclops',
    rank: 'ksatria',
    eliteRank: 'jenderal',
    hp: 220,
    damage: 24,
    speed: 2.6,
    radius: 1.1,
    height: 4.1,
    mass: 1200,
    attackRange: 28,
    windup: 1.2,
    recover: 1,
    cooldown: 2.4,
    stun: 120,
    anchored: true,
    attacks: [
      { name: 'lempar batu', strike: 'ring', windup: 1.2, recover: 1, range: 28, minRange: 7, ring: 3, shot: { speed: 12, gravity: 14, radius: 0.6 }, cooldown: 4 },
      { name: 'gada', strike: 'ring', windup: 1, recover: 1, range: 4, ring: 2.2, lungeSpeed: 4, lungeTime: 0.35, damage: 1.2 },
    ],
  },
  // v2, Kuil and Bara: calls Imps, claws, throws green fire along a line, and blinks away when she closes in.
  succubus: {
    name: 'Succubus',
    rank: 'ksatria',
    hp: 120,
    damage: 16,
    speed: 4.6,
    radius: 0.5,
    height: 2.6,
    mass: 60,
    attackRange: 22,
    windup: 0.7,
    recover: 0.7,
    cooldown: 2.2,
    stun: 60,
    keepAway: 9,
    blink: { range: 12, every: 6 },
    summon: { every: 14, count: 2, max: 4 },
    summonKind: 'imp',
    attacks: [
      { name: 'api hijau', strike: 'line', windup: 0.7, recover: 0.7, range: 22, minRange: 4, shot: { speed: 24, gravity: 0, radius: 0.22 } },
      { name: 'cakar', strike: 'ring', windup: 0.6, recover: 0.7, range: 2.8, lungeSpeed: 7, lungeTime: 0.3 },
    ],
  },
  // v2, Kuil and Bara: the heavier of the pair; lobs green fire onto circles and calls Imps.
  incubus: {
    name: 'Incubus',
    rank: 'ksatria',
    hp: 150,
    damage: 18,
    speed: 4.2,
    radius: 0.6,
    height: 3,
    mass: 80,
    attackRange: 20,
    windup: 0.9,
    recover: 0.8,
    cooldown: 2.4,
    stun: 70,
    keepAway: 8,
    blink: { range: 10, every: 7 },
    summon: { every: 16, count: 2, max: 4 },
    summonKind: 'imp',
    attacks: [
      { name: 'bola api', strike: 'ring', windup: 0.9, recover: 0.8, range: 20, minRange: 4, ring: 2.2, shot: { speed: 14, gravity: 12, radius: 0.4 } },
      { name: 'cakar', strike: 'ring', windup: 0.6, recover: 0.8, range: 3, lungeSpeed: 7, lungeTime: 0.3, damage: 1.1 },
    ],
  },
  // v2, Lembah Bara: dives in fire along a line. Falls once into ashes, rises again, and bursts on its second fall.
  phoenix: {
    name: 'Phoenix',
    rank: 'jenderal',
    hp: 160,
    damage: 18,
    speed: 7,
    radius: 0.9,
    height: 3,
    mass: 90,
    attackRange: 16,
    windup: 0.8,
    recover: 1.2,
    cooldown: 2.8,
    stun: 50,
    fly: { height: 7 },
    strike: 'line',
    lungeSpeed: 19,
    lungeTime: 0.85,
    rebirth: { ashes: 3, hp: 0.5, burst: 4.5, delay: 1.6 },
  },
  // v2, Tebing Berangin (PROMPT: Griffin liar): eagle head and wings on a lion's body; circles high, dives along a line.
  griffin: {
    name: 'Griffin',
    rank: 'ksatria',
    hp: 70,
    damage: 17,
    speed: 7,
    radius: 1.1,
    height: 1.9,
    mass: 220,
    attackRange: 17,
    windup: 0.8,
    recover: 1.4,
    cooldown: 3,
    lungeSpeed: 20,
    lungeTime: 0.85,
    fly: { height: 7 },
    strike: 'line',
    stun: 45,
  },
  // v2, Tebing Berangin: the Griffin's quicker cousin with a horse's hindquarters; lower and faster dives.
  hippogriff: {
    name: 'Hippogriff',
    rank: 'ksatria',
    hp: 58,
    damage: 15,
    speed: 8,
    radius: 1.0,
    height: 1.8,
    mass: 200,
    attackRange: 15,
    windup: 0.6,
    recover: 1.2,
    cooldown: 2.6,
    lungeSpeed: 22,
    lungeTime: 0.7,
    fly: { height: 5 },
    strike: 'line',
    stun: 40,
  },
  // v2 fauna (PROMPT: not enemies). A Pegasus drifts over the meadows; a Unicorn guards each altar.
  pegasus: {
    name: 'Pegasus',
    rank: 'prajurit',
    hp: 1,
    damage: 0,
    speed: 6,
    radius: 0.9,
    height: 2.1,
    mass: 400,
    attackRange: 0,
    windup: 1,
    recover: 1,
    cooldown: 9,
    fly: { height: 6 },
    passive: true,
  },
  unicorn: {
    name: 'Unicorn',
    rank: 'prajurit',
    hp: 1,
    damage: 0,
    speed: 5,
    radius: 0.9,
    height: 2.1,
    mass: 400,
    attackRange: 0,
    windup: 1,
    recover: 1,
    cooldown: 9,
    passive: true,
  },
  // v2 bosses of the open world (PROMPT roster: Cerberus besar and Lilith after the Hydra, the Dragon as
  // the set-piece of Tier V, Typhon, Samael and Atlas as the last bosses). Each waits in a camp of its own.
  cerberus: {
    name: 'Cerberus',
    rank: 'marsekal',
    hp: 1500,
    damage: 26,
    speed: 5.5,
    radius: 1.8,
    height: 3.2,
    mass: 2500,
    attackRange: 8,
    windup: 0.9,
    recover: 1,
    cooldown: 1.6,
    stun: 260,
    anchored: true,
    boss: true,
    summon: { every: 18, count: 2, max: 4 },
    summonKind: 'hellhound',
    attacks: [
      { name: 'gigitan tiga kepala', strike: 'ring', windup: 0.8, recover: 0.9, range: 4.5, ring: 2.6 },
      { name: 'napas api', strike: 'ring', windup: 1.1, recover: 1, range: 10, ring: 3.4, ahead: 5, cooldown: 5 },
      { name: 'terjang', strike: 'line', windup: 0.9, recover: 1.4, range: 20, minRange: 8, damage: 1.3, lungeSpeed: 17, lungeTime: 0.85, cooldown: 7 },
    ],
  },
  lilith: {
    name: 'Lilith',
    rank: 'marsekal',
    hp: 1300,
    damage: 24,
    speed: 4.6,
    radius: 0.9,
    height: 2.7,
    mass: 700,
    attackRange: 24,
    windup: 0.9,
    recover: 1,
    cooldown: 1.8,
    stun: 200,
    boss: true,
    blink: { range: 13, every: 8 },
    summon: { every: 20, count: 1, max: 2 },
    summonKind: 'succubus',
    keepAway: 9,
    attacks: [
      { name: 'lilitan ular', strike: 'ring', windup: 0.8, recover: 0.9, range: 4, ring: 3.2 },
      { name: 'tombak gelap', strike: 'line', windup: 0.8, recover: 0.8, range: 26, minRange: 5, shot: { speed: 26, gravity: 0, radius: 0.3 } },
      { name: 'kutukan', strike: 'ring', windup: 1, recover: 1, range: 22, minRange: 5, ring: 2.6, damage: 0.8, effect: 'poison', shot: { speed: 13, gravity: 12, radius: 0.5 }, cooldown: 6 },
    ],
  },
  dragon: {
    name: 'Dragon',
    rank: 'marsekal',
    hp: 1700,
    damage: 30,
    speed: 6,
    radius: 2.2,
    height: 3.6,
    mass: 4000,
    attackRange: 14,
    windup: 1,
    recover: 1.2,
    cooldown: 2,
    stun: 320,
    anchored: true,
    boss: true,
    attacks: [
      { name: 'ekor', strike: 'ring', windup: 0.8, recover: 0.9, range: 6, ring: 2.8, behind: true },
      { name: 'napas api', strike: 'ring', windup: 1.2, recover: 1.1, range: 12, ring: 3.8, ahead: 6 },
      { name: 'bola api', strike: 'ring', windup: 1.1, recover: 1, range: 32, minRange: 10, ring: 3, shot: { speed: 15, gravity: 10, radius: 0.7 }, cooldown: 4 },
      { name: 'terkam', strike: 'line', windup: 1, recover: 1.6, range: 24, minRange: 8, damage: 1.4, lungeSpeed: 19, lungeTime: 0.9, cooldown: 8 },
    ],
  },
  atlas: {
    name: 'Atlas',
    rank: 'marsekal',
    hp: 1900,
    damage: 32,
    speed: 3,
    radius: 1.6,
    height: 5,
    mass: 6000,
    attackRange: 7,
    windup: 1.4,
    recover: 1.3,
    cooldown: 2,
    stun: 400,
    anchored: true,
    boss: true,
    attacks: [
      { name: 'hentakan', strike: 'ring', windup: 0.9, recover: 1, range: 3.5, ring: 3.6 },
      { name: 'bola dunia', strike: 'ring', windup: 1.6, recover: 1.4, range: 8, ring: 5, ahead: 3, damage: 1.5, cooldown: 6 },
      { name: 'lempar batu', strike: 'ring', windup: 1.2, recover: 1, range: 30, minRange: 9, ring: 3, shot: { speed: 13, gravity: 14, radius: 0.7 }, cooldown: 4 },
    ],
  },
  typhon: {
    name: 'Typhon',
    rank: 'marsekal',
    hp: 2000,
    damage: 30,
    speed: 3.6,
    radius: 2,
    height: 6,
    mass: 6000,
    attackRange: 9,
    windup: 1.2,
    recover: 1.2,
    cooldown: 2,
    stun: 420,
    anchored: true,
    boss: true,
    summon: { every: 22, count: 3, max: 6 },
    summonKind: 'harpy',
    attacks: [
      { name: 'hantam badai', strike: 'ring', windup: 1.3, recover: 1.2, range: 7, ring: 4.6 },
      { name: 'lecut ular', strike: 'line', windup: 0.9, recover: 1.2, range: 15, minRange: 4, lungeSpeed: 10, lungeTime: 0.6, cooldown: 5 },
      { name: 'petir', strike: 'ring', windup: 1, recover: 0.9, range: 32, minRange: 8, ring: 2.4, shot: { speed: 18, gravity: 8, radius: 0.5 }, cooldown: 3 },
    ],
  },
  samael: {
    name: 'Samael',
    rank: 'marsekal',
    hp: 2000,
    damage: 32,
    speed: 5.5,
    radius: 0.9,
    height: 2.9,
    mass: 900,
    attackRange: 20,
    windup: 0.8,
    recover: 1,
    cooldown: 1.6,
    stun: 300,
    boss: true,
    blink: { range: 14, every: 7 },
    attacks: [
      { name: 'pedang', strike: 'ring', windup: 0.7, recover: 0.8, range: 4, ring: 2.6 },
      { name: 'tebasan maut', strike: 'line', windup: 0.9, recover: 1.3, range: 20, minRange: 5, damage: 1.3, lungeSpeed: 24, lungeTime: 0.7, cooldown: 6 },
      { name: 'penghakiman', strike: 'ring', windup: 1.4, recover: 1.2, range: 24, minRange: 6, ring: 4, damage: 1.5, shot: { speed: 16, gravity: 9, radius: 0.6 }, cooldown: 7 },
    ],
  },
  // v2 (Easy), Tanah Ganjil, the second batch (owner, 28 Nov 2026: assets/Monster pt2). Lv 16 to 18, each kind on its own ground.
  // Satyr: quick on goat legs; leaps horns first under a circle, or blows a shrill note along a line from afar.
  satyr: {
    name: 'Satyr',
    rank: 'prajurit',
    hp: 90,
    damage: 16,
    speed: 5.4,
    radius: 0.45,
    height: 2,
    mass: 60,
    attackRange: 18,
    windup: 0.55,
    recover: 0.8,
    cooldown: 1.8,
    stun: 40,
    flank: true,
    attacks: [
      { name: 'seruduk tanduk', strike: 'ring', windup: 0.55, recover: 0.8, range: 3.4, ring: 1.6, lungeSpeed: 8, lungeTime: 0.3 },
      { name: 'nada suling', strike: 'line', windup: 0.7, recover: 0.7, range: 18, minRange: 5, shot: { speed: 26, gravity: 0, radius: 0.2 }, cooldown: 4 },
    ],
  },
  // Blemmye: no head, the face in its chest; heavy fists under a circle and a shoulder charge along a line.
  blemmye: {
    name: 'Blemmye',
    rank: 'prajurit',
    hp: 120,
    damage: 18,
    speed: 4.3,
    radius: 0.55,
    height: 1.9,
    mass: 110,
    attackRange: 10,
    windup: 0.65,
    recover: 0.9,
    cooldown: 1.8,
    stun: 50,
    attacks: [
      { name: 'tinju', strike: 'ring', windup: 0.65, recover: 0.9, range: 2.9, ring: 1.8, lungeSpeed: 6, lungeTime: 0.3 },
      { name: 'hantam bahu', strike: 'line', windup: 0.7, recover: 1.1, range: 10, minRange: 4, lungeSpeed: 14, lungeTime: 0.5, cooldown: 5 },
    ],
  },
  // Panotti: the great ears beat a gust over a wide circle in front of it; it keeps a little away.
  panotti: {
    name: 'Panotti',
    rank: 'prajurit',
    hp: 100,
    damage: 14,
    speed: 4,
    radius: 0.5,
    height: 2.1,
    mass: 70,
    attackRange: 7,
    windup: 0.8,
    recover: 0.9,
    cooldown: 2,
    stun: 45,
    keepAway: 5,
    attacks: [
      { name: 'kibasan telinga', strike: 'ring', windup: 0.9, recover: 1, range: 7, ring: 3.2, ahead: 3, cooldown: 3.5 },
      { name: 'tamparan', strike: 'ring', windup: 0.6, recover: 0.8, range: 2.8, ring: 1.6, lungeSpeed: 5, lungeTime: 0.3 },
    ],
  },
  // Silvana: the wild woman; circles to her side, long poisoned nails, and a pounce along a line.
  silvana: {
    name: 'Silvana',
    rank: 'prajurit',
    hp: 110,
    damage: 15,
    speed: 5,
    radius: 0.5,
    height: 2.5,
    mass: 70,
    attackRange: 12,
    windup: 0.6,
    recover: 0.8,
    cooldown: 1.8,
    stun: 45,
    flank: true,
    attacks: [
      { name: 'cakar beracun', strike: 'ring', windup: 0.6, recover: 0.8, range: 3.4, ring: 1.8, lungeSpeed: 8, lungeTime: 0.3, damage: 0.8, effect: 'poison' },
      { name: 'terkam', strike: 'line', windup: 0.65, recover: 1, range: 12, minRange: 4, lungeSpeed: 15, lungeTime: 0.55, cooldown: 5 },
    ],
  },
  // Leonis: the lion-maned swordsman; cuts under a circle, thrusts along a line, roars around itself.
  leonis: {
    name: 'Leonis',
    rank: 'ksatria',
    hp: 200,
    damage: 22,
    speed: 4.6,
    radius: 0.6,
    height: 2.6,
    mass: 150,
    attackRange: 9,
  // v2 boss, Danau Hitam: the body in the lake. Its heads are separate parts; see HYDRA.
  hydra: {
    name: 'Hydra',
    rank: 'marsekal',
    hp: 2600,
    damage: 26,
    speed: 3.5,
    radius: 4.5,
    height: 9,
    mass: 20000,
    attackRange: 5,
    windup: 1.6,
    recover: 1.2,
    cooldown: 2.4,
    stun: 400,
    anchored: true,
    boss: true,
    attacks: [{ name: 'hantam tubuh', strike: 'ring', windup: 1.6, recover: 1.2, range: 9, ring: 4.5 }],
  },
  // v2: one head of the Hydra, steered by the boss; it has no model of its own.
  hydraHead: {
    name: 'Kepala Hydra',
    rank: 'marsekal',
    hp: 100000,
    damage: 20,
    speed: 0,
    radius: 1.3,
    height: 2.4,
    mass: 20000,
    attackRange: 18,
    windup: 1.3,
    recover: 1.2,
    cooldown: 3,
    stun: 60,
    anchored: true,
    part: true,
    attacks: [
      { name: 'hantam kepala', strike: 'ring', windup: 1.3, recover: 1.2, range: 18, ring: 2.4, lungeTime: 0.25 },
      { name: 'semburan', strike: 'ring', windup: 1, recover: 1, range: 26, ring: 2.2, shot: { speed: 14, gravity: 12, radius: 0.45 } },
    ],
  },
}

/**
 * The Hydra, built on the three-phase plan of v1's Hollow Warden. Phase 1: heads slam under amber
 * circles and spew Imps; a head knocked off balance can be executed (it is severed). Phase 2 (from
 * 66% HP): the water rises and the shore breaks into islands; its slimy skin takes 10% from bolts and
 * 150% from thrown things; boulders wait on the islands. Phase 3 (from 33%): it swallows its heads and
 * takes nothing outside Reality Warp; inside the field its heart opens for +50%.
 */
export const HYDRA = {
  heads: 5,
  /** Drawn this much larger than its block-out, so its necks reach the shore. */
  scale: 1.35,
  /** From the lair's middle into the lake: where the body lies in phases 1 and 2, and where it crawls to in phase 3 (m). */
  lies: 10,
  crawls: 6,
  /** Nearest and farthest a head comes down from the body (m); the circle stays in that band, and past it the heads spit. */
  slamNear: 10,
  slamReach: 14,
  phase2At: 0.66,
  phase3At: 0.33,
  /** A severed head costs it this share of its HP. */
  severShare: 0.08,
  /** Imps spewed by each slam in phase 1, and the most that stand at once. */
  impsPerSlam: 2,
  maxImps: 6,
  /** Phase 2 skin: bolts and blasts do this share, thrown things this much. */
  boltShare: 0.1,
  thrownShare: 1.5,
  /** Phase 3: damage inside Reality Warp, and nothing outside it. */
  warpShare: 1.5,
  /** Share of the army's damage that lands on it, in every phase: the Hydra is her fight. */
  armyShare: 0.15,
  /** Mass of a boulder on the islands, as a creature's: thrown at full speed it hits for about 74 with v1's impact formula, before her Hex and the 150% of phase 2. */
  rockMass: 120,
  /** Each new phase gives her back a share of max HP and some mana (v1). */
  phaseHeal: 0.25,
  phaseMana: 30,
  /** The lair opens only to a witch of this level: phase 3 can only be won inside Reality Warp. */
  lairLevel: 10,
  /** Seconds after it falls before it stands in the lake again (owner: every 45 seconds, like every boss). */
  respawn: 45,
  /** It rises into the lake when she comes within `wake` of the lair, and sinks away again past `sleep` (m). */
  wake: 150,
  sleep: 220,
  /** Boulders kept on the islands in phase 2. */
  rocks: 6,
} as const

/** Enemy growth per level. Kept below the witch's own growth so higher tiers stay fair. */
export const GROWTH = { hpPerLevel: 0.15, damagePerLevel: 0.1 } as const

export const SHADOW = { hpMult: 2.2, damageMult: 1.2, speedMult: 1.15, followDistance: 3.2, engageRange: 14, leash: 22, regen: 0.04 } as const

/** What raised shadows of the bigger ranks can do on their own. */
export const SHADOW_SKILL = {
  /** Rift Lord (Jenderal): calls two short-lived shadow husks. */
  call: { every: 20, count: 2, lasts: 15 },
  /** Hollow Warden (Marsekal): drags enemies in and stuns them. */
  pull: { every: 12, radius: 11, stun: 1.5 },
} as const

/**
 * Tier IV and V creatures can be elite: tougher, worth more XP, and with one trait.
 * berlapis: hard to hurt except by a throw. gesit: quick. meledak: bursts when it falls.
 * penjaga: other creatures near it take less damage while it stands.
 */
export type EliteTrait = 'berlapis' | 'gesit' | 'meledak' | 'penjaga'

export const ELITE = {
  traits: ['berlapis', 'gesit', 'meledak', 'penjaga'] as EliteTrait[],
  label: { berlapis: 'Berlapis', gesit: 'Gesit', meledak: 'Meledak', penjaga: 'Penjaga' } as Record<EliteTrait, string>,
  hp: 2.4,
  damage: 1.25,
  scale: 1.15,
  xp: 3,
  /** Share of damage that still lands on a berlapis elite, unless it comes from a throw. */
  armor: 0.45,
  swift: { speed: 1.45, tempo: 0.7 },
  burst: { radius: 4.5, delay: 1.6, damage: 2 },
  /** Share of damage that lands on creatures near a penjaga elite. */
  ward: { radius: 9, share: 0.65 },
} as const

/** `elites`: how many of the wave come out elite. `eliteLords`: every Rift Lord of the wave is one. */
export type WaveSpec = Partial<Record<Exclude<UnitKind, 'hollow' | V2Kind>, number>> & { levels: [number, number]; elites?: number; eliteLords?: boolean }

export type TierId = 1 | 2 | 3 | 4 | 5

export const TIER_IDS: TierId[] = [1, 2, 3, 4, 5]

export interface TierSpec {
  tier: TierId
  name: string
  roman: string
  unlock: number
  waves: WaveSpec[]
  maxAlive: number
  /** Tier III ends in the Hollow Warden's lair. */
  boss?: { level: number; unlock: number }
  /** Opens only once The Hollow Warden has fallen. */
  needsBoss?: boolean
}

export const TIERS: Record<TierId, TierSpec> = {
  1: {
    tier: 1,
    name: 'Rift Tier I',
    roman: 'I',
    unlock: 1,
    maxAlive: 16,
    waves: [
      { husk: 6, levels: [1, 1] },
      { husk: 8, hound: 2, levels: [1, 1] },
      { husk: 10, hound: 4, levels: [1, 2] },
      { husk: 12, hound: 5, levels: [2, 2] },
      { husk: 14, hound: 6, levels: [2, 3] },
    ],
  },
  2: {
    tier: 2,
    name: 'Rift Tier II',
    roman: 'II',
    unlock: 4,
    maxAlive: 17,
    waves: [
      { husk: 6, hound: 2, spitter: 2, levels: [4, 4] },
      { husk: 8, hound: 3, spitter: 2, levels: [4, 5] },
      { husk: 9, hound: 3, spitter: 3, levels: [5, 5] },
      { husk: 10, hound: 4, spitter: 3, levels: [5, 6] },
      { husk: 11, hound: 5, spitter: 4, levels: [6, 6] },
    ],
  },
  3: {
    tier: 3,
    name: 'Rift Tier III',
    roman: 'III',
    unlock: 7,
    maxAlive: 18,
    waves: [
      { husk: 10, hound: 4, spitter: 3, warden: 2, levels: [7, 7] },
      { husk: 11, hound: 5, spitter: 4, warden: 3, levels: [7, 8] },
      { husk: 12, hound: 6, spitter: 4, warden: 4, levels: [8, 8] },
      { riftlord: 1, husk: 8, spitter: 3, warden: 2, levels: [8, 9] },
    ],
    // Phase 3 can only be won inside Reality Warp (Lv 10), so the lair opens at that level.
    boss: { level: 10, unlock: 10 },
  },
  // Past the GDD's first version: enemies Lv 10 and up, elite combinations.
  4: {
    tier: 4,
    name: 'Rift Tier IV',
    roman: 'IV',
    unlock: 10,
    needsBoss: true,
    maxAlive: 18,
    waves: [
      { husk: 7, hound: 3, harrier: 3, levels: [10, 10], elites: 1 },
      { husk: 7, hound: 3, spitter: 2, harrier: 4, levels: [10, 11], elites: 2 },
      { husk: 7, hound: 3, spitter: 2, warden: 2, harrier: 4, levels: [11, 11], elites: 3 },
      { husk: 8, hound: 4, spitter: 3, warden: 3, harrier: 4, levels: [11, 12], elites: 3 },
      { riftlord: 1, husk: 6, warden: 2, harrier: 4, levels: [12, 12], elites: 2, eliteLords: true },
    ],
  },
  5: {
    tier: 5,
    name: 'Rift Tier V',
    roman: 'V',
    unlock: 13,
    needsBoss: true,
    maxAlive: 19,
    waves: [
      { husk: 7, hound: 3, harrier: 3, bombard: 1, levels: [13, 13], elites: 2 },
      { husk: 7, hound: 3, spitter: 2, harrier: 3, bombard: 2, levels: [13, 14], elites: 2 },
      { husk: 7, hound: 3, spitter: 2, warden: 3, harrier: 4, bombard: 2, levels: [14, 14], elites: 3 },
      { husk: 8, hound: 4, spitter: 3, warden: 3, harrier: 4, bombard: 2, levels: [14, 15], elites: 4 },
      { husk: 7, hound: 3, warden: 3, harrier: 4, bombard: 2, levels: [15, 15], elites: 4 },
      { riftlord: 2, husk: 5, warden: 2, bombard: 2, levels: [15, 15], elites: 2, eliteLords: true },
    ],
  },
}

export const RIFT = {
  spawnInterval: 0.8,
  breather: 6,
  /** Share of max HP restored when a wave ends; the GDD has no other healing yet. */
  breatherHeal: 0.2,
  /** Seconds the last three or fewer of a wave may hang back before they come for the witch. */
  straggle: 20,
} as const

export const BOSS = {
  /** HP shares where the fight moves to phase 2 and phase 3. */
  phase2At: 0.66,
  phase3At: 0.33,
  /** Phase 2: bolts barely scratch the shell; thrown bodies do full damage. */
  shellBoltShare: 0.1,
  volleyEvery: 3.6,
  volleyShots: 3,
  /** Share of the boss's hit that one glob carries; volleys are meant to be dodged, not tanked. */
  volleyDamage: 0.28,
  volleySpread: 3.2,
  /** The globs of its volleys (kept off the unit spec so phase 1 stays a melee fight). */
  shot: { speed: 15, gravity: 6, radius: 0.45, keepAway: 0 },
  /** Each new phase gives the witch a breath: a share of HP and some mana back. */
  phaseHeal: 0.25,
  phaseMana: 30,
  /** Phase 3: slower volleys, and the husks it swallows heal it a little. */
  volleyEvery3: 4.2,
  /** Damage taken while caught in Reality Warp in phase 3. */
  warpDamage: 1.5,
  swallowHeal: 0.015,
  feedEvery: 22,
  /** Falling into the void costs this share of max HP. */
  fallDamage: 0.15,
  hoverHeight: 6.5,
} as const

export const WORLD = { maxPhysicsProps: 20, arenaHalf: 38 } as const

// ------------------------------------------------------------ v2 melee and the forest camps

/** One swing of the staff. Times in seconds from the button: windup, then the hit lands for `active`, then recovery. */
export interface Swing {
  damage: number
  windup: number
  active: number
  recover: number
  /** Reach in metres and arc in radians in front of her. */
  reach: number
  arc: number
  stun: number
  /** She steps this far into the swing. */
  lunge: number
}

export const COMBAT = {
  /** Three light swings chained by tapping the left button, a fourth tap starts over. */
  light: [
    { damage: 10, windup: 0.1, active: 0.12, recover: 0.2, reach: 2.4, arc: 2.0, stun: 5, lunge: 1.0 },
    { damage: 10, windup: 0.1, active: 0.12, recover: 0.2, reach: 2.4, arc: 2.0, stun: 5, lunge: 1.0 },
    { damage: 16, windup: 0.16, active: 0.14, recover: 0.36, reach: 2.6, arc: 2.4, stun: 9, lunge: 1.4 },
  ] as Swing[],
  /** A tap within this long after a swing's hit chains the next swing. */
  comboWindow: 0.5,
  /** Holding the left button this long turns the attack into the heavy overhead blow. */
  heavyHold: 0.3,
  heavy: { damage: 28, windup: 0.26, active: 0.16, recover: 0.5, reach: 2.8, arc: 2.2, stun: 26, lunge: 1.4 } as Swing,
  /** Knockback of the heavy blow (m/s). */
  heavyKnock: 7,
  /** Share of swing damage while the staff is thrown and she strikes bare-handed. */
  unarmed: 0.5,
  block: {
    /** Attacks from within this angle in front (radians, total) are blocked. */
    arc: 2.4,
    /** Her pace while holding block. */
    speed: 0.45,
  },
  parry: {
    /** Pressing block this close before a blockable hit lands parries it (seconds). */
    window: 0.18,
    /** Stun added to the attacker by a parry. */
    stun: 55,
    /** Damage multiplier of her next swing within `riposte` seconds after a parry. */
    counter: 1.5,
    riposte: 1.2,
  },
  /** Brief freeze on impact; heavier blows hold longer. */
  hitstop: { light: 0.035, heavy: 0.08, parry: 0.11 },
  /** A full stun meter staggers the creature this long; F executes it. */
  stagger: 3.2,
  /** The meter drains this fast after this long without new stun. */
  stunDrain: 8,
  stunDrainDelay: 2.5,
  execute: {
    range: 2.8,
    time: 1.0,
    /** Added to the Umbra Rite chance of a body she executed (phase 3), before the 0.10 to 0.90 clamp. */
    riteBonus: 0.15,
  },
  /** At most this many creatures attack her at the same time; the rest circle. */
  attackers: 2,
  staff: {
    throwSpeed: 42,
    range: 40,
    damage: 18,
    stun: 20,
    recallSpeed: 34,
    recallDamage: 12,
    recallStun: 16,
    /** She catches it when it comes within this distance of her hand. */
    catch: 1.0,
  },
  /** Seconds of invulnerability after a hit, so one swarm does not empty her in a frame. */
  hurtGrace: 0.35,
} as const

/**
 * Camps wake (their creatures appear) when she comes within `wake` m, sleep past `sleep` m, and stand
 * again `respawn` s after they fall, once she is out of sight. A pack is roused when she or a shadow
 * comes within `aggro` m of any of its creatures, or one is hurt; past `leash` m from the camp it
 * walks home and heals.
 */
/**
 * `pack`: every ordinary pack comes out this much larger than its list (rounded up); the owner asked for
 * more creatures. `bossRespawn`: a boss stands again this long after it falls (s), wherever she is; the
 * owner asked for every 45 seconds. The Hydra uses the same.
 */
export const CAMP = { wake: 80, sleep: 170, respawn: 120, aggro: 24, leash: 55, pack: 1.5, bossRespawn: 45 } as const

/** v2 open world: falling, and getting up again. */
export const REVIVE = {
  /** Seconds on the ground before she rises again at the start point (at the last altar from phase 4). */
  delay: 3,
  /** HP comes back by this share of max HP per second once nothing has hurt her for `calm` seconds. */
  calmRegen: 0.03,
  calm: 6,
} as const
