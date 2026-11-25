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
