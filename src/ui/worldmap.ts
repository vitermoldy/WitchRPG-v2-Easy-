import { FAUNA, UNITS, type UnitKind, type V2Kind } from '../game/balance'
import type { Game } from '../engine/game'
import { CAMP_DEFS } from '../world/camps'
import { ALTARS, heightMap, inWaterRect, PATHS, PLAY_HALF, toMap, WATER_LEVEL, ZONES, zoneWeights } from '../world/map'

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T

/** Half the width of the map drawn (m): a little past the playable edge. */
const EXTENT = PLAY_HALF + 10
const BASE = 320
const SAVE_KEY = 'witchrpg-v2-easy:map-kinds'

// one colour per creature kind on the map; chosen to stay apart from each other and readable on the ground tones
const KIND_COLOR: Partial<Record<UnitKind, string>> = {
  imp: '#ff8a5c', hellhound: '#5ce0ff', harpy: '#9fd0ff', centaur: '#e8c070', griffin: '#ffd34d', hippogriff: '#f0a8ff',
  naga: '#6dff9a', minotaur: '#ff5c7a', cyclops: '#c9a27a', succubus: '#7dffcf', incubus: '#b6ff5c', phoenix: '#ffb04d',
  pegasus: '#ffffff', unicorn: '#d8f6ff',
}

interface BossEntry {
  kind: UnitKind
  name: string
  level: number
  zone: string
  x: number
  z: number
  status: 'waiting' | 'down' | 'sealed' | 'locked'
  note: string
}

/**
 * The map of the valley (M): zones, paths, the lake, altars, where she stands, every boss with how it
 * stands, and the camps of the creatures she chooses to look for, sorted by level or by name. The game
 * waits while it is open, like the Ledger.
 */
export class WorldMap {
  private readonly dlg = $<HTMLDialogElement>('worldmap')
  private readonly canvas = $<HTMLCanvasElement>('map-canvas')
  private readonly g: Game
  private base: HTMLCanvasElement | null = null
  private chosen = new Set<UnitKind>()
  private focus: UnitKind | null = null
  onClose: (() => void) | null = null

  constructor(g: Game) {
    this.g = g
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '[]') as UnitKind[]
      if (Array.isArray(saved)) this.chosen = new Set(saved.filter((k) => k in UNITS))
    } catch {
      /* no saved choice: nothing is marked */
    }
    $('btn-map-close').addEventListener('click', () => this.close())
    this.dlg.addEventListener('close', () => this.onClose?.())
    this.dlg.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && !(e.target instanceof HTMLSelectElement)) {
        e.preventDefault()
        this.close()
      }
    })
    $('map-sort').addEventListener('change', () => this.renderMonsters())
