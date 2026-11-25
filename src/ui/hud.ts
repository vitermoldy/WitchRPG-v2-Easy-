import * as THREE from 'three'
import { CHAOS, ELITE, UNITS, type UnitKind } from '../game/balance'
import { xpToNext } from '../game/progression'
import type { Game } from '../engine/game'
import type { Zone } from '../world/map'

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T

type Tone = 'info' | 'chaos' | 'umbra' | 'level'

/** How to fight each mini-boss, under its bar. */
const BOSS_HINT: Partial<Record<UnitKind, string>> = {
  medusa: 'Tatapannya membatukan: tahan C saat lingkarannya penuh, atau pasang Hex Barrier.',
  chimera: 'Api di depan, seruduk kambing dari jauh, sengat ular di belakang. Ia memanggil Imp.',
  cerberus: 'Tiga kepala menggigit di lingkaran, api di depan, terjangan dari jauh. Ia memanggil Hellhound.',
  lilith: 'Menghilang saat didekati. Roll dari tombak gelap; kutukannya meracuni. Ia memanggil Succubus.',
  dragon: 'Api di depan, ekor di belakang, bola api dari jauh. Terkamannya hanya bisa dihindari dengan roll.',
  atlas: 'Bola dunia jatuh di lingkaran besar di depannya: keluar sebelum penuh. Dari jauh ia melempar batu.',
  typhon: 'Hantaman badai di lingkaran lebar, petir dari jauh, lecutan ular di garis. Ia memanggil Harpy.',
  samael: 'Menghilang dan menebas di garis: roll ke samping. Penghakimannya jatuh di lingkaran lebar.',
}

/** The Hydra's hint follows its phase. */
const HYDRA_HINT = [
  '',
  'Kepala menghantam di lingkaran amber. Kepala yang limbung bisa dieksekusi.',
  'Kulit berlendir: bolt hanya 10%. Angkat batu di pulau dengan Telekinesis dan lempar (150%).',
  'Kebal, kecuali di dalam Reality Warp (V): di sana jantungnya terbuka, +50%.',
]

/**
 * The fight overlay, kept to the screen edges: her vitals and Chaos on the left, skills in the middle,
 * the army on the right, creature bars over the creatures, prompts under the middle of the view.
 * Writes to the DOM only when a value changes.
 */
export class Hud {
  private readonly g: Game
  private readonly root = $('hud')
  private readonly banner_ = $('zone-banner')
  private readonly bannerName = $('zone-name')
  private readonly bannerTier = $('zone-tier')
  private readonly lockMark = $('lock-mark')
  private readonly aimEl = $('aim')
  private readonly hitmark = $('hitmark')
  private readonly hint = $('hint')
  private readonly debugEl = $('debug')
  private readonly feed = $('feed')
  private readonly bigBanner = $('banner')
  private readonly prompt = $('prompt')
  private readonly bars = $('hpbars')
  private readonly wheel = $('wheel')
  private readonly army = $('army-slots')
  private readonly hurtVeil = $('hurt-veil')
  private readonly cache = new Map<string, string>()
  private readonly pool: HTMLDivElement[] = []
  private readonly v = new THREE.Vector3()
  private bannerTime = 0
  private bigBannerTime = 0
  private hintTime = 0
  private hitTime = 0
  private hurt = 0
  private manaFlash = 0
  private zoneKey = ''

  constructor(g: Game) {
    this.g = g
  }

  show(on: boolean) {
    this.root.hidden = !on
    if (on && this.hintTime === 0) this.hintTime = 16
  }

  private set(id: string, key: 'text' | 'transform' | 'class', value: string) {
    const k = id + key
    if (this.cache.get(k) === value) return
    this.cache.set(k, value)
    const el = $(id)
    if (key === 'text') el.textContent = value
    else if (key === 'transform') el.style.transform = value
    else el.className = value
  }

  private html(el: HTMLElement, key: string, value: string) {
    if (this.cache.get(key) === value) return
    this.cache.set(key, value)
    el.innerHTML = value
  }

  zone(z: Zone) {
    if (z.key === this.zoneKey) return
    this.zoneKey = z.key
    this.bannerName.textContent = z.name
    this.bannerTier.textContent = `Tier ${z.tier}, makhluk Lv ${z.levels[0]} sampai ${z.levels[1]}`
    this.banner_.classList.add('show')
    this.bannerTime = 3.6
  }

  /** Screen position of the locked target in pixels, or null when nothing is locked. */
  lock(at: { x: number; y: number } | null) {
    if (!at) {
      this.lockMark.classList.remove('show')
      return
    }
    this.lockMark.classList.add('show')
    this.lockMark.style.transform = `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px)`
  }

