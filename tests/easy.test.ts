import { describe, expect, it } from 'vitest'
import { EASY, RANKS } from '../src/game/balance'
import { riteChance } from '../src/game/progression'
import { riteOdds } from '../src/engine/umbra'

describe('WitchRPG v2 (Easy)', () => {
  it('raises every body: the Rite succeeds for every rank, at any level, executed or not', () => {
    expect(EASY.riteChance).toBe(1)
    for (const rank of Object.keys(RANKS) as (keyof typeof RANKS)[]) {
      for (const [witch, body] of [[1, 1], [10, 19], [30, 1]]) {
        for (const executed of [false, true]) expect(riteOdds(rank, witch, body, 5, executed), `${rank} ${witch} ${body}`).toBe(1)
      }
