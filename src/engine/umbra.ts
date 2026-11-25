import * as THREE from 'three'
import { EASY, RANKS, RITE, UNITS } from '../game/balance'
import { addShadow, hasUpgrade, isUnlocked, riteBlock, riteChance, type ShadowRecord } from '../game/progression'
import type { Game } from './game'
import { COLOR } from './palette'
import type { Unit } from './units'

/** A creature's rank for the Rite: an elite Cyclops counts as a Jenderal. */
/** Easy: every body rises. The v1 formula (riteChance) is kept, locked by its tests, and never wins. */
export const riteOdds = (...args: Parameters<typeof riteChance>) => Math.max(EASY.riteChance, riteChance(...args))

export const rankOf = (u: Unit) => (u.elite && u.spec.eliteRank ? u.spec.eliteRank : u.spec.rank)

export type WheelChoice = 'follow' | 'attack' | 'hold' | 'swap'

export interface UmbraInput {
  riteHeld: boolean
  ritePressed: boolean
  toggle: boolean
  wheelHeld: boolean
  wheelPressed: boolean
  dx: number
  dy: number
}

/** Soldiers of one call that each get their own pool; the rest rise out of the wide spill. */
const POOLS_PER_CALL = 90
/** Shadows further than this from her (and not holding a spot) are pulled back to her side. */
const LEASH = 45

/** How far from her the outer rank of an army this big stands (see the formation). */
function ringRadius(count: number) {
  let ring = 0
  let left = count
  while (left > 8 + ring * 4) {
    left -= 8 + ring * 4
    ring++
  }
  return 3.4 + ring * 1.8
}

interface Call {
  at: number
  rec: ShadowRecord
  pos: THREE.Vector3
  slot: number
}

/**
 * Umbra Rite (raising the fallen, one body or every glowing body in reach), the Shadow Room
 * (unlimited), calling the army out with T and sending it back with T, and orders for the army.
 * Ported from v1; the aim comes from the shoulder camera, and an executed body is easier to raise.
 */
export class Umbra {
  private readonly g: Game
  candidate: Unit | null = null
  /** Every body the next cast would raise: the one being looked at, or all glowing ones in reach. */
  targets: Unit[] = []
  casting: Unit[] = []
  progress = 0
  swapCd = 0
  summonCd = 0
  wheelOpen = false
  wheelChoice: WheelChoice | null = null
  /** The army has been called and not sent back: shadows that reform rise again by themselves. */
  armyOut = false
  readonly stats = { casts: 0, raised: 0, faded: 0 }
  private wheelX = 0
  private wheelY = 0
  private chargeTick = 0
  private leashT = 0
  /** Game seconds; fallen shadows reform against this clock. */
  private time = 0
  /** Fallen shadows and when they can be called again. */
  readonly downUntil = new Map<number, number>()
  private calls: Call[] = []
  private readonly glowColor = new THREE.Color()
  private readonly spotV = new THREE.Vector3()

  constructor(g: Game) {
    this.g = g
    g.units.spotOf = (u) => this.spot(u.slot, this.spotV)
  }

  reset() {
    this.candidate = null
    this.targets = []
    this.casting = []
    this.progress = 0
    this.wheelOpen = false
    this.calls = []
    this.armyOut = false
  }

  get riteOpen() {
    return isUnlocked(this.g.profile, 'rite')
  }

  /** Shadows standing on the field (rising ones included, sinking ones not). */
  field(): Unit[] {
    return this.g.units.units.filter((u) => u.team === 'shadow' && u.record && u.alive && u.state !== 'sinking')
  }

  /** Records that could be called right now: not out, not reforming. */
  ready(): ShadowRecord[] {
    const out = new Set(this.g.units.units.filter((u) => u.team === 'shadow' && u.record).map((u) => u.record!.id))
    const pending = new Set(this.calls.map((c) => c.rec.id))
    return this.g.profile.shadows.filter((s) => !out.has(s.id) && !pending.has(s.id) && (this.downUntil.get(s.id) ?? 0) <= this.time)
  }

  reforming(): { count: number; next: number } {
    let count = 0
    let next = Infinity
    for (const [, at] of this.downUntil) {
      if (at > this.time) {
        count++
        next = Math.min(next, at - this.time)
      }
    }
    return { count, next: Number.isFinite(next) ? Math.ceil(next) : 0 }
  }

