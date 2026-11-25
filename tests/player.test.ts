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
    expect(p.dodges).toBe(0)
  })
})

describe('Ilyra on foot', () => {
  it('moves the way the camera looks', () => {
    const p = new Player()
    run(p, { ...idle, y: 1 }, 1)
    // camera yaw 0 looks north (-z)
    expect(p.pos.z).toBeLessThan(-3.5)
    expect(Math.abs(p.pos.x)).toBeLessThan(1e-6)
    const q = new Player()
    run(q, { ...idle, x: 1 }, 1, flat, Math.PI / 2)
    // camera turned left to face west: its right is north
    expect(q.pos.z).toBeLessThan(-3.5)
  })

  it('jogs at 4.4 m/s and sprints at 7 m/s', () => {
    const p = new Player()
    run(p, { ...idle, y: 1 }, 2)
    expect(p.speed).toBeCloseTo(MOVE.jog, 1)
    run(p, { ...idle, y: 1, sprint: true }, 2)
    expect(p.speed).toBeCloseTo(MOVE.sprint, 1)
  })

  it('rolls 4.2 m in 0.42 s, untouchable from 0.04 s to 0.32 s', () => {
    const p = new Player()
    const dt = 1 / 240
    const seen: [number, boolean][] = []
    p.update(dt, { ...idle, x: 1, dodge: true }, 0, null, false, flat)
    while (p.dodging) {
      seen.push([p.dodgeT, p.invulnerable])
      p.update(dt, { ...idle, x: 1 }, 0, null, false, flat)
    }
    expect(p.pos.x).toBeGreaterThan(MOVE.dodge.distance * 0.95)
    expect(p.pos.x).toBeLessThan(MOVE.dodge.distance * 1.08)
    for (const [t, inv] of seen) {
      expect(inv).toBe(t >= MOVE.dodge.iframeStart && t <= MOVE.dodge.iframeEnd)
    }
    expect(seen.some(([, inv]) => inv)).toBe(true)
  })

  it('steps back when she rolls with no direction held', () => {
    const p = new Player()
    p.facing = 0
    run(p, { ...idle, dodge: true }, 0.6)
    // facing north, a backstep goes south (+z)
    expect(p.pos.z).toBeGreaterThan(3.5)
  })

  it('waits out the cooldown before the next roll', () => {
    const p = new Player()
    p.update(1 / 120, { ...idle, dodge: true }, 0, null, false, flat)
    let t = 0
    while (p.dodging) {
      p.update(1 / 120, idle, 0, null, false, flat)
      t += 1 / 120
    }
    p.update(1 / 120, { ...idle, dodge: true }, 0, null, false, flat)
    expect(p.dodging).toBe(false)
    expect(p.dodges).toBe(1)
  })

  it('cannot walk up a cliff or into deep water', () => {
    const cliff: Ground = { height: (_x, z) => (z < -2 ? 30 : 0), obstacles: null, blocked: () => false }
    const p = new Player()
    run(p, { ...idle, y: 1 }, 2, cliff)
    expect(p.pos.z).toBeGreaterThan(-2.1)
    expect(p.pos.y).toBe(0)
    const lake: Ground = { height: () => 0, obstacles: null, blocked: (_x, z) => z < -3 }
    const q = new Player()
    run(q, { ...idle, y: 1 }, 2, lake)
    expect(q.pos.z).toBeGreaterThan(-3.01)
  })

  it('is pushed out of a trunk instead of walking through it', () => {
    const obs = new Obstacles()
    obs.add({ kind: CYL, x: 0, y: 0, z: -3, r: 0.4, h: 10, camOnly: false })
    const g: Ground = { ...flat, obstacles: obs }
    const p = new Player()
    run(p, { ...idle, y: 1 }, 3, g)
    expect(Math.hypot(p.pos.x, p.pos.z + 3)).toBeGreaterThanOrEqual(0.4 + MOVE.radius - 1e-6)
  })

  it('walks through a crown, which only blocks the camera', () => {
    const obs = new Obstacles()
    obs.add({ kind: CYL, x: 0, y: 0, z: -3, r: 2, h: 10, camOnly: true })
    const p = new Player()
    run(p, { ...idle, y: 1 }, 2, { ...flat, obstacles: obs })
    expect(p.pos.z).toBeLessThan(-5)
  })
})
