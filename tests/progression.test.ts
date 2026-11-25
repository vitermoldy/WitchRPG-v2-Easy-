import { describe, expect, it } from 'vitest'
import {
  addShadow,
  bossUnlocked,
  buyUpgrade,
  derive,
  isFresh,
  riteBlock,
  tierLock,
  tierUnlocked,
  xpForUnit,
  gainXp,
  impactDamage,
  newProfile,
  riteChance,
  shadowName,
  shadowPower,
  spendStat,
  unitStats,
  xpForKill,
  xpToNext,
} from '../src/game/progression'
import { SKILLS } from '../src/game/skills'
import { ELITE, SPELL, TIERS, UNITS } from '../src/game/balance'

const ALL = SKILLS.map((s) => s.id)

describe('XP curve from the GDD', () => {
  it('matches the two anchor values', () => {
    expect(xpToNext(1)).toBe(80)
    expect(xpToNext(9)).toBe(2160)
