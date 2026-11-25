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
