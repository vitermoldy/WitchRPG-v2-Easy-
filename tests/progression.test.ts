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
  })
  it('rounds to tens', () => {
    for (let n = 1; n < 30; n++) expect(xpToNext(n) % 10).toBe(0)
  })
  it('gives 10 XP per enemy level and 15 for a boss', () => {
    expect(xpForKill(1)).toBe(10)
    expect(xpForKill(3)).toBe(30)
    expect(xpForKill(4, true)).toBe(60)
  })
  it('8 level-1 kills reach Lv 2', () => {
    const p = newProfile()
    for (let i = 0; i < 7; i++) gainXp(p, xpForKill(1), ALL)
    expect(p.level).toBe(1)
    const r = gainXp(p, xpForKill(1), ALL)
    expect(p.level).toBe(2)
    expect(r.unlocked).toContain('rite')
    expect(p.statPoints).toBe(3)
    expect(p.skillPoints).toBe(1)
  })
  it('levels several times from one large gain', () => {
    const p = newProfile()
    const r = gainXp(p, 80 + 230 + 420 + 5, ALL)
    expect(p.level).toBe(4)
    expect(p.xp).toBe(5)
    expect(r.levelsGained).toBe(3)
    expect(r.unlocked).toEqual(['rite', 'burst', 'swap'])
  })
})

describe('Umbra Rite chance', () => {
  it('reproduces the GDD example: Lv 5, UMB 15 against a Lv 6 Ksatria is 58%', () => {
    expect(riteChance('ksatria', 5, 6, 15)).toBe(0.58)
  })
  it('clamps between 10% and 90%', () => {
    expect(riteChance('marsekal', 1, 20, 5)).toBe(0.1)
    expect(riteChance('prajurit', 30, 1, 60)).toBe(0.9)
  })
  it('a new witch at Lv 2 against a Lv 1 Husk has 67%', () => {
    expect(riteChance('prajurit', 2, 1, 5)).toBe(0.67)
