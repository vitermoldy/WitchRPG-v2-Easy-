import { describe, expect, it } from 'vitest'
import { COMBAT, RITE } from '../src/game/balance'
import { Combo, inSwing, resolveDefense, StunMeter, type ComboEvent } from '../src/engine/combat'
import { riteChance } from '../src/game/progression'

const W = COMBAT.parry.window

describe('block and parry', () => {
  it('parries a ring attack when block was pressed within the parry window before the blow', () => {
    const impact = 10
    expect(resolveDefense(impact, 'ring', false, true, impact - 0.01, 0)).toBe('parry')
    expect(resolveDefense(impact, 'ring', false, true, impact - W, 0)).toBe('parry')
    expect(resolveDefense(impact, 'ring', false, false, impact - W * 0.5, 0)).toBe('parry')
  })

  it('only blocks when block was pressed earlier than the window and is still held', () => {
    const impact = 10
    expect(resolveDefense(impact, 'ring', false, true, impact - W - 0.001, 0)).toBe('block')
    expect(resolveDefense(impact, 'ring', false, true, impact - 1, 0)).toBe('block')
    expect(resolveDefense(impact, 'ring', false, false, impact - W - 0.001, 0)).toBe('hit')
  })

