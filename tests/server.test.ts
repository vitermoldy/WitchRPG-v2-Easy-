import { describe, expect, it } from 'vitest'
// @ts-expect-error the server is plain JavaScript without type declarations
import { cleanProfile } from '../server/app.js'
import { FAUNA, V2_KINDS } from '../src/game/balance'
import { ALTARS } from '../src/world/map'
import { SKILLS } from '../src/game/skills'
import { addShadow, newProfile } from '../src/game/progression'

const NOW = Date.parse('2026-11-26T00:00:00Z')

describe('the server checks a witch before it keeps her', () => {
  it('takes a fresh witch as she is', () => {
    const p = cleanProfile({ ...newProfile(), updatedAt: '2026-11-25T10:00:00Z' }, NOW)
    expect(p.error).toBeUndefined()
    expect(p.level).toBe(1)
    expect(p.world).toEqual({ altars: ['pembuka'], last: 'pembuka' })
    expect(p.settings.detail).toBe(20)
  })

  it('knows every creature that can be raised, every skill and every altar of the game', () => {
    const p = newProfile()
    p.level = 12
