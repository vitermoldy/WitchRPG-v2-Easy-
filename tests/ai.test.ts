import fs from 'node:fs'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { UNITS, V2_KINDS } from '../src/game/balance'
import { clipRoles } from '../src/engine/rigs'

const table = JSON.parse(fs.readFileSync(new URL('../previz/blender/ai-models.json', import.meta.url), 'utf8')) as Record<string, { key: string; rig: string }>
const files = Object.entries(table).filter(([name]) => name.endsWith('.glb'))

describe('models from the image-to-3D tool (owner, 28 Nov 2026)', () => {
  it('names a file for each of the 27 creatures the owner makes, each a creature of the game, none twice', () => {
    expect(files.length).toBe(27)
    const keys = files.map(([, v]) => v.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const [name, v] of files) {
      expect(name, name).toMatch(/^monster_[a-z_]+\.glb$/)
      expect(V2_KINDS as readonly string[], name).toContain(v.key)
      expect(['tool', 'blender'], name).toContain(v.rig)
    }
    // the odd shapes the owner sends without bones
    const plain = files.filter(([, v]) => v.rig === 'blender').map(([, v]) => v.key).sort()
    expect(plain).toEqual(['aries', 'asmodeus', 'buer', 'duyung', 'marinus', 'raia', 'septiceps', 'sirena', 'sylph'])
  })

  it('sorts clips into roles by the names tools give them, and falls back to idle', () => {
    const clip = (name: string) => new THREE.AnimationClip(name, 1, [])
    const roles = clipRoles([clip('Armature|Idle'), clip('Walking'), clip('Punch_Attack'), clip('Hit Reaction'), clip('Dying')])
    expect(roles.idle?.name).toBe('Armature|Idle')
    expect(roles.walk?.name).toBe('Walking')
    expect(roles.attack?.name).toBe('Punch_Attack')
    expect(roles.hit?.name).toBe('Hit Reaction')
    expect(roles.die?.name).toBe('Dying')
    expect(clipRoles([clip('Take 001')]).idle?.name).toBe('Take 001')