  /** Formation spot for slot `i`: rings behind her, 8 in the first, 4 more per ring. */
  spot(i: number, out = new THREE.Vector3()): THREE.Vector3 {
    const p = this.g.player
    let ring = 0
    let index = i
    while (index >= 8 + ring * 4) {
      index -= 8 + ring * 4
      ring++
    }
    const inRing = 8 + ring * 4
    const spread = Math.min(Math.PI * 1.6, 0.55 * inRing)
    // behind her: her yaw faces -z at 0, so behind is +sin/+cos
    const a = p.facing + (index - (inRing - 1) / 2) * (spread / inRing)
    const d = 3.4 + ring * 1.8
    out.set(p.pos.x + Math.sin(a) * d, 0, p.pos.z + Math.cos(a) * d)
    out.y = this.g.ground.height(out.x, out.z)
    return out
  }

  /** T: call the whole army out of the Shadow Room, or send all of it back. */
  toggle() {
    if (this.summonCd > 0) return
    if (this.armyOut || this.field().length || this.calls.length) this.dismiss()
    else this.summon()
    this.summonCd = RITE.summonCooldown
  }

  private feet() {
    const p = this.g.player.pos
    return new THREE.Vector3(p.x, this.g.ground.height(p.x, p.z), p.z)
  }

