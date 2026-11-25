import { describe, expect, it } from 'vitest'
import { addShadow, buyUpgrade, gainXp, newProfile, spendStat } from '../src/game/progression'
import { normalizeProfile } from '../src/game/save'
import { SKILLS } from '../src/game/skills'

describe('the save', () => {
