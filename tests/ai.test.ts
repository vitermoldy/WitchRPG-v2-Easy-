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
