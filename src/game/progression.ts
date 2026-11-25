import {
  CHAOS,
  COMBAT,
  ELITE,
  GROWTH,
  MOVE,
  PLAYER,
  RANKS,
  RITE,
  SHADOW,
  UNITS,
  TIERS,
  XP,
  type RankId,
  type TierId,
  type UnitKind,
} from './balance'
import { skillById, type SkillId } from './skills'

export type StatKey = 'hex' | 'spr' | 'vit' | 'agi' | 'umb'
export type Stats = Record<StatKey, number>

export const STAT_KEYS: StatKey[] = ['hex', 'spr', 'vit', 'agi', 'umb']

export interface ShadowRecord {
  id: number
  name: string
  kind: UnitKind
  rank: RankId
  level: number
  xp: number
}

export interface Settings {
  sensitivity: number
  volume: number
  headBob: boolean
  shake: boolean
  /** Shadows drawn in full detail; every shadow still fights, the far ones are drawn as a crowd. */
  detail: number
  /** Seen through her eyes (P) instead of over her shoulder. */
  firstPerson: boolean
}

export interface Profile {
  version: 1
  level: number
  xp: number
  statPoints: number
  skillPoints: number
  stats: Stats
  upgrades: Partial<Record<SkillId, boolean>>
  shadows: ShadowRecord[]
  nextShadowId: number
  /** Rifts closed in total, and per tier. */
  clears: number
  tierClears: Record<TierId, number>
  /** Times The Hollow Warden has fallen. */
  bossKills: number
  settings: Settings
  /** Altars she has lit, and the one she rises at after a fall. */
  world: { altars: string[]; last: string }
  /** When this witch last changed; with an account, the newer copy wins. */
  updatedAt?: string
}

export const DEFAULT_SETTINGS: Settings = { sensitivity: 1, volume: 0.7, headBob: true, shake: true, detail: RITE.detail.default, firstPerson: false }

export function newProfile(): Profile {
  return {
    version: 1,
    level: 1,
    xp: 0,
    statPoints: 0,
    skillPoints: 0,
    stats: { hex: XP.startStat, spr: XP.startStat, vit: XP.startStat, agi: XP.startStat, umb: XP.startStat },
    upgrades: {},
    shadows: [],
    nextShadowId: 1,
    clears: 0,
    tierClears: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    bossKills: 0,
    settings: { ...DEFAULT_SETTINGS },
    world: { altars: ['pembuka'], last: 'pembuka' },
  }
}

export const tierUnlocked = (p: Profile, tier: TierId) => p.level >= TIERS[tier].unlock && (!TIERS[tier].needsBoss || p.bossKills > 0)

/** What still keeps a tier shut, for the title and the world gates; null when it is open. */
export function tierLock(p: Profile, tier: TierId): string | null {
  const t = TIERS[tier]
  if (t.needsBoss && p.bossKills === 0) return p.level >= t.unlock ? 'Kalahkan The Hollow Warden dulu' : `Lv ${t.unlock} dan The Hollow Warden kalah`
  if (p.level < t.unlock) return `Lv ${t.unlock}`
  return null
}

/** The lair at the end of Tier III opens once Reality Warp can break the boss's last shell. */
export const bossUnlocked = (p: Profile) => p.level >= (TIERS[3].boss?.unlock ?? 10)

/**
 * Why this witch cannot raise a body of this kind yet, or null when she can.
 * Jenderal needs Kebangkitan Jenderal (Lv 8); Marsekal needs Kebangkitan Marsekal (Lv 9), one per boss.
 */
export function riteBlock(p: Profile, kind: UnitKind, rank: RankId = UNITS[kind].rank): string | null {
  if (rank === 'jenderal' && !isUnlocked(p, 'general')) return `${UNITS[kind].name} butuh Kebangkitan Jenderal (Lv 8).`
  if (rank === 'marsekal') {
    if (!isUnlocked(p, 'marshal')) return `${UNITS[kind].name} butuh Kebangkitan Marsekal (Lv 9).`
    if (p.shadows.some((s) => s.kind === kind)) return `Hanya satu Marsekal per boss, dan ${UNITS[kind].name} sudah ada di Ruang Bayangan.`
  }
  return null
}

