import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { ELITE, FAUNA, HYDRA, SPELL, UNITS, WORLD_BOSSES } from '../src/game/balance'
import { riteBlock, riteChance, addShadow, newProfile, impactDamage } from '../src/game/progression'
import { Obstacles } from '../src/engine/obstacles'
import { UnitSystem, type Foe, type UnitHost } from '../src/engine/units'
import { hydraShare } from '../src/world/lair'
import { toWorld } from '../src/world/map'
import { Seal } from '../src/world/seal'

function world() {
  const foe: Foe = { pos: new THREE.Vector3(), radius: 0.38, alive: true }
  const fx: string[] = []
  const host: UnitHost = {
    obstacles: new Obstacles(),
    height: () => 0,
    foe,
    blocked: () => false,
    strikePlayer: () => {},
    strikeUnit: () => {},
    fire: () => {},
    impact: () => {},
    died: () => {},
    summoned: () => {},
    fx: (_u, what) => fx.push(what),
    telegraph: () => {},
    clearTelegraph: () => {},
  }
  const sys = new UnitSystem(host)
  const step = (seconds: number) => {
    for (let i = 0; i < Math.round(seconds * 120); i++) sys.update(1 / 120)
  }
  return { foe, sys, step, fx }
}

describe('the Hydra', () => {
  it('takes every blow in phase 1, and the army does 15% in every phase', () => {
    expect(hydraShare(1, 'melee', false)).toBe(1)
    expect(hydraShare(1, 'bolt', false)).toBe(1)
    expect(HYDRA.armyShare).toBe(0.15)
    expect(hydraShare(1, 'shadow', false)).toBeCloseTo(0.15)
    expect(hydraShare(2, 'shadow', false)).toBeCloseTo(0.15)
    expect(hydraShare(3, 'shadow', false)).toBe(0)
    expect(hydraShare(3, 'shadow', true)).toBeCloseTo(0.225)
  })

  it('phase 2: slimy skin lets bolts do 10% and thrown things 150%', () => {
    expect(hydraShare(2, 'bolt', false)).toBe(HYDRA.boltShare)
    expect(HYDRA.boltShare).toBe(0.1)
    expect(hydraShare(2, 'impact', false)).toBe(1.5)
    expect(hydraShare(2, 'staff', false)).toBe(1.5)
    expect(hydraShare(2, 'melee', false)).toBe(1)
  })

  it('a boulder from the islands hits for about 74 before her Hex, 111 on the slimy skin', () => {
    const hit = impactDamage(HYDRA.rockMass, SPELL.grip.throwSpeed, SPELL.impact.coefficient, SPELL.impact.exponent)
    expect(hit).toBeCloseTo(74.3, 0)
    expect(hit * hydraShare(2, 'impact', false)).toBeCloseTo(111.4, 0)
  })

  it('phase 3: nothing outside Reality Warp, +50% inside it', () => {
    for (const kind of ['melee', 'bolt', 'blast', 'staff', 'impact'] as const) {
      expect(hydraShare(3, kind, false)).toBe(0)
      expect(hydraShare(3, kind, true)).toBe(1.5)
    }
  })

  it('changes phase at two thirds and one third of its life, with five heads', () => {
    expect(HYDRA.phase2At).toBeCloseTo(0.66)
    expect(HYDRA.phase3At).toBeCloseTo(0.33)
    expect(HYDRA.heads).toBe(5)
    expect(HYDRA.lairLevel).toBe(10)
  })

  it('raises as a Marsekal from a 15% base, once, and only with Kebangkitan Marsekal', () => {
    expect(UNITS.hydra.rank).toBe('marsekal')
    const p = newProfile()
    p.level = 8
    expect(riteBlock(p, 'hydra')).not.toBeNull()
    p.level = 10
    expect(riteBlock(p, 'hydra')).toBeNull()
    // the v1 formula: 0.15 + 0.02 x (10 - 12) + 0.01 x 5 = 0.16
    expect(riteChance('marsekal', 10, 12, 5)).toBeCloseTo(0.16, 3)
    addShadow(p, 'hydra', 12)
    expect(riteBlock(p, 'hydra')).not.toBeNull()
  })
})

