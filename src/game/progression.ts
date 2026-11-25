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