  aim(on: boolean) {
    this.aimEl.classList.toggle('show', on)
  }

  debug(text: string | null) {
    this.debugEl.hidden = text === null
    if (text !== null) this.debugEl.textContent = text
  }

  message(text: string, tone: Tone = 'info') {
    const p = document.createElement('p')
    p.className = `feed-item ${tone}`
    p.textContent = text
    this.feed.appendChild(p)
    while (this.feed.children.length > 5) this.feed.firstElementChild?.remove()
    window.setTimeout(() => p.classList.add('fade'), 5200)
    window.setTimeout(() => p.remove(), 5900)
  }

  banner(title: string, sub: string) {
    ;(this.bigBanner.querySelector('.banner-title') as HTMLElement).textContent = title
    ;(this.bigBanner.querySelector('.banner-sub') as HTMLElement).textContent = sub
    this.bigBanner.classList.add('show')
    this.bigBannerTime = 3.2
  }

  flashMana() {
    this.manaFlash = 0.6
  }

  hurtFlash(k: number) {
    this.hurt = Math.min(1, this.hurt + k)
  }

  hit(kill: boolean) {
    this.hitTime = kill ? 0.25 : 0.1
    this.hitmark.className = kill ? 'hitmark kill' : 'hitmark on'
  }

  /** A quick bright ring around the middle of the view: the parry landed. */
  parry() {
    this.pulse('parry-flash')
  }

  /** A violet breath across the screen when the army is called. */
  umbraPulse() {
    this.pulse('umbra-veil')
  }

  /** A short black fade, for getting up again after a fall. */
  fade() {
    this.pulse('fade')
  }

  private pulse(id: string) {
    const el = $(id)
    el.classList.remove('on')
    void el.offsetWidth
    el.classList.add('on')
  }

  update(dt: number) {
    const g = this.g
    const p = g.player
    const pr = g.profile
    if (this.bannerTime > 0) {
      this.bannerTime -= dt
      if (this.bannerTime <= 0) this.banner_.classList.remove('show')
    }
    if (this.bigBannerTime > 0) {
      this.bigBannerTime -= dt
      if (this.bigBannerTime <= 0) this.bigBanner.classList.remove('show')
    }
    if (this.hintTime > 0) {
      this.hintTime -= dt
      this.hint.classList.toggle('show', this.hintTime > 0)
    }
    if (this.hitTime > 0) {
      this.hitTime -= dt
      if (this.hitTime <= 0) this.hitmark.className = 'hitmark'
    }
    this.hurt = Math.max(0, this.hurt - dt * 1.4)
    this.hurtVeil.style.opacity = this.hurt.toFixed(2)
    this.manaFlash = Math.max(0, this.manaFlash - dt)
    if (this.root.hidden || !g.camps) return

    // vitals
    this.set('hp-fill', 'transform', `scaleX(${Math.max(0, p.hp / p.maxHp).toFixed(3)})`)
    this.set('hp-text', 'text', `${Math.ceil(Math.max(0, p.hp))} / ${Math.round(p.maxHp)}`)
    this.set('mana-fill', 'transform', `scaleX(${Math.max(0, p.mana / p.maxMana).toFixed(3)})`)
    this.set('mana-text', 'text', g.spells.overloaded ? 'bebas' : `${Math.floor(p.mana)} / ${Math.round(p.maxMana)}`)
    this.set('mana-row', 'class', this.manaFlash > 0 ? 'vital short' : 'vital')
    this.set('hp-row', 'class', p.poisonT > 0 ? 'vital poisoned' : 'vital')
    this.root.classList.toggle('stone', p.petrified > 0)
    const chaos = g.spells.overloaded ? (g.spells.overloadT / CHAOS.overloadTime) * 100 : g.spells.chaos
    this.set('chaos-fill', 'transform', `scaleX(${(chaos / 100).toFixed(3)})`)
    this.set('chaos-text', 'text', g.spells.overloaded ? `${Math.ceil(g.spells.overloadT)} dtk` : g.spells.chaos >= CHAOS.max ? 'G siap' : `${Math.floor(g.spells.chaos)}`)
    this.set('chaos-row', 'class', g.spells.chaos >= CHAOS.max || g.spells.overloaded ? 'vital full' : 'vital')
    this.set('level-text', 'text', `Lv ${pr.level}`)
    this.set('xp-text', 'text', `${pr.xp} / ${xpToNext(pr.level)} XP`)
    this.set('xp-fill', 'transform', `scaleX(${Math.min(1, pr.xp / xpToNext(pr.level)).toFixed(3)})`)
    this.root.classList.toggle('overloaded', g.spells.overloaded)

    // skills: locked ones show the level that opens them
    const cds = g.spells.cooldowns()
    const skill = (id: string, unlock: number, cd: number) => {
      const locked = pr.level < unlock
      this.set(id, 'class', `skill${locked ? ' locked' : ''}`)
      this.set(id + '-lv', 'text', locked ? `Lv ${unlock}` : '')
      this.set(id + '-cd', 'transform', `scaleY(${locked ? 0 : cd.toFixed(3)})`)
    }
    skill('sk-burst', 3, cds.burst)
    skill('sk-snare', 5, cds.snare)
    skill('sk-barrier', 7, cds.barrier)
    skill('sk-warp', 10, cds.warp)
    const full = g.spells.chaos >= CHAOS.max
    this.set('sk-overload', 'class', `skill skill-overload${full || g.spells.overloaded ? ' ready-full' : ''}`)
    this.set('sk-overload-cd', 'transform', `scaleY(${g.spells.overloaded ? 0 : (1 - g.spells.chaos / CHAOS.max).toFixed(3)})`)
    const staff = g.fight.staff.state
    this.set('sk-staff-label', 'text', staff === 'hand' ? 'Lempar' : staff === 'returning' ? 'Kembali' : 'Panggil')
    this.set('sk-staff', 'class', staff === 'hand' ? 'skill' : 'skill skill-out')

    // where the nearest camp is
    const near = g.camps.nearest()
    this.set('camp-line', 'text', near ? `Kamp terdekat Lv ${near.camp.def.levels[0]}${near.camp.def.levels[1] !== near.camp.def.levels[0] ? ` sampai ${near.camp.def.levels[1]}` : ''}, ${Math.round(near.dist)} m` : 'Semua kamp ditaklukkan')
    this.set('camp-count', 'text', `${g.camps.cleared} dari ${g.camps.camps.length} kamp ditaklukkan`)
    const unlit = g.altars.nearestUnlit()
    this.set('altar-line', 'text', unlit ? `${unlit.altar.name} belum menyala, ${Math.round(unlit.dist)} m` : '')
    this.updateBoss()

    this.updatePrompt()
    this.set('rite-fill', 'transform', `scaleX(${Math.min(1, g.umbra.progress).toFixed(3)})`)
    this.set('rite-bar', 'class', g.umbra.casting.length ? 'rite-bar on' : 'rite-bar')
    this.updateArmy()
    this.updateWheel()
    this.updateBars()
  }