describe('phase 5 creatures', () => {
  it('makes elites as in v1: tougher, harder, bigger, one trait; Gesit is quicker', () => {
    const w = world()
    const u = w.sys.spawn('minotaur', 'enemy', 10, { x: 0, z: 5 })
    const hp = u.maxHp
    const dmg = u.damage
    u.makeElite('gesit')
    expect(u.maxHp).toBeCloseTo(hp * ELITE.hp)
    expect(u.damage).toBeCloseTo(dmg * ELITE.damage)
    expect(u.scale).toBeCloseTo(ELITE.scale)
    expect(u.tempo).toBe(ELITE.swift.tempo)
    expect(u.radius).toBeCloseTo(UNITS.minotaur.radius * ELITE.scale)
  })

  it('a Phoenix falls to ashes once, rises with half its life, and falls for good the second time', () => {
    const w = world()
    const ph = w.sys.spawn('phoenix', 'enemy', 13, { x: 0, z: 10 })
    w.sys.kill(ph)
    expect(ph.state).toBe('ashes')
    expect(ph.targetable).toBe(false)
    w.step(UNITS.phoenix.rebirth!.ashes + 0.1)
    expect(ph.reborn).toBe(true)
    expect(ph.hp).toBeCloseTo(ph.maxHp * UNITS.phoenix.rebirth!.hp)
    expect(w.fx).toEqual(['ashes', 'reborn'])
    w.sys.kill(ph)
    expect(ph.state).toBe('dead')
  })

  it('an executed Phoenix does not rise again', () => {
    const w = world()
    const ph = w.sys.spawn('phoenix', 'enemy', 13, { x: 0, z: 10 })
    w.sys.kill(ph, true)
    expect(ph.state).toBe('dead')
  })

  it('a Succubus blinks a dozen metres away when she comes close', () => {
    const w = world()
    const s = w.sys.spawn('succubus', 'enemy', 10, { x: 0, z: 2.5 })
    w.step(0.2)
    expect(Math.hypot(s.pos.x, s.pos.z)).toBeGreaterThan(UNITS.succubus.blink!.range - 1)
    expect(w.fx).toContain('blink')
  })

  it('an elite Cyclops raises as a Jenderal', () => {
    expect(UNITS.cyclops.eliteRank).toBe('jenderal')
    expect(UNITS.cyclops.anchored).toBe(true)
    expect(UNITS.cyclops.mass).toBeGreaterThan(500)
  })
})

describe('the open world (phase 7)', () => {
  it('gives every boss of the open world a boss bar, the Marsekal rank and attacks of its own', () => {
    for (const kind of WORLD_BOSSES) {
      expect(UNITS[kind].boss, kind).toBe(true)
      expect(UNITS[kind].rank, kind).toBe('marsekal')
      expect(UNITS[kind].attacks?.length, kind).toBeGreaterThanOrEqual(3)
    }
  })

  it('lets fauna wander and step away from her, never be struck, and never attack', () => {
    const w = world()
    const uni = w.sys.spawn('unicorn', 'enemy', 1, { x: 0, z: 4 })
    uni.home = new THREE.Vector3(0, 0, 4)
    expect(uni.targetable).toBe(false)
    w.step(3)
    expect(Math.hypot(uni.pos.x, uni.pos.z)).toBeGreaterThan(8)
    expect(uni.state).toBe('move')
    for (const kind of FAUNA) expect(UNITS[kind].passive, kind).toBe(true)
  })
})

describe('the seal on zones IV and V', () => {
  const seal = new Seal(false)
  const kuil = toWorld(40, 330)
  const pembuka = toWorld(0, -250)

  it('refuses a step from open ground into Reruntuhan Kuil, but never a step out', () => {
    expect(seal.sealedAt(kuil[0], kuil[1])).toBe(true)
    expect(seal.sealedAt(pembuka[0], pembuka[1])).toBe(false)
    expect(seal.blocks(kuil[0], kuil[1], pembuka[0], pembuka[1])).toBe(true)
    expect(seal.blocks(pembuka[0], pembuka[1], kuil[0], kuil[1])).toBe(false)
    expect(seal.blocks(kuil[0], kuil[1], kuil[0] + 1, kuil[1])).toBe(false)
  })

  it('seals Lembah Bara too, and opens both once broken', () => {
    const [bx, bz] = toWorld(330, 330)
    expect(seal.blocks(bx, bz)).toBe(true)
    const open = new Seal(false)
    open.unlock()
    expect(open.blocks(kuil[0], kuil[1], pembuka[0], pembuka[1])).toBe(false)
    expect(open.blocks(bx, bz)).toBe(false)
  })
})

describe('creature shots', () => {
  it('a volley whose first glob fells her does not trip over the shots her fall cleared', async () => {
    const { Projectiles } = await import('../src/engine/projectiles')
    const w = world()
    const naga = w.sys.spawn('naga', 'enemy', 8, { x: 0, z: 6 })
    const glob = UNITS.naga.attacks!.find((a) => a.shot && a.strike === 'ring')!
    const noop = () => {}
    let falls = 0
    const g = {
      height: () => 0,
      player: { alive: true, pos: { x: 0, y: 0, z: 0 } },
      spells: { inWarp: () => false },
      glow: { emit: noop },
      smoke: { emit: noop },
      sfx: { bolt: noop },
      units: { units: [] },
      clearTelegraph: noop,
      // the blow fells her, and her fall clears every shot in the air
      strikePlayer: () => {
        falls++
        g.player.alive = false
        shots.clear()
      },
    }
    const shots = new Projectiles(g as never)
    naga.aimAt.set(0, 0, 0)
    naga.lungeDir.set(0, 0, -1)
    for (let k = 0; k < 3; k++) shots.fire(naga, glob)
    expect(() => {
      for (let i = 0; i < 240; i++) shots.update(1 / 120)
    }).not.toThrow()
    expect(falls).toBe(1)
    expect(shots.count).toBe(0)
  })
})
