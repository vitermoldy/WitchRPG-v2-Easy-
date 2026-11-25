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
    const raisable = V2_KINDS.filter((k) => !(FAUNA as readonly string[]).includes(k))
    for (const kind of raisable) addShadow(p, kind, 5)
    for (const s of SKILLS) p.upgrades[s.id] = true
    p.world = { altars: ALTARS.map((a) => a.key), last: 'bara' }
    const c = cleanProfile(p, NOW)
    expect(c.error).toBeUndefined()
    expect(c.shadows.map((s: { kind: string }) => s.kind)).toEqual(raisable)
    expect(c.upgrades.sort()).toEqual(SKILLS.map((s) => s.id).sort())
    expect(c.world.altars.sort()).toEqual(ALTARS.map((a) => a.key).sort())
    expect(c.world.last).toBe('bara')
  })

  it('refuses numbers out of bounds, unknown shadows and duplicate ids', () => {
    expect(cleanProfile({ ...newProfile(), level: 31 }, NOW).error).toBeTruthy()
    expect(cleanProfile({ ...newProfile(), stats: { hex: 0, spr: 5, vit: 5, agi: 5, umb: 5 } }, NOW).error).toBeTruthy()
    const p = newProfile()
    p.shadows.push({ id: 1, name: 'Palsu', kind: 'unicorn' as never, rank: 'marsekal', level: 1, xp: 0 })
    expect(cleanProfile(p, NOW).error).toBeTruthy()
    const q = newProfile()
    addShadow(q, 'imp', 1)
    q.shadows.push({ ...q.shadows[0] })
    expect(cleanProfile(q, NOW).error).toBeTruthy()
    expect(cleanProfile({ version: 2 }, NOW).error).toBeTruthy()
  })

  it('drops unknown altars, keeps the start altar lit, and falls back when the last one is not lit', () => {
    const p = { ...newProfile(), world: { altars: ['tebing', 'nowhere'], last: 'kuil' } }
    const c = cleanProfile(p, NOW)
    expect(c.world.altars).toEqual(['pembuka', 'tebing'])
    expect(c.world.last).toBe('pembuka')
  })

  it('keeps settings in range and a clock far ahead from locking later saves out', () => {
    const p = { ...newProfile(), settings: { sensitivity: 9, volume: -1, headBob: true, shake: false, detail: 500, firstPerson: true }, updatedAt: '2030-01-01T00:00:00Z' }
    const c = cleanProfile(p, NOW)
    expect(c.settings).toEqual({ sensitivity: 2.5, volume: 0, headBob: true, shake: false, detail: 120, firstPerson: true })
    expect(c.updatedAt.getTime()).toBe(NOW + 60_000)
  })
})