/** True for a witch nobody has played yet (settings do not count). */
export function isFresh(p: Profile): boolean {
  return (
    p.level === 1 &&
    p.xp === 0 &&
    p.shadows.length === 0 &&
    p.clears === 0 &&
    p.bossKills === 0 &&
    p.statPoints === 0 &&
    p.skillPoints === 0 &&
    Object.keys(p.upgrades).length === 0 &&
    STAT_KEYS.every((k) => p.stats[k] === XP.startStat)
  )
}

/** XP needed to go from `level` to `level + 1`: 80 x n^1.5, rounded to tens, and steeper past Lv 9. */
export function xpToNext(level: number): number {
  const late = level > 9 ? 1 + XP.lateSteep * (level - 9) : 1
  return Math.round((XP.base * level ** XP.exponent * late) / 10) * 10
}

export function xpForKill(enemyLevel: number, boss = false): number {
  return enemyLevel * (boss ? XP.perBossLevel : XP.perEnemyLevel)
}

/** Bigger ranks are worth more: a Rift Lord five husks, the boss ten ("XP besar" in the GDD). */
const RANK_XP: Record<RankId, number> = { prajurit: 1, ksatria: 2, jenderal: 5, marsekal: 10 }

export function xpForUnit(kind: UnitKind, level: number, elite = false): number {
  const rank = UNITS[kind].rank
  return xpForKill(level, rank === 'marsekal') * RANK_XP[rank] * (elite ? ELITE.xp : 1)
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * Chance that one Umbra Rite cast succeeds. Raw UMB counts, as in the GDD example. v2: a body she
 * finished with an execution adds COMBAT.execute.riteBonus before the clamp.
 */
export function riteChance(rank: RankId, playerLevel: number, enemyLevel: number, umb: number, executed = false): number {
  const p = RANKS[rank].base + 0.02 * (playerLevel - enemyLevel) + 0.01 * umb + (executed ? COMBAT.execute.riteBonus : 0)
  return Math.round(clamp(p, RITE.minChance, RITE.maxChance) * 1000) / 1000
}

/** How much stronger every shadow is for this witch's UMB. */
export function shadowPower(umb: number): number {
  return 1 + RITE.powerPerUmb * Math.max(0, umb - XP.startStat)
}

export interface Derived {
  maxHp: number
  maxMana: number
  manaRegen: number
  damageMult: number
  speedMult: number
  /** Length of a dodge roll; AGI makes it longer. */
  dodgeDistance: number
  /** Multiplier on every shadow's HP and damage. */
  shadowPower: number
}

/** Stat effects count the points above the starting 5, so a new witch plays at the GDD's base values. */
export function derive(stats: Stats, level = 1): Derived {
  const above = (k: StatKey) => stats[k] - XP.startStat
  const grown = Math.max(0, level - 1)
  return {
    maxHp: PLAYER.baseHp + PLAYER.hpPerVit * stats.vit + PLAYER.hpPerLevel * grown,
    maxMana: PLAYER.baseMana + PLAYER.manaPerSpr * stats.spr,
    manaRegen: PLAYER.manaRegen * (1 + PLAYER.manaRegenPerSpr * above('spr')),
    damageMult: 1 + PLAYER.damagePerHex * above('hex') + PLAYER.damagePerLevel * grown,
    speedMult: 1 + PLAYER.speedPerAgi * above('agi'),
    dodgeDistance: MOVE.dodge.distance + MOVE.dodgePerAgi * above('agi'),
    shadowPower: shadowPower(stats.umb),
  }
}

export const isUnlocked = (p: Profile, id: SkillId) => p.level >= skillById(id).unlock
export const hasUpgrade = (p: Profile, id: SkillId) => !!p.upgrades[id] && isUnlocked(p, id)

export function canUpgrade(p: Profile, id: SkillId): boolean {
  const def = skillById(id)
  return def.built && !def.noUpgrade && isUnlocked(p, id) && !p.upgrades[id] && p.skillPoints > 0
}

export function buyUpgrade(p: Profile, id: SkillId): boolean {
  if (!canUpgrade(p, id)) return false
  p.upgrades[id] = true
  p.skillPoints -= 1
  return true
}

export function spendStat(p: Profile, key: StatKey): boolean {
  if (p.statPoints <= 0) return false
  p.stats[key] += 1
  p.statPoints -= 1
  return true
}

export interface XpResult {
  levelsGained: number
  unlocked: SkillId[]
  shadowLevels: { id: number; level: number }[]
}

/** Adds XP, levels up as often as it covers, and passes 30% to every shadow (capped at your level). */
export function gainXp(p: Profile, amount: number, skills: SkillId[]): XpResult {
  const result: XpResult = { levelsGained: 0, unlocked: [], shadowLevels: [] }
  p.xp += amount
  while (p.level < XP.maxLevel && p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level)
    p.level += 1
    p.statPoints += XP.statPointsPerLevel
    p.skillPoints += XP.skillPointsPerLevel
    result.levelsGained += 1
    for (const id of skills) if (skillById(id).unlock === p.level) result.unlocked.push(id)
  }
  const share = Math.round(amount * RITE.shadowXpShare)
  for (const s of p.shadows) {
    s.xp += share
    while (s.level < p.level && s.xp >= xpToNext(s.level)) {
      s.xp -= xpToNext(s.level)
      s.level += 1
      result.shadowLevels.push({ id: s.id, level: s.level })
    }
    if (s.level >= p.level) s.xp = Math.min(s.xp, xpToNext(s.level) - 1)
  }
  return result
}