  /** One line under the middle of the view: execute, raise, or why not. */
  private updatePrompt() {
    const g = this.g
    let html = ''
    const ex = g.player.alive && !g.fight.exec ? g.fight.executable() : null
    const c = g.umbra.candidate
    const many = g.umbra.targets.length
    if (!g.player.alive) html = 'Ilyra tumbang'
    else if (g.player.petrified > 0) html = `Membatu ${g.player.petrified.toFixed(1)} detik`
    else if (ex) html = `<kbd>F</kbd> Eksekusi ${UNITS[ex.kind].name}`
    else if (g.altars.near() && !g.umbra.candidate) html = '<kbd>F</kbd> Altar: perjalanan cepat dan Ledger'
    else if (c && many >= 2) {
      const why = g.umbra.blocker(undefined, many)
      const chances = g.umbra.targets.map((u) => Math.round(g.umbra.chance(u) * 100))
      const lo = Math.min(...chances)
      const hi = Math.max(...chances)
      if (why) html = `<span class="blocked">${why}</span>`
      else if (g.umbra.casting.length) html = `Membangkitkan ${g.umbra.casting.length} tubuh`
      else html = `<kbd>Tahan R</kbd> Bangkitkan ${many} tubuh <span class="chance">${lo === hi ? `${lo}%` : `${lo} sampai ${hi}%`}</span> <span class="num">mana ${g.umbra.cost(many)}</span>`
    } else if (c) {
      const why = g.umbra.blocker(c)
      const name = `${UNITS[c.kind].name} Lv ${c.level}`
      if (why) html = `<span class="blocked">${why}</span>`
      else if (g.umbra.casting.length) html = `Membangkitkan ${name}`
      else html = `<kbd>Tahan R</kbd> Bangkitkan ${name} <span class="chance">${Math.round(g.umbra.chance(c) * 100)}%${c.executed ? ', dieksekusi' : ''}</span>`
    }
    this.html(this.prompt, 'prompt', html)
  }