  /**
   * The call: darkness spills out from under her, a pool opens at every soldier's place in the
   * formation, they rise out of it from the inner ranks outward.
   */
  summon() {
    const g = this.g
    const ready = this.ready()
    if (!g.profile.shadows.length) {
      g.hud.message(this.riteOpen ? 'Ruang Bayangan masih kosong. Bangkitkan musuh yang kalah dengan Tahan R.' : 'Ruang Bayangan masih kosong. Umbra Rite terbuka di Lv 2.', 'umbra')
      return
    }
    if (!ready.length) {
      const r = this.reforming()
      g.hud.message(r.count ? `Semua bayangan sedang terbentuk kembali. Yang pertama siap dalam ${r.next} detik.` : 'Tidak ada bayangan yang bisa dipanggil.', 'umbra')
      return
    }
    // strongest first: Marsekal, Jenderal, Ksatria, then by level
    const order = { marsekal: 0, jenderal: 1, ksatria: 2, prajurit: 3 }
    const pick = [...ready].sort((a, b) => order[a.rank] - order[b.rank] || b.level - a.level)
    const n = pick.length
    this.armyOut = true
    const feet = this.feet()
    const base = this.field().length
    // the darkness spreads as far as the outer rank stands; a big army rises within about 2.5 seconds
    const spill = Math.min(60, Math.max(5 + Math.sqrt(n) * 2.4, ringRadius(base + n) + 3))
    const stagger = Math.min(0.06, 2.2 / Math.max(1, n))
    g.pools.open(feet, spill, 1.4 + n * stagger)
    g.pools.open(feet, spill * 0.45, 1.6 + n * stagger, 0.1)
    for (let i = 0; i < n; i++) {
      const pos = this.spot(base + i)
      this.calls.push({ at: this.time + 0.35 + i * stagger, rec: pick[i], pos, slot: base + i })
      if (i < POOLS_PER_CALL) g.pools.open(pos, 0.9 + UNITS[pick[i].kind].radius * 1.6, 1.4, 0.3 + i * stagger)
    }
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2
      g.smoke.emit({ pos: { x: feet.x + Math.cos(a) * spill * 0.8, y: feet.y + 0.2, z: feet.z + Math.sin(a) * spill * 0.8 }, count: 1, color: 0x0c0614, life: 1.6, size: 1.6, sizeEnd: 2.8, vel: { x: Math.cos(a) * 1.5, y: 1.2, z: Math.sin(a) * 1.5 }, alpha: 0.75 })
    }
    g.addTrauma(0.35)
    g.lights.flash(feet.clone().setY(feet.y + 2), COLOR.umbra, 30, spill * 1.5, 1.2)
    g.hud.umbraPulse()
    g.sfx.summon(n)
    const later = this.reforming().count
    g.hud.message(later ? `${n} bayangan dipanggil. ${later} lainnya menyusul setelah terbentuk kembali.` : `${n} bayangan dipanggil, seluruh Ruang Bayangan.`, 'umbra')
  }

  /** T again: every shadow on the field sinks into a pool and the darkness pulls back under her. */
  dismiss(quiet = false) {
    const g = this.g
    const out = this.field()
    this.calls = []
    this.armyOut = false
    if (!out.length) return
    out.forEach((u, i) => {
      if (i < POOLS_PER_CALL) g.pools.open(u.pos, 0.9 + u.radius * 1.6, 0.6)
      u.set('sinking')
      u.vel.set(0, 0, 0)
    })
    const feet = this.feet()
    g.pools.open(feet, Math.min(60, Math.max(4 + Math.sqrt(out.length) * 1.8, out.length > POOLS_PER_CALL ? ringRadius(out.length) + 3 : 0)), 0.7, 0.4)
    if (quiet) return
    g.sfx.dismiss()
    g.hud.message(`${out.length} bayangan kembali ke Ruang Bayangan.`, 'umbra')
  }

  private spawnShadow(rec: ShadowRecord, at: THREE.Vector3, slot: number) {
    const g = this.g
    const u = g.units.spawn(rec.kind, 'shadow', rec.level, at, true)
    u.record = rec
    u.slot = slot
    u.yaw = g.player.facing + Math.PI
    u.focusBonus = hasUpgrade(g.profile, 'focus') ? RITE.focusBonus : 0
    // the shadow Hydra walks with the army at a size that fits among the soldiers
    if (rec.kind === 'hydra') u.setScale(0.4)
    if (rec.rank !== UNITS[rec.kind].rank) u.setScale(1.15)
    // UMB makes every soldier stronger
    const power = g.derived.shadowPower
    u.maxHp *= power
    u.hp = u.maxHp
    u.damage *= power
    return u
  }

  /** Violet pulse on a body that can still be raised, for the renderer. */
  glowOf(u: Unit): THREE.Color | null {
    if (u.team !== 'enemy' || u.alive || u.ash || u.riteTried || !this.riteOpen || u.deadT > RITE.window) return null
    const pulse = 0.55 + Math.sin(this.time * 4 + u.id) * 0.25
    const end = Math.min(1, (RITE.window - u.deadT) / 3)
    const k = pulse * end * (this.casting.includes(u) ? 1.0 : 0.55) * (u.executed ? 1.3 : 1)
    return this.glowColor.set(COLOR.umbra).multiplyScalar(k)
  }

  update(dt: number, canAct: boolean, inp: UmbraInput) {
    const g = this.g
    this.time += dt
    this.swapCd = Math.max(0, this.swapCd - dt)
    this.summonCd = Math.max(0, this.summonCd - dt)
    const open = this.riteOpen
    const p = g.player
    const cam = g.camera.position
    const fwd = g.camera.getWorldDirection(new THREE.Vector3())
    let best: Unit | null = null
    let bestScore = Infinity
    const near: Unit[] = []

    // while the army is out, a shadow that has reformed rises again beside her
    if (this.armyOut) {
      for (const [id, at] of this.downUntil) {
        if (at > this.time) continue
        this.downUntil.delete(id)
        const rec = g.profile.shadows.find((s) => s.id === id)
        if (!rec || g.units.units.some((u) => u.record === rec && u.alive)) continue
        const slot = this.field().length
        const pos = this.spot(slot)
        g.pools.open(pos, 0.9 + UNITS[rec.kind].radius * 1.6, 1.4)
        this.calls.push({ at: this.time + 0.3, rec, pos, slot })
      }
    }
    // shadows of a call rise one after another
    while (this.calls.length && this.calls[0].at <= this.time) {
      const c = this.calls.shift()!
      if (!g.profile.shadows.includes(c.rec)) continue
      this.spawnShadow(c.rec, c.pos, c.slot)
      g.smoke.emit({ pos: c.pos, count: 6, color: 0x0c0614, life: 1.2, size: 1, sizeEnd: 1.8, vel: { x: 0, y: 1.6, z: 0 }, jitter: 0.4, alpha: 0.8 })
    }

    for (const u of [...g.units.units]) {
      if (u.alive) continue
      if (u.team === 'shadow') {
        if (u.deadT > 1.1) g.units.remove(u)
        continue
      }
      const window = open && !u.riteTried ? RITE.window : RITE.plainCorpseTime
      const glowing = open && !u.riteTried && !u.ash && u.deadT < window
      if (glowing) {
        if (Math.random() < dt * 6) g.glow.emit({ pos: u.pos, count: 1, color: COLOR.umbra, intensity: 2.2, life: 1.2, size: 0.12, vel: { x: 0, y: 0.9, z: 0 }, jitter: 0.5 })
        const dist = Math.hypot(u.pos.x - p.pos.x, u.pos.z - p.pos.z)
        if (dist < RITE.massRadius && !riteBlock(g.profile, u.kind, rankOf(u))) near.push(u)
        if (dist < RITE.range) {
          const dir = new THREE.Vector3(u.pos.x, u.pos.y + 0.3, u.pos.z).sub(cam).normalize()
          const ang = fwd.angleTo(dir)
          if (ang < 0.6) {
            const score = ang * 10 + dist * 0.1
            if (score < bestScore) {
              bestScore = score
              best = u
            }
          }
        }
      } else if (!u.ash && u.deadT >= (u.riteTried ? 0 : window)) this.turnToAsh(u)
      if (u.ash && u.deadT - u.ashAt > 2) g.units.remove(u)
    }
    this.casting = this.casting.filter((u) => u.state === 'dead' && !u.riteTried && !u.ash)
    // two or more glowing bodies in reach: one cast raises them all; otherwise the one being looked at
    if (this.casting.length) {
      this.candidate = this.casting[0]
      this.targets = this.casting
    } else {
      this.candidate = best ?? (near.length ? near[0] : null)
      this.targets = near.length >= 2 ? near : this.candidate ? [this.candidate] : []
    }

    // casting: hold R
    const holding = canAct && inp.riteHeld
    if (this.casting.length && !holding) this.cancel()
    if (canAct && inp.ritePressed) this.begin()
    if (this.casting.length) {
      const castTime = hasUpgrade(g.profile, 'rite') ? RITE.castTimeUpgraded : RITE.castTime
      this.progress += dt / castTime
      const from = g.ilyra.hand('R')
      for (const target of this.casting.slice(0, 14)) {
        const c = target.pos
        const pt = from.clone().lerp(c, Math.random())
        g.glow.emit({ pos: pt, count: 1, color: COLOR.umbra, intensity: 2.4, life: 0.3, size: 0.1, vel: { x: (c.x - from.x) * 0.8, y: (c.y - from.y) * 0.8, z: (c.z - from.z) * 0.8 } })
        if (Math.random() < 0.5) g.smoke.emit({ pos: c, count: 1, color: 0x170a28, life: 1, size: 0.8, sizeEnd: 1.4, vel: { x: 0, y: 1, z: 0 }, jitter: 0.5, alpha: 0.7 })
      }
      this.chargeTick -= dt
      if (this.chargeTick <= 0) {
        g.sfx.riteCharge(this.progress)
        this.chargeTick = 0.12
      }
      if (this.progress >= 1) this.complete([...this.casting])
    }

    if (canAct && inp.toggle) this.toggle()

    // command wheel: hold Z, move the mouse toward an order, let go
    if (canAct && inp.wheelPressed) {
      this.wheelOpen = true
      this.wheelX = this.wheelY = 0
      this.wheelChoice = null
    }
    if (this.wheelOpen) {
      this.wheelX += inp.dx
      this.wheelY += inp.dy
      if (Math.hypot(this.wheelX, this.wheelY) > 24) {
        const a = Math.atan2(this.wheelY, this.wheelX)
        // up = follow, right = attack, down = hold, left = swap
        if (a > -Math.PI * 0.75 && a <= -Math.PI * 0.25) this.wheelChoice = 'follow'
        else if (a > -Math.PI * 0.25 && a <= Math.PI * 0.25) this.wheelChoice = 'attack'
        else if (a > Math.PI * 0.25 && a <= Math.PI * 0.75) this.wheelChoice = 'hold'
        else this.wheelChoice = 'swap'
      }
      if (!inp.wheelHeld || !canAct) {
        this.wheelOpen = false
        if (this.wheelChoice && canAct) this.order(this.wheelChoice)
      }
    }

    // shadows left far behind are pulled back to her side
    this.leashT -= dt
    if (this.leashT <= 0) {
      this.leashT = 1
      for (const u of this.field()) {
        if (u.state === 'rising' || u.command === 'hold' || u.pos.distanceTo(new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z)) < LEASH) continue
        g.pools.open(u.pos, 1 + u.radius * 1.5, 0.4)
        const at = this.spot(u.slot)
        u.pos.copy(at)
        u.vel.set(0, 0, 0)
        u.set('rising')
        g.pools.open(at, 1 + u.radius * 1.5, 1.2)
      }
    }
  }

  private turnToAsh(u: Unit) {
    u.ash = true
    u.ashAt = u.deadT
    this.casting = this.casting.filter((c) => c !== u)
    this.g.smoke.emit({ pos: u.pos, count: 8, color: 0x3a3436, life: 1.4, size: 0.6, sizeEnd: 1.2, speed: 0.4, vel: { x: 0, y: 0.5, z: 0 }, jitter: 0.4, alpha: 0.6 })
  }

  /** v1 formula, plus the execution bonus for a body she finished with F. */
  chance(u: Unit) {
    const g = this.g
    return riteOdds(rankOf(u), g.profile.level, u.level, g.profile.stats.umb, u.executed)
  }

  /** Mana for raising `n` bodies in one cast. */
  cost(n: number) {
    return RITE.mana + RITE.massManaPerExtra * Math.max(0, n - 1)
  }

  /** Why a cast on these bodies cannot start right now, or null when it can. */
  blocker(u?: Unit, n = 1): string | null {
    const g = this.g
    if (!this.riteOpen) return 'Umbra Rite terbuka di Lv 2.'
    const rank = u ? riteBlock(g.profile, u.kind, rankOf(u)) : null
    if (rank) return rank
    if (g.profile.shadows.length >= RITE.maxShadows) return 'Ruang Bayangan sudah penuh sekali.'
    const need = this.cost(n)
    if (!g.spells.overloaded && g.player.mana < need) return `Mana kurang: butuh ${need}.`
    return null
