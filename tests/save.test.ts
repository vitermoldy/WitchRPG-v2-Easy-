import { describe, expect, it } from 'vitest'
import { addShadow, buyUpgrade, gainXp, newProfile, spendStat } from '../src/game/progression'
import { normalizeProfile } from '../src/game/save'
import { SKILLS } from '../src/game/skills'

describe('the save', () => {
  it('gives a witch saved before phase 4 the start altar', () => {
    const old = JSON.parse(JSON.stringify(newProfile()))
    delete old.world
    const p = normalizeProfile(old)!
