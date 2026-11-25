import { describe, expect, it } from 'vitest'
import { addShadow, buyUpgrade, gainXp, newProfile, spendStat } from '../src/game/progression'
import { normalizeProfile } from '../src/game/save'
import { SKILLS } from '../src/game/skills'

describe('the save', () => {
  it('gives a witch saved before phase 4 the start altar', () => {
    const old = JSON.parse(JSON.stringify(newProfile()))
    delete old.world
    const p = normalizeProfile(old)!
    expect(p.world.altars).toEqual(['pembuka'])
    expect(p.world.last).toBe('pembuka')
  })

  it('keeps lit altars and the rise point, without doubles or junk', () => {
    const p0 = newProfile()
    p0.world = { altars: ['pembuka', 'tebing', 'tebing', 7 as unknown as string], last: 'tebing' }
    const p = normalizeProfile(JSON.parse(JSON.stringify(p0)))!
    expect(p.world.altars).toEqual(['pembuka', 'tebing'])
    expect(p.world.last).toBe('tebing')
  })

  it('brings back level, stats, upgrades and the Shadow Room through JSON', () => {
    const p0 = newProfile()
    gainXp(p0, 2000, SKILLS.map((s) => s.id))
    spendStat(p0, 'vit')
    spendStat(p0, 'hex')
    buyUpgrade(p0, 'hexBolt')
