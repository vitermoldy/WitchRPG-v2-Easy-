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
    hit.step(4)
    expect(hit.log.strikes.length).toBeGreaterThan(0)

    const side = world()
    const hound = side.sys.spawn('hellhound', 'enemy', 1, { x: 0, z: 6 })
    let stepped = false
    side.step(1.4, () => {
      // she side-steps the moment the line appears (what a roll does)
      if (hound.state === 'windup' && !stepped) {
        stepped = true
        const across = new THREE.Vector3(hound.lungeDir.z, 0, -hound.lungeDir.x).multiplyScalar(2.5)
        side.foe.pos.add(across)
      }
    })
    expect(stepped).toBe(true)
    expect(side.log.strikes.length).toBe(0)
  })

  it('keeps a camp creature at home until its pack is roused', () => {
    const w = world()
    const imp = w.sys.spawn('imp', 'enemy', 1, { x: 0, z: 10 })
    imp.home = new THREE.Vector3(0, 0, 10)
    imp.aggro = false
    w.step(4)
    expect(imp.pos.distanceTo(new THREE.Vector3(0, 0, 10))).toBeLessThan(3)
    expect(w.log.strikes.length).toBe(0)
    imp.aggro = true
    w.step(4)
    expect(w.log.strikes.length).toBeGreaterThan(0)
  })

  it('staggers a creature whose stun meter fills, and an execution marks the body', () => {
    const w = world()
    const imp = w.sys.spawn('imp', 'enemy', 1, { x: 5, z: 5 })
    w.sys.hurt(imp, 0, { x: 0, z: 0 }, COMBAT.parry.stun)
    expect(imp.state).toBe('stagger')
    w.sys.kill(imp, true)
    expect(imp.executed).toBe(true)
    expect(w.log.died).toContain(imp)
  })
})

describe('ground', () => {
  it('stands every creature and shadow on the ground, wherever the ground is', () => {
    const w = world(5)
    const imp = w.sys.spawn('imp', 'enemy', 1, { x: 0, z: 6 })
    const shadow = w.sys.spawn('hellhound', 'shadow', 1, { x: 3, z: -3 })
    w.step(1.5)
    expect(imp.pos.y).toBeCloseTo(5, 1)
    expect(shadow.pos.y).toBeCloseTo(5, 1)
  })
})

describe('shadows', () => {
  it('fight creatures near her and leave her alone', () => {
    const w = world()
    const enemy = w.sys.spawn('imp', 'enemy', 1, { x: 4, z: 0 })
    enemy.aggro = false
    enemy.home = new THREE.Vector3(4, 0, 0)
    w.sys.spawn('imp', 'shadow', 1, { x: -2, z: 0 })
    w.sys.spawn('imp', 'shadow', 1, { x: 0, z: -2 })
    w.step(8)
    expect(w.log.unitStrikes).toBeGreaterThan(0)
    expect(enemy.alive).toBe(false)
  })

  it('a creature turns on a shadow that is much closer than her', () => {
    const w = world()
    w.foe.pos.set(0, 0, 12)
    const enemy = w.sys.spawn('imp', 'enemy', 1, { x: 0, z: 0 })
    const shadow = w.sys.spawn('hellhound', 'shadow', 1, { x: 2, z: 0 })
    w.step(0.3)
    expect(enemy.target).toBe(shadow)
  })
})

describe('phase 4 creatures', () => {
  it('Centaur looses an arrow even close up, then backs away; from range it keeps shooting', () => {
    const w = world()
    const c = w.sys.spawn('centaur', 'enemy', 4, { x: 0, z: 5 })
    w.step(3)
    expect(w.log.fired).toContain('panah')
    expect(Math.hypot(c.pos.x, c.pos.z)).toBeGreaterThan(7)
    const far = world()
    far.sys.spawn('centaur', 'enemy', 4, { x: 0, z: 18 })
    far.step(4)
    expect(far.log.fired).toContain('panah')
  })

  it('Naga slips under when hurt: out of reach for its dive, then up a few metres away', () => {
    const w = world()
    const n = w.sys.spawn('naga', 'enemy', 7, { x: 0, z: 10 })
    n.aggro = false
    n.home = n.pos.clone()
    const from = n.pos.clone()
    w.sys.hurt(n, 5, { x: 0, z: 0 })
    expect(n.state).toBe('diving')
    expect(n.targetable).toBe(false)
    const hp = n.hp
    expect(w.sys.hurt(n, 999, { x: 0, z: 0 })).toBe(false)
    expect(n.hp).toBe(hp)
    w.step(UNITS.naga.dive! + 0.1)
    expect(n.state).toBe('rising')
    expect(n.pos.distanceTo(from)).toBeGreaterThan(3.5)
  })

  it('Minotaur takes 15% of blows and bolts from in front, all of them from behind, and all of a thrown staff', () => {
    const w = world()
    const m = w.sys.spawn('minotaur', 'enemy', 8, { x: 0, z: 0 })
    m.yaw = 0 // faces +z
    expect(shieldShare(m, 0, 3, 'melee')).toBeCloseTo(0.15, 5)
    expect(shieldShare(m, 0, 3, 'bolt')).toBeCloseTo(0.15, 5)
    expect(shieldShare(m, 0, -3, 'melee')).toBe(1)
    expect(shieldShare(m, 3, 0, 'melee')).toBe(1)
    expect(shieldShare(m, 0, 3, 'staff')).toBe(1)
    expect(shieldShare(m, 0, 3, 'impact')).toBe(1)
    m.set('stagger')
    expect(shieldShare(m, 0, 3, 'melee')).toBe(1)
  })

  it('Chimera breathes fire in front, charges from afar, stings behind', () => {
    const pick = (place: [number, number], faceAway: boolean) => {
      const w = world()
      const c = w.sys.spawn('chimera', 'enemy', 9, { x: place[0], z: place[1] })
      // face her, or turn its back on her
      c.yaw = Math.atan2(-place[0], -place[1]) + (faceAway ? Math.PI : 0)
      c.skillCd = 99
      let used = ''
      w.step(0.6, () => {
        if (!used && c.state === 'windup') used = c.atk.name
        if (faceAway) c.yaw = Math.atan2(-c.pos.x, -c.pos.z) + Math.PI
      })
      return used
    }
    expect(pick([0, 5], false)).toBe('napas api')
    expect(pick([0, 12], false)).toBe('seruduk kambing')
    expect(pick([0, 4], true)).toBe('sengat ular')
  })

  it('Chimera calls Imps while it fights, never more than four standing', () => {
    const w = world()
    const c = w.sys.spawn('chimera', 'enemy', 9, { x: 0, z: 30 })
    c.skillCd = 0