export function unitStats(kind: UnitKind, level: number, shadow: boolean) {
  const spec = UNITS[kind]
  const lv = Math.max(0, level - 1)
  const hp = spec.hp * (1 + GROWTH.hpPerLevel * lv) * (shadow ? SHADOW.hpMult : 1)
  const damage = spec.damage * (1 + GROWTH.damagePerLevel * lv) * (shadow ? SHADOW.damageMult : 1)
  const speed = spec.speed * (shadow ? SHADOW.speedMult : 1)
  return { hp: Math.round(hp), damage: Math.round(damage * 10) / 10, speed }
}

export function chaosFromDamage(dealt: number, taken: number): number {
  return dealt * CHAOS.perDamageDealt + taken * CHAOS.perDamageTaken
}

/** Damage of a thrown body: grows with mass^0.6 and with speed. */
export function impactDamage(mass: number, speed: number, coefficient: number, exponent: number): number {
  return coefficient * mass ** exponent * speed
}

const SYLLABLES = ['ve', 'mor', 'ska', 'thal', 'ri', 'on', 'du', 'kar', 'nyx', 'el', 'sor', 'ath', 'gru', 'vel', 'om', 'zir']

/** A short name per shadow, fixed by its id so the same shadow keeps its name. */
export function shadowName(id: number): string {
  let h = Math.imul(id, 2654435761) >>> 0
  const next = () => {
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    h = (h ^ (h >>> 16)) >>> 0
    return h
  }
  const parts = 2 + (next() % 2)
  let name = ''
  for (let i = 0; i < parts; i++) name += SYLLABLES[next() % SYLLABLES.length]
  return name.charAt(0).toUpperCase() + name.slice(1)
}

export function addShadow(p: Profile, kind: UnitKind, level: number, rank: RankId = UNITS[kind].rank): ShadowRecord | null {
  if (p.shadows.length >= RITE.maxShadows) return null
  const id = p.nextShadowId++
  const rec: ShadowRecord = { id, name: shadowName(id), kind, rank, level: Math.min(level, p.level), xp: 0 }
  p.shadows.push(rec)
  return rec
}

export function releaseShadow(p: Profile, id: number): boolean {
  const i = p.shadows.findIndex((s) => s.id === id)
  if (i < 0) return false
  p.shadows.splice(i, 1)
  return true
}