  /** The big bar while a mini-boss fights her. */
  private updateBoss() {
    const g = this.g
    const p = g.player.pos
    let boss = null
    for (const u of g.units.units) {
      if (u.team !== 'enemy' || !u.spec.boss || !u.alive) continue
      if ((u.aggro && Math.hypot(u.pos.x - p.x, u.pos.z - p.z) < 45) || u.barShown > 0) {
        boss = u
        break
      }
    }
    this.set('bossbar', 'class', boss ? 'bossbar on' : 'bossbar')
    // the zone banner gives way while a boss bar holds the top of the screen
    this.root.classList.toggle('boss', !!boss)
    if (!boss) return
    const hydra = boss.kind === 'hydra'
    this.set('boss-name', 'text', hydra ? `Hydra Lv ${boss.level}, fase ${g.lair.phase} dari 3` : `${boss.spec.name} Lv ${boss.level}${boss.staggered ? ', limbung' : ''}`)
    this.set('boss-fill', 'transform', `scaleX(${Math.max(0, boss.hp / boss.maxHp).toFixed(3)})`)
    this.set('boss-hint', 'text', hydra ? HYDRA_HINT[g.lair.phase] : (BOSS_HINT[boss.kind] ?? ''))
  }

  /** A summary that stays the same size whether the army is three shadows or three hundred. */
  private updateArmy() {
    const g = this.g
    const field = g.umbra.field()
    const total = g.profile.shadows.length
    const reform = g.umbra.reforming()
    const rows: string[] = []
    rows.push(`<li class="army-row"><span>Di medan</span><b class="num">${field.length} / ${total}</b></li>`)
    if (reform.count) rows.push(`<li class="army-row dim"><span>Terbentuk kembali</span><b class="num">${reform.count}, ${reform.next} dtk</b></li>`)
    const order = { marsekal: 0, jenderal: 1, ksatria: 2, prajurit: 3 }
    const top = [...field].sort((a, b) => order[a.spec.rank] - order[b.spec.rank] || b.level - a.level).slice(0, 3)
    for (const u of top) {
      const hp = Math.max(0, u.hp / u.maxHp)
      rows.push(`<li class="army-slot"><span class="pip"></span><span>${u.record!.name} <span class="num">Lv ${u.level}</span></span><span class="hp"><i style="transform:scaleX(${hp.toFixed(2)})"></i></span></li>`)
    }
    if (field.length > 3) rows.push(`<li class="army-row dim"><span>dan ${field.length - 3} lainnya</span><b></b></li>`)
    if (!total) rows.push(`<li class="army-row dim"><span>${g.umbra.riteOpen ? 'Bangkitkan makhluk yang kalah dengan Tahan R' : 'Umbra Rite terbuka di Lv 2'}</span><b></b></li>`)
    else rows.push(`<li class="army-row key"><span><kbd>T</kbd> ${field.length ? 'Kembalikan' : 'Panggil'}</span><span><kbd>Z</kbd> Perintah</span></li>`)
    this.html(this.army, 'army', rows.join(''))
    const first = field[0]
    this.set('army-order', 'text', !first ? (total ? 'Di Ruang Bayangan' : 'Belum ada') : first.command === 'attack' ? 'Serang' : first.command === 'hold' ? 'Tahan' : 'Ikuti')
  }

  private updateWheel() {
    const u = this.g.umbra
    this.wheel.hidden = !u.wheelOpen
    if (!u.wheelOpen) return
    const swapLocked = this.g.profile.level < 4
    for (const el of this.wheel.querySelectorAll<HTMLElement>('.wheel-opt')) {
      const opt = el.dataset.opt
      el.classList.toggle('on', opt === u.wheelChoice)
      if (opt === 'swap') {
        el.classList.toggle('locked', swapLocked)
        el.textContent = swapLocked ? 'Tukar Tempat (Lv 4)' : u.swapCd > 0 ? `Tukar Tempat ${Math.ceil(u.swapCd)} dtk` : 'Tukar Tempat'
      }
    }
  }

  /** Health and stun over creatures that were hit or are close and roused; a staggered one says so. */
  private updateBars() {
    const g = this.g
    const cam = g.camera
    const w = window.innerWidth
    const h = window.innerHeight
    const p = g.player.pos
    let n = 0
    for (const u of g.units.units) {
      if (u.team !== 'enemy' || !u.targetable || u.spec.boss) continue
      const d2 = (u.pos.x - p.x) ** 2 + (u.pos.z - p.z) ** 2
      if (u.barShown <= 0 && !(u.aggro && d2 < 18 * 18) && !(u.elite && d2 < 35 * 35) && u !== g.lockon.current) continue
      this.v.set(u.pos.x, u.pos.y + u.height + 0.35, u.pos.z).project(cam)
      if (this.v.z > 1 || Math.abs(this.v.x) > 1.1 || Math.abs(this.v.y) > 1.1) continue
      let el = this.pool[n]
      if (!el) {
        el = document.createElement('div')
        el.className = 'hpbar'
        el.innerHTML = '<i class="hp"></i><i class="stun"></i>'
