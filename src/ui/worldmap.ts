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
      const n = this.g.fauna.list().filter((f) => f.kind === kind).length
      out.set(kind, { kind, name: UNITS[kind].name, lo: 0, hi: 0, camps: n, fauna: true })
    }
    const list = [...out.values()]
    const byName = ($<HTMLSelectElement>('map-sort').value ?? 'level') === 'name'
    list.sort((a, b) => (byName ? a.name.localeCompare(b.name, 'id') : (a.fauna ? 99 : a.lo) - (b.fauna ? 99 : b.lo) || a.name.localeCompare(b.name, 'id')))
    return list
  }

  private renderBosses() {
    const items = this.bosses()
    $('map-bosses').innerHTML = items
      .map(
        (b) =>
          `<li><button type="button" class="map-boss ${b.status} ${this.focus === b.kind ? 'focus' : ''}" data-boss="${b.kind}" aria-pressed="${this.focus === b.kind}">` +
          `<span class="map-boss-name">${b.name} <span class="num">Lv ${b.level}</span></span>` +
          `<span class="map-boss-where">${b.zone}, ${b.note}</span></button></li>`,
      )
      .join('')
  }

  private renderMonsters() {
    $('map-monsters').innerHTML = this.monsters()
      .map((m) => {
        const id = `map-k-${m.kind}`
        const meta = m.fauna ? `satwa, ${m.camps} tempat` : `Lv ${m.lo === m.hi ? m.lo : `${m.lo} sampai ${m.hi}`}, ${m.camps} kamp`
        return (
          `<li><input type="checkbox" id="${id}" data-kind="${m.kind}" ${this.chosen.has(m.kind) ? 'checked' : ''} />` +
          `<label for="${id}"><span class="map-swatch" style="background:${KIND_COLOR[m.kind] ?? '#ccc'}"></span>${m.name} <span class="map-meta">${meta}</span></label></li>`
        )
      })
      .join('')
  }

  // ------------------------------------------------------------ drawing

  /** The valley itself, drawn once: zone tones, hill shading, water. */
  private baseLayer(): HTMLCanvasElement {
    if (this.base) return this.base
    const c = document.createElement('canvas')
    c.width = c.height = BASE
    const ctx = c.getContext('2d')!
    const img = ctx.createImageData(BASE, BASE)
    const tones = ZONES.map((z) => {
      const g = parseInt(z.ground.slice(1), 16)
      const f = parseInt(z.fog.slice(1), 16)
      // the zone's ground lifted toward its fog colour, so the five zones read apart
      const mix = (a: number, b: number) => a * 0.55 + b * 0.45
      return [mix((g >> 16) & 255, (f >> 16) & 255), mix((g >> 8) & 255, (f >> 8) & 255), mix(g & 255, f & 255)]
    })
    const w = new Float32Array(ZONES.length)
    const step = (EXTENT * 2) / BASE
    for (let j = 0; j < BASE; j++) {
      for (let i = 0; i < BASE; i++) {
        const mx = -EXTENT + (i + 0.5) * step
        const my = EXTENT - (j + 0.5) * step
        const h = heightMap(mx, my)
        let r = 0
        let gg = 0
        let b = 0
        if (inWaterRect(mx, my) && h < WATER_LEVEL - 0.3) {
          r = 22
          gg = 46
          b = 52
        } else {
          zoneWeights(mx, my, w)
          for (let k = 0; k < w.length; k++) {
            r += tones[k][0] * w[k]
            gg += tones[k][1] * w[k]
            b += tones[k][2] * w[k]
          }
          // light from the north-west: slopes facing it are brighter
          const shade = 1 + Math.max(-0.45, Math.min(0.45, ((heightMap(mx - step, my) - heightMap(mx + step, my)) + (heightMap(mx, my + step) - heightMap(mx, my - step))) * 0.05))
          r *= shade
          gg *= shade
          b *= shade
        }
        const o = (j * BASE + i) * 4
        img.data[o] = Math.min(255, r)
        img.data[o + 1] = Math.min(255, gg)
        img.data[o + 2] = Math.min(255, b)
        img.data[o + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
    this.base = c
    return c
  }

  draw() {
    const g = this.g
    const cv = this.canvas
    const box = cv.parentElement!.getBoundingClientRect()
    const size = Math.max(200, Math.floor(Math.min(box.width, box.height)))
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.style.width = cv.style.height = `${size}px`
