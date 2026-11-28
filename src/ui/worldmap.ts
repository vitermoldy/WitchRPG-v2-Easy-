import { FAUNA, UNITS, type UnitKind, type V2Kind } from '../game/balance'
import type { Game } from '../engine/game'
import { CAMP_DEFS } from '../world/camps'
import { ALTARS, heightMap, inWaterRect, LANDMARKS, PATHS, PLAY_HALF, toMap, WATER_LEVEL, ZONES, zoneWeights } from '../world/map'
import { SEALED } from '../world/seal'
import { reach, TERRITORIES } from '../world/territories'

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T

/** Half the width of the map drawn (m): a little past the playable edge. */
const EXTENT = PLAY_HALF + 10
const BASE = 768
/** How far the map zooms in (the whole map is 1). */
const MAX_ZOOM = 8
const SAVE_KEY = 'witchrpg-v2-easy:map-kinds'

// one colour per creature kind on the map; chosen to stay apart from each other and readable on the ground tones
const KIND_COLOR: Partial<Record<UnitKind, string>> = {
  imp: '#ff8a5c', hellhound: '#5ce0ff', harpy: '#9fd0ff', centaur: '#e8c070', griffin: '#ffd34d', hippogriff: '#f0a8ff',
  naga: '#6dff9a', minotaur: '#ff5c7a', cyclops: '#c9a27a', succubus: '#7dffcf', incubus: '#b6ff5c', phoenix: '#ffb04d',
  pegasus: '#ffffff', unicorn: '#d8f6ff',
  medusa: '#a8e070', chimera: '#e0a050',
  // Tanah Ganjil
  satyr: '#ffc28a', blemmye: '#ff9a9a', panotti: '#ffb8d8', silvana: '#9ee6a0', leonis: '#ffcf6a', cornutus: '#ff7d5c',
  sirena: '#8ff0e6', cacodaemon: '#c6e06a', raia: '#e2c4a2', marinus: '#6ac8ff', cracovia: '#ff9f40', tetrachiron: '#e0b0ff',
  triceps: '#8fb0ff', buer: '#ffe08a',
  // the third batch
  silenus: '#e8c49a', hippocentaurus: '#d8a070', aquilon: '#f4f0e0', duyung: '#5ad8c8', aries: '#c08aff',
  // the south
  aziza: '#b8f070', kitsune: '#ff9a50', sylph: '#d0e8ff', banshee: '#e0d8f0',
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
  /** The view: zoom and the map point at its centre (x east, y north). */
  private zoom = 1
  private cx = 0
  private cy = 0
  private size = 0
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
      if (e.target instanceof HTMLSelectElement) return
      if (e.code === 'KeyM') {
        e.preventDefault()
        this.close()
      } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        e.preventDefault()
        this.zoomBy(1.5)
      } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        e.preventDefault()
        this.zoomBy(1 / 1.5)
      }
    })
    // the wheel zooms about the point under the cursor; a drag moves the view
    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
        const r = this.canvas.getBoundingClientRect()
        this.zoomBy(e.deltaY < 0 ? 1.25 : 0.8, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height)
      },
      { passive: false },
    )
    let drag: { x: number; y: number } | null = null
    this.canvas.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY }
      this.canvas.setPointerCapture(e.pointerId)
    })
    this.canvas.addEventListener('pointermove', (e) => {
      if (!drag || !this.size) return
      const span = (EXTENT * 2) / this.zoom
      this.cx -= ((e.clientX - drag.x) / this.size) * span
      this.cy += ((e.clientY - drag.y) / this.size) * span
      drag = { x: e.clientX, y: e.clientY }
      this.clampView()
      this.draw()
    })
    const stop = () => (drag = null)
    this.canvas.addEventListener('pointerup', stop)
    this.canvas.addEventListener('pointercancel', stop)
    $('map-zoom-in').addEventListener('click', () => this.zoomBy(1.5))
    $('map-zoom-out').addEventListener('click', () => this.zoomBy(1 / 1.5))
    $('map-zoom-fit').addEventListener('click', () => {
      this.zoom = 1
      this.cx = this.cy = 0
      this.draw()
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
      // a chosen boss comes to the middle of a zoomed view
      const entry = this.focus ? this.bosses().find((x) => x.kind === this.focus) : null
      if (entry && this.zoom > 1) {
        ;[this.cx, this.cy] = toMap(entry.x, entry.z)
        this.clampView()
      }
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

  /** Zooms by a factor about a point of the view (0 to 1 across and down; the middle by default). */
  private zoomBy(f: number, ux = 0.5, uy = 0.5) {
    const z = Math.min(MAX_ZOOM, Math.max(1, this.zoom * f))
    if (z === this.zoom) return
    const span = (EXTENT * 2) / this.zoom
    const mx = this.cx + (ux - 0.5) * span
    const my = this.cy - (uy - 0.5) * span
    this.zoom = z
    const next = (EXTENT * 2) / z
    this.cx = mx - (ux - 0.5) * next
    this.cy = my + (uy - 0.5) * next
    this.clampView()
    this.draw()
  }

  /** Keeps the view on the map. */
  private clampView() {
    const half = EXTENT - EXTENT / this.zoom
    this.cx = Math.min(half, Math.max(-half, this.cx))
    this.cy = Math.min(half, Math.max(-half, this.cy))
  }

  open() {
    if (!this.dlg.open) this.dlg.showModal()
    this.zoom = 1
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
    cv.width = cv.height = Math.round(size * dpr)
    const ctx = cv.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const px = (mx: number) => ((mx + EXTENT) / (EXTENT * 2)) * size
    const py = (my: number) => ((EXTENT - my) / (EXTENT * 2)) * size
    const at = (wx: number, wz: number) => {
      const [mx, my] = toMap(wx, wz)
      return [px(mx), py(my)] as const
    }
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(this.baseLayer(), 0, 0, size, size)

    // paths
    ctx.strokeStyle = 'rgba(232, 214, 176, 0.75)'
    ctx.lineWidth = Math.max(1.5, size / 380)
    ctx.lineJoin = 'round'
    for (const line of PATHS) {
      ctx.beginPath()
      line.forEach(([x, y], i) => (i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))))
      ctx.stroke()
    }

    // labels never sit on each other: each tries above its mark, then below, right and left
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const placed: [number, number, number, number][] = []
    const label = (text: string, x: number, y: number, gap: number, color: string) => {
      const w = ctx.measureText(text).width + 6
      const h = parseFloat(ctx.font.split('px')[0].split(' ').pop() ?? '12') + 4
      const tries: [number, number][] = [[x, y - gap - h / 2], [x, y + gap + h / 2], [x + gap + w / 2, y], [x - gap - w / 2, y]]
      const inside = ([cx, cy]: [number, number]) => cx - w / 2 >= 0 && cx + w / 2 <= size && cy - h / 2 >= 0 && cy + h / 2 <= size
      const free = (t: [number, number]) => inside(t) && placed.every(([a, b, c, d]) => t[0] + w / 2 < a || t[0] - w / 2 > c || t[1] + h / 2 < b || t[1] - h / 2 > d)
      // nowhere free: the first spot that stays on the map
      const [cx, cy] = tries.find(free) ?? tries.find(inside) ?? tries[0]
      placed.push([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2])
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(12, 8, 9, 0.8)'
      ctx.strokeText(text, cx, cy)
      ctx.fillStyle = color
      ctx.fillText(text, cx, cy)
    }
    const bosses = this.bosses()
    const br = Math.max(6, size / 70)
    // boss marks claim their room first, so a label never covers one
    for (const b of bosses) {
      const [x, y] = at(b.x, b.z)
      placed.push([x - br, y - br, x + br, y + br])
    }

    // zone names, and the seal over Reruntuhan Kuil and Lembah Bara while it holds
    ctx.font = `600 ${Math.max(11, size / 52)}px Figtree Variable, Figtree, system-ui, sans-serif`
    for (const z of ZONES) {
      const sealed = (z.key === 'kuil' || z.key === 'bara') && !g.seal.isOpen
      label(sealed ? `${z.name} (tersegel)` : z.name, px(z.c[0]), py(z.c[1]), 0, sealed ? '#ffbe73' : 'rgba(239, 230, 223, 0.92)')
    }

    // altars: teal diamonds, filled once lit
    const r = Math.max(4, size / 110)
    for (const a of ALTARS) {
      const x = px(a.c[0])
      const y = py(a.c[1])
      ctx.beginPath()
      ctx.moveTo(x, y - r)
      ctx.lineTo(x + r, y)
      ctx.lineTo(x, y + r)
      ctx.lineTo(x - r, y)
      ctx.closePath()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#9ff2e0'
      ctx.fillStyle = g.altars.isLit(a.key) ? '#9ff2e0' : 'rgba(12, 8, 9, 0.6)'
      ctx.fill()
      ctx.stroke()
    }

    // the camps of the creatures she looks for (hollow while cleared), and the fauna
    const dot = Math.max(3.5, size / 150)
    for (const camp of g.camps.camps) {
      if (camp.def.boss) continue
      const kinds = (Object.keys(camp.def.pack) as UnitKind[]).filter((k) => this.chosen.has(k))
      kinds.forEach((k, i) => {
        const [x, y] = at(camp.pos.x, camp.pos.z)
        const ox = (i - (kinds.length - 1) / 2) * dot * 2.2
        ctx.beginPath()
        ctx.arc(x + ox, y, dot, 0, Math.PI * 2)
        ctx.lineWidth = 1.5
        ctx.strokeStyle = 'rgba(12, 8, 9, 0.85)'
        ctx.fillStyle = KIND_COLOR[k] ?? '#ccc'
        if (camp.state === 'cleared') {
          ctx.strokeStyle = KIND_COLOR[k] ?? '#ccc'
          ctx.lineWidth = 2
          ctx.stroke()
        } else {
          ctx.fill()
          ctx.stroke()
        }
      })
    }
    for (const f of g.fauna.list()) {
      if (!this.chosen.has(f.kind)) continue
      const [x, y] = at(f.x, f.z)
      ctx.beginPath()
      ctx.arc(x, y, dot, 0, Math.PI * 2)
      ctx.fillStyle = KIND_COLOR[f.kind] ?? '#fff'
      ctx.strokeStyle = 'rgba(12, 8, 9, 0.85)'
      ctx.lineWidth = 1.5
      ctx.fill()
      ctx.stroke()
    }

    // every boss, always: an amber ring, grey and crossed once it has fallen; the chosen one ringed again
    ctx.font = `600 ${Math.max(11, size / 58)}px Figtree Variable, Figtree, system-ui, sans-serif`
    for (const b of bosses) {
      const [x, y] = at(b.x, b.z)
      const live = b.status !== 'down'
      ctx.beginPath()
      ctx.arc(x, y, br, 0, Math.PI * 2)
      ctx.fillStyle = live ? 'rgba(255, 165, 61, 0.92)' : 'rgba(120, 112, 108, 0.9)'
      ctx.strokeStyle = 'rgba(12, 8, 9, 0.9)'
      ctx.lineWidth = 2
      ctx.fill()
      ctx.stroke()
      if (!live) {
        ctx.beginPath()
        ctx.moveTo(x - br * 0.55, y - br * 0.55)
        ctx.lineTo(x + br * 0.55, y + br * 0.55)
        ctx.moveTo(x + br * 0.55, y - br * 0.55)
        ctx.lineTo(x - br * 0.55, y + br * 0.55)
        ctx.strokeStyle = '#efe6df'
        ctx.stroke()
      }
      if (this.focus === b.kind) {
        ctx.beginPath()
        ctx.arc(x, y, br * 2, 0, Math.PI * 2)
        ctx.strokeStyle = '#efe6df'
        ctx.lineWidth = 2
        ctx.stroke()
      }
      label(`${b.name} ${b.level}`, x, y, br + 2, live ? '#ffd8a8' : '#b0a29c')
    }

    // where she stands, pointing the way she faces (yaw 0 is north)
    const p = g.player
    const [x, y] = at(p.pos.x, p.pos.z)
    const s = Math.max(7, size / 60)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(-p.facing)
    ctx.beginPath()
    ctx.moveTo(0, -s)
    ctx.lineTo(s * 0.62, s * 0.7)
    ctx.lineTo(0, s * 0.35)
    ctx.lineTo(-s * 0.62, s * 0.7)
    ctx.closePath()
    ctx.fillStyle = '#ff2a3d'
    ctx.strokeStyle = '#efe6df'
    ctx.lineWidth = 2
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }
}
