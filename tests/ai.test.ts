import fs from 'node:fs'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { UNITS, V2_KINDS } from '../src/game/balance'
import { clipRoles } from '../src/engine/rigs'

const table = JSON.parse(fs.readFileSync(new URL('../previz/blender/ai-models.json', import.meta.url), 'utf8')) as Record<string, { key: string; rig: string }>
