import { randomInt } from 'node:crypto'
import express from 'express'
import { createAuth } from './auth.js'

/**
 * The API:
 *   GET  /api/health
 *   /api/auth/...                     register, login, logout, me (see auth.js)
 *   GET  /api/profile                 the account's witch, or { profile: null } before the first save
 *   PUT  /api/profile  { profile }    save the witch; an older copy than the stored one is refused
 * Everything but health and auth needs a signed-in account. Each account files its data under one
 * 12-character code (`clients.id`, `users.device_id`); the browser never chooses it.
 */

const CODE = /^[A-HJ-NP-Z2-9]{12}$/
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const newCode = () => Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')

// Mirrors src/game and src/world: skill ids, creature kinds that can be raised, ranks, stats, altars.
const SKILLS = new Set(['hexBolt', 'grip', 'burst', 'snare', 'barrier', 'warp', 'rite', 'swap', 'focus', 'general', 'marshal'])
// fauna (pegasus, unicorn) is never raised, so it is not here
const KINDS = new Set(['imp', 'hellhound', 'harpy', 'centaur', 'naga', 'minotaur', 'medusa', 'chimera', 'cyclops', 'succubus', 'incubus', 'phoenix', 'hydra', 'griffin', 'hippogriff', 'cerberus', 'lilith', 'dragon', 'typhon', 'samael', 'atlas'])
const RANKS = new Set(['prajurit', 'ksatria', 'jenderal', 'marsekal'])
const STATS = ['hex', 'spr', 'vit', 'agi', 'umb']
const ALTARS = new Set(['pembuka', 'simpang', 'tebing', 'rawa', 'danau', 'kuil', 'bara'])
const MAX_LEVEL = 30
const MAX_SHADOWS = 2000

/** Writes come as JSON from this site only: no form posts, no other origin. */
function sameOriginWrites(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD') return next()
  if (!req.is('application/json')) return res.status(415).json({ error: 'Kirim data sebagai JSON.' })
  const origin = req.headers.origin
  if (origin && req.headers.host && new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'Asal permintaan tidak dikenal.' })
  next()
}

/** At most `limit` writes per minute per address. */
function rateLimit(limit) {
  const hits = new Map()
  return (req, res, next) => {
    if (req.method === 'GET') return next()
    const now = Date.now()
    const key = req.ip ?? 'unknown'
    const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000)
    recent.push(now)
    hits.set(key, recent)
    if (hits.size > 5000) hits.clear()
    if (recent.length > limit) return res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' })
    next()
  }
}

const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null)
const num = (v, lo, hi, fallback) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback)

/** Checks a witch from the browser; returns what to store or a reason. */
export function cleanProfile(p, now = Date.now()) {
  if (!p || typeof p !== 'object' || p.version !== 1) return { error: 'Data witch tidak dikenali.' }
  const level = int(p.level, 1, MAX_LEVEL)
  const xp = int(p.xp, 0, 10_000_000)
  const statPoints = int(p.statPoints, 0, 1000)
  const skillPoints = int(p.skillPoints, 0, 1000)
  const nextShadowId = int(p.nextShadowId, 1, 1_000_000)
  const bossKills = int(p.bossKills ?? 0, 0, 1_000_000)
  if ([level, xp, statPoints, skillPoints, nextShadowId, bossKills].includes(null)) return { error: 'Angka witch di luar batas.' }
  const stats = {}
  for (const k of STATS) {
    stats[k] = int(p.stats?.[k], 1, 999)
    if (stats[k] === null) return { error: `Stat ${k} di luar batas.` }
  }
  const upgrades = Object.keys(p.upgrades ?? {}).filter((k) => p.upgrades[k] === true && SKILLS.has(k))
  if (!Array.isArray(p.shadows) || p.shadows.length > MAX_SHADOWS) return { error: 'Daftar bayangan tidak sah.' }
  const seen = new Set()
  const shadows = []
  for (const s of p.shadows) {
    const id = int(s?.id, 1, 1_000_000)
    const lv = int(s?.level, 1, MAX_LEVEL)
    const sxp = int(s?.xp, 0, 10_000_000)
    if (id === null || lv === null || sxp === null || seen.has(id)) return { error: 'Data bayangan tidak sah.' }
    if (!KINDS.has(s.kind) || !RANKS.has(s.rank) || typeof s.name !== 'string' || !/^[A-Za-z]{2,24}$/.test(s.name)) return { error: 'Data bayangan tidak sah.' }
    seen.add(id)
    shadows.push({ id, name: s.name, kind: s.kind, rank: s.rank, level: lv, xp: sxp })
  }
  // Altars she has lit: unknown keys are dropped; the start altar is always lit.
  const lit = Array.isArray(p.world?.altars) ? p.world.altars.filter((a) => ALTARS.has(a)) : []
  const altars = [...new Set(['pembuka', ...lit])]
  const last = altars.includes(p.world?.last) ? p.world.last : 'pembuka'
  const st = p.settings ?? {}
  const settings = {
    sensitivity: num(st.sensitivity, 0.3, 2.5, 1),
    volume: num(st.volume, 0, 1, 0.7),
    headBob: st.headBob !== false,
    shake: st.shake !== false,
    detail: Math.round(num(st.detail, 10, 120, 20)),
    firstPerson: st.firstPerson === true,
  }
  // A clock a little ahead is fine; a date far in the future would lock every later save out.
  let updated = Date.parse(p.updatedAt)
  if (!Number.isFinite(updated)) updated = now
  updated = Math.min(updated, now + 60_000)
  return { level, xp, statPoints, skillPoints, nextShadowId, bossKills, stats, upgrades, shadows, world: { altars, last }, settings, updatedAt: new Date(updated) }
}

