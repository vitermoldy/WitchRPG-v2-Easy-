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
