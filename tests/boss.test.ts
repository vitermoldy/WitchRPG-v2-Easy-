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
