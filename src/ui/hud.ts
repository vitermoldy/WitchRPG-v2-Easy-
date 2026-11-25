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

