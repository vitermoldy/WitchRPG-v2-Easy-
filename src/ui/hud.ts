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
