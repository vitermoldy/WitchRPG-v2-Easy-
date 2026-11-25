import { describe, expect, it } from 'vitest'
import { MOVE } from '../src/game/balance'
import { CYL, Obstacles } from '../src/engine/obstacles'
import { Player, type Ground, type MoveInput } from '../src/engine/player'

const idle: MoveInput = { x: 0, y: 0, sprint: false, dodge: false }
const flat: Ground = { height: () => 0, obstacles: null, blocked: () => false }

function run(p: Player, input: MoveInput, seconds: number, g = flat, camYaw = 0) {
  const dt = 1 / 120
  for (let t = 0; t < seconds; t += dt) {
    p.update(dt, input, camYaw, null, false, g)
    input = { ...input, dodge: false }
  }
}

describe('Ilyra in the air (B)', () => {
  const B: MoveInput = { ...idle, fly: true }
  it('takes off, climbs 8 m/s, and stops at the ceiling 40 m over the ground', () => {
    const p = new Player()
    run(p, B, 1 / 120)
    expect(p.flying).toBe(true)
    run(p, { ...idle, rise: 1 }, 2)
    expect(p.pos.y).toBeGreaterThan(12)
    expect(p.pos.y).toBeLessThan(17)
    run(p, { ...idle, rise: 1 }, 8)
    expect(p.pos.y).toBeCloseTo(MOVE.fly.ceiling, 3)
  })

  it('flies 13 m/s, and 26 with Shift', () => {
    const p = new Player()
    run(p, B, 1 / 120)
    run(p, { ...idle, y: 1 }, 2)
    expect(p.speed).toBeCloseTo(MOVE.fly.speed, 0)
    run(p, { ...idle, y: 1, sprint: true }, 2)
    expect(p.speed).toBeCloseTo(MOVE.fly.boost, 0)
  })

  it('crosses deep water, refuses to land on it, and lands when she sinks onto ground she can stand on', () => {
    const lake: Ground = { height: () => -6, floor: () => 0.3, obstacles: null, blocked: (_x, _z, _fx, _fz, air) => !air }
    const p = new Player()
    run(p, B, 1 / 120, lake)
    run(p, { ...idle, rise: 1 }, 1, lake)
    run(p, { ...idle, y: 1 }, 1, lake)
    expect(p.pos.z).toBeLessThan(-5)
    run(p, B, 1 / 120, lake)
    expect(p.flying).toBe(true)
    expect(p.landRefused).toBe(true)
    run(p, { ...idle, rise: -1 }, 4, lake)
    // she sinks no lower than the water, and stays in the air
    expect(p.pos.y).toBeCloseTo(0.3, 3)
    expect(p.flying).toBe(true)
    run(p, { ...idle, rise: -1 }, 4)
    expect(p.flying).toBe(false)
  })

  it('does not roll in the air', () => {
    const p = new Player()
    run(p, B, 1 / 120)
    run(p, { ...idle, dodge: true }, 0.2)
