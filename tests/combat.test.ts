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

  it('pins the parry window at 0.18 s', () => {
    expect(W).toBe(0.18)
  })

  it('cannot block or parry a line attack; only the roll avoids it', () => {
    expect(resolveDefense(10, 'line', false, true, 9.95, 0)).toBe('hit')
    expect(resolveDefense(10, 'line', true, false, -Infinity, 0)).toBe('dodge')
  })

  it('is hit from behind even while blocking', () => {
    expect(resolveDefense(10, 'ring', false, true, 9.95, Math.PI)).toBe('hit')
    expect(resolveDefense(10, 'ring', false, true, 5, COMBAT.block.arc / 2 - 0.01)).toBe('block')
    expect(resolveDefense(10, 'ring', false, true, 5, COMBAT.block.arc / 2 + 0.01)).toBe('hit')
  })
})

describe('stun meter and execution', () => {
  it('staggers when full, then drains after being left alone', () => {
    const m = new StunMeter(30)
    expect(m.add(COMBAT.heavy.stun)).toBe(false)
    expect(m.add(10)).toBe(true)
    expect(m.staggered).toBe(COMBAT.stagger)
    m.update(COMBAT.stagger)
    expect(m.value).toBe(0)
    m.add(20)
    m.update(COMBAT.stunDrainDelay + 1)
    expect(m.value).toBeLessThan(20)
  })

  it('fills from one parry on an Imp', () => {
    const m = new StunMeter(30)
    expect(m.add(COMBAT.parry.stun)).toBe(true)
  })

  it('adds 0.15 to the Umbra Rite chance of an executed body, inside the v1 clamp', () => {
    expect(COMBAT.execute.riteBonus).toBe(0.15)
    // v1 example from the GDD stays exact
    expect(riteChance('ksatria', 5, 5, 13)).toBeCloseTo(0.58, 3)
    expect(riteChance('prajurit', 1, 1, 5)).toBeCloseTo(0.65, 3)
    expect(riteChance('prajurit', 1, 1, 5, true)).toBeCloseTo(0.8, 3)
    expect(riteChance('prajurit', 10, 1, 20, true)).toBe(RITE.maxChance)
    expect(riteChance('marsekal', 1, 10, 5, true)).toBeCloseTo(0.15 - 0.18 + 0.05 + 0.15, 3)
    expect(riteChance('marsekal', 1, 20, 5, true)).toBe(RITE.minChance)
    expect(riteChance('jenderal', 8, 8, 10, true)).toBeCloseTo(0.3 + 0.1 + 0.15, 3)
  })
})

describe('staff combo', () => {
  function play(c: Combo, script: [number, boolean, boolean][]) {
    const events: ComboEvent[] = []
    for (const [dt, pressed, held] of script) c.update(dt, pressed, held, events)
    return events
  }

  it('chains three light swings, then starts over', () => {
    const c = new Combo()
    const starts: number[] = []
    for (let n = 0; n < 4; n++) {
      const ev = play(c, [[1 / 60, true, true], [1 / 60, false, false]])