/** The pool appears once MySQL answers; until then the API says so instead of hanging. */
export function createApi(getPool, database) {
  const api = express.Router()
  // A full Shadow Room (2000 records) is about 200 KB of JSON.
  api.use(express.json({ limit: '1mb' }))
  api.use(sameOriginWrites)
  api.use(rateLimit(120))
  api.get('/health', (_req, res) => res.status(getPool() ? 200 : 503).json({ ok: !!getPool(), database }))
  api.use((req, res, next) => (getPool() ? next() : res.status(503).json({ error: 'Database belum terhubung.' })))

  // v1 uses witch_rpg_session and v2 witch_rpg_v2_session; every app on localhost shares cookies, so the name must differ.
  const auth = createAuth({ getPool, cookie: 'witch_rpg_v2_easy_session', lang: 'id', deviceCode: CODE, newDevice: newCode })
  api.use('/auth', auth.router)
  api.use(auth.requireUser)

  const touch = (db, client) => db.query('INSERT INTO clients (id) VALUES (?) ON DUPLICATE KEY UPDATE last_seen = CURRENT_TIMESTAMP', [client])

  /** The stored witch in the same shape as the browser's Profile, or null. */
  async function readProfile(db, client) {
    const [[w]] = await db.query('SELECT * FROM witches WHERE client_id = ?', [client])
    if (!w) return null
    const [ups] = await db.query('SELECT skill FROM witch_upgrades WHERE client_id = ?', [client])
    const [sh] = await db.query('SELECT shadow_id, name, kind, `rank`, level, xp FROM shadows WHERE client_id = ? ORDER BY slot', [client])
    const [al] = await db.query('SELECT altar, last FROM witch_altars WHERE client_id = ?', [client])
    const altars = al.length ? al.map((a) => a.altar) : ['pembuka']
    return {
      version: 1,
      level: w.level,
      xp: w.xp,
      statPoints: w.stat_points,
      skillPoints: w.skill_points,
      stats: { hex: w.hex, spr: w.spr, vit: w.vit, agi: w.agi, umb: w.umb },
      upgrades: Object.fromEntries(ups.map((u) => [u.skill, true])),
      shadows: sh.map((s) => ({ id: s.shadow_id, name: s.name, kind: s.kind, rank: s.rank, level: s.level, xp: s.xp })),
      nextShadowId: w.next_shadow_id,
      bossKills: w.boss_kills,
      settings: typeof w.settings === 'string' ? JSON.parse(w.settings) : w.settings,
      world: { altars, last: al.find((a) => a.last)?.altar ?? 'pembuka' },
      updatedAt: new Date(w.updated_at).toISOString(),
    }
  }

  api.get('/profile', async (req, res) => {
    res.json({ profile: await readProfile(getPool(), req.user.device) })
  })

  api.put('/profile', async (req, res) => {
    const client = req.user.device
    const p = cleanProfile(req.body?.profile)
    if (p.error) return res.status(400).json({ error: p.error })
    const conn = await getPool().getConnection()
    try {
      await conn.beginTransaction()
      await touch(conn, client)
      const [[cur]] = await conn.query('SELECT updated_at FROM witches WHERE client_id = ? FOR UPDATE', [client])
      // Two browsers on one account: the newer save wins, the older one gets the stored copy back.
      if (cur && new Date(cur.updated_at).getTime() > p.updatedAt.getTime()) {
        await conn.rollback()
        return res.json({ stale: true, profile: await readProfile(getPool(), client) })
      }
      await conn.query(
        `INSERT INTO witches (client_id, level, xp, stat_points, skill_points, hex, spr, vit, agi, umb, next_shadow_id, boss_kills, settings, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE level = VALUES(level), xp = VALUES(xp), stat_points = VALUES(stat_points), skill_points = VALUES(skill_points),
           hex = VALUES(hex), spr = VALUES(spr), vit = VALUES(vit), agi = VALUES(agi), umb = VALUES(umb),
           next_shadow_id = VALUES(next_shadow_id), boss_kills = VALUES(boss_kills), settings = VALUES(settings), updated_at = VALUES(updated_at)`,
        [client, p.level, p.xp, p.statPoints, p.skillPoints, p.stats.hex, p.stats.spr, p.stats.vit, p.stats.agi, p.stats.umb, p.nextShadowId, p.bossKills, JSON.stringify(p.settings), p.updatedAt],
      )
      await conn.query('DELETE FROM witch_upgrades WHERE client_id = ?', [client])
      if (p.upgrades.length) await conn.query('INSERT INTO witch_upgrades (client_id, skill) VALUES ?', [p.upgrades.map((s) => [client, s])])
      await conn.query('DELETE FROM shadows WHERE client_id = ?', [client])
      if (p.shadows.length) {
        await conn.query('INSERT INTO shadows (client_id, shadow_id, name, kind, `rank`, level, xp, slot) VALUES ?', [
          p.shadows.map((s, i) => [client, s.id, s.name, s.kind, s.rank, s.level, s.xp, i]),
        ])
      }
      await conn.query('DELETE FROM witch_altars WHERE client_id = ?', [client])
