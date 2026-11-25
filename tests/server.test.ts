import { describe, expect, it } from 'vitest'
// @ts-expect-error the server is plain JavaScript without type declarations
import { cleanProfile } from '../server/app.js'
import { FAUNA, V2_KINDS } from '../src/game/balance'
import { ALTARS } from '../src/world/map'
import { SKILLS } from '../src/game/skills'
import { addShadow, newProfile } from '../src/game/progression'

const NOW = Date.parse('2026-11-26T00:00:00Z')

