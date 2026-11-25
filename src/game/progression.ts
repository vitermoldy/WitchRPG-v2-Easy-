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
