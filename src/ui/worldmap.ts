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
    $('map-all').addEventListener('click', () => {
      for (const m of this.monsters()) this.chosen.add(m.kind)
      this.changed()
    })
    $('map-none').addEventListener('click', () => {
      this.chosen.clear()
      this.changed()
    })
    $('map-monsters').addEventListener('change', (e) => {
      const box = e.target as HTMLInputElement
      const kind = box.dataset.kind as UnitKind | undefined
      if (!kind) return
      if (box.checked) this.chosen.add(kind)
      else this.chosen.delete(kind)
      this.changed(false)
    })
    $('map-bosses').addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-boss]')
      if (!b) return
      const kind = b.dataset.boss as UnitKind
      this.focus = this.focus === kind ? null : kind
      this.renderBosses()
      this.draw()
    })
    window.addEventListener('resize', () => {
      if (this.dlg.open) this.draw()
    })
  }

  get isOpen() {
    return this.dlg.open
  }

  open() {
    if (!this.dlg.open) this.dlg.showModal()
    this.renderBosses()
    this.renderMonsters()
    this.draw()
    $('btn-map-close').focus()
  }

  close() {
    if (this.dlg.open) this.dlg.close()
  }

  private changed(rerender = true) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify([...this.chosen]))
    } catch {
      /* the choice lasts until the page reloads */
    }
    if (rerender) this.renderMonsters()
    this.draw()
  }

  // ------------------------------------------------------------ what the lists hold

  /** Every boss of the valley: the Hydra, the mini-bosses of Rawa and the bosses of the open world. */
  bosses(): BossEntry[] {
    const g = this.g
    const list: BossEntry[] = []
    const zoneName = (x: number, z: number) => {
      const [mx, my] = toMap(x, z)
      const w = zoneWeights(mx, my)
      let best = 0
      for (let i = 1; i < w.length; i++) if (w[i] > w[best]) best = i
      return ZONES[best].name
    }
    const lair = g.lair
    list.push({
      kind: 'hydra', name: 'Hydra', level: lair.level, zone: 'Danau Hitam', x: lair.center.x, z: lair.center.z,
      status: lair.state === 'won' ? 'down' : g.profile.level < 10 ? 'locked' : 'waiting',
      note: lair.state === 'won' ? 'tumbang' : g.profile.level < 10 ? 'sarangnya terbuka di Lv 10' : 'menunggu di sarangnya',
    })
    for (const camp of g.camps.camps) {
      const kind = (Object.keys(camp.def.pack) as V2Kind[]).find((k) => UNITS[k].boss)
      if (!kind) continue
      const sealed = g.seal.sealedAt(camp.pos.x, camp.pos.z) && !g.seal.isOpen
      const left = Math.max(0, camp.respawnAt - g.camps.clock)
      const down = camp.state === 'cleared'
      list.push({
        kind, name: UNITS[kind].name, level: camp.def.levels[1], zone: zoneName(camp.pos.x, camp.pos.z), x: camp.pos.x, z: camp.pos.z,
        status: down ? 'down' : sealed ? 'sealed' : 'waiting',
        note: down ? `tumbang, bangkit lagi dalam ${left < 90 ? `${Math.max(1, Math.ceil(left))} detik` : `${Math.ceil(left / 60)} menit`}` : sealed ? 'tersegel sampai Hydra kalah' : camp.def.boss ? 'menunggu' : 'mini-boss, menunggu',
      })
    }
    return list
  }

  /** The creatures she can look for: every kind in an ordinary camp, and the fauna. */
  monsters() {
    const out = new Map<UnitKind, { kind: UnitKind; name: string; lo: number; hi: number; camps: number; fauna: boolean }>()
    for (const def of CAMP_DEFS) {
      if (def.boss) continue
      for (const kind of Object.keys(def.pack) as V2Kind[]) {
        if (UNITS[kind].boss) continue
        const m = out.get(kind) ?? { kind, name: UNITS[kind].name, lo: 99, hi: 0, camps: 0, fauna: false }
        m.lo = Math.min(m.lo, def.levels[0])
        m.hi = Math.max(m.hi, def.levels[1])
        m.camps++
        out.set(kind, m)
      }
    }
    for (const kind of FAUNA) {
