import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { COMBAT, UNITS } from '../src/game/balance'
import { Obstacles } from '../src/engine/obstacles'
import { RING_RADIUS, shieldShare, Unit, UnitSystem, type Foe, type UnitHost } from '../src/engine/units'

/** A flat empty clearing with her standing still at the origin. */
function world(groundHeight = 0) {
  const foe: Foe = { pos: new THREE.Vector3(0, 0, 0), radius: 0.38, alive: true }
  const log = { strikes: [] as { u: Unit; t: number }[], unitStrikes: 0, telegraphs: 0, died: [] as Unit[], fired: [] as string[], summoned: 0 }
  let time = 0
  const host: UnitHost = {
    obstacles: new Obstacles(),
    height: () => groundHeight,
    foe,
    blocked: () => false,
    strikePlayer: (u) => log.strikes.push({ u, t: time }),
    strikeUnit: (u, target) => {
      log.unitStrikes++
      sys.hurt(target, u.damage, u.pos)
    },
    impact: () => {},
    fire: (_u, atk) => log.fired.push(atk.name),
    summoned: () => log.summoned++,
    fx: () => {},
    died: (u) => log.died.push(u),
    telegraph: () => log.telegraphs++,
    clearTelegraph: () => {},
  }
  const sys = new UnitSystem(host)
  const step = (seconds: number, each?: () => void) => {
    const dt = 1 / 120
    for (let i = 0; i < Math.round(seconds / dt); i++) {
      time += dt
      each?.()
      sys.update(dt)
    }
  }
  return { foe, log, sys, step, now: () => time }
}

describe('creature attacks', () => {
  it('lands an Imp ring blow exactly when its windup and leap are over', () => {
    const w = world()
    const imp = w.sys.spawn('imp', 'enemy', 1, { x: 0, z: 2 })
    let started = -1
    w.step(3, () => {
      if (started < 0 && imp.state === 'windup') started = w.now()
    })
    expect(started).toBeGreaterThan(0)
    expect(w.log.strikes.length).toBeGreaterThan(0)
    const lag = w.log.strikes[0].t - started
    expect(lag).toBeCloseTo(UNITS.imp.windup + (UNITS.imp.lungeTime ?? 0), 1)
  })

  it('misses when she leaves the amber circle before it fills', () => {
    const w = world()
    const imp = w.sys.spawn('imp', 'enemy', 1, { x: 0, z: 2 })
    let moved = false
    w.step(1.2, () => {
      // as soon as it crouches she walks out of the circle
      if (imp.state === 'windup' && !moved) {
        moved = true
        w.foe.pos.set(RING_RADIUS + 3, 0, -3)
      }
    })
    expect(moved).toBe(true)
    expect(w.log.strikes.length).toBe(0)
  })

  it('lets at most two creatures attack her at once; the rest circle', () => {
    const w = world()
    for (let i = 0; i < 8; i++) w.sys.spawn('imp', 'enemy', 1, { x: Math.cos(i) * 3, z: Math.sin(i) * 3 })
    let most = 0
    w.step(6, () => {
      const busy = w.sys.units.filter((u) => u.state === 'windup' || u.state === 'strike').length
      most = Math.max(most, busy)
      expect(w.sys.tokens()).toBeLessThanOrEqual(COMBAT.attackers)
    })
    expect(most).toBeLessThanOrEqual(COMBAT.attackers)
    expect(most).toBeGreaterThan(0)
  })

  it('sends a Hellhound along its line: in the line she is hit, beside it she is not', () => {
    const hit = world()
    hit.sys.spawn('hellhound', 'enemy', 1, { x: 0, z: 6 })
