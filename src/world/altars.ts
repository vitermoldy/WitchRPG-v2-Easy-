import * as THREE from 'three'
import type { Game } from '../engine/game'
import { COLOR } from '../engine/palette'
import { ALTARS, toWorld } from './map'

export interface Altar {
  key: string
  name: string
  pos: THREE.Vector3
  crystal: THREE.Mesh
  rune: THREE.Mesh
}

/** She lights an altar by walking within this distance; it heals her within the same reach. */
export const ALTAR_REACH = 7
/** HP and mana back per second at a lit altar, as a share of the maximum (v1's altar). */
const HEAL = 0.12

const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4448, roughness: 0.95 })

/**
 * Altars of the valley. Walking up to one lights it: from then on she rises there after a fall, it
 * heals her while she stands at it, and F there opens fast travel to every other lit altar and the
 * Ledger. An unlit altar's crystal is a dull grey; a lit one glows Umbra violet.
 */
export class Altars {
  readonly group = new THREE.Group()
  readonly list: Altar[]
  private readonly g: Game
  private readonly lit = new THREE.Color(COLOR.umbra).multiplyScalar(2.4)
  private readonly dull = new THREE.Color(0x2a2430)
  private spin = 0

  constructor(g: Game) {
    this.g = g
    this.group.name = 'altars'
    const baseGeo = new THREE.CylinderGeometry(1.7, 2.1, 0.55, 8)
    const stoneGeo = new THREE.BoxGeometry(0.5, 2.2, 0.35)
    const crystalGeo = new THREE.OctahedronGeometry(0.42, 0)
    crystalGeo.scale(1, 1.7, 1)
    const runeGeo = new THREE.RingGeometry(2.3, 2.55, 48)
    runeGeo.rotateX(-Math.PI / 2)
    this.list = ALTARS.map((a) => {
      const [x, z] = toWorld(a.c[0], a.c[1])
      const y = g.height(x, z)
      const root = new THREE.Group()
      root.position.set(x, y, z)
      const base = new THREE.Mesh(baseGeo, stoneMat)
      base.position.y = 0.2
      base.castShadow = base.receiveShadow = true
      root.add(base)
      // three leaning standing stones around the crystal
      for (let k = 0; k < 3; k++) {
        const s = new THREE.Mesh(stoneGeo, stoneMat)
        const ang = (k / 3) * Math.PI * 2 + 0.4
        s.position.set(Math.cos(ang) * 1.35, 1.3, Math.sin(ang) * 1.35)
        s.rotation.set(Math.sin(ang) * 0.12, -ang, Math.cos(ang) * 0.12)
        s.castShadow = true
        root.add(s)
      }
      const crystal = new THREE.Mesh(crystalGeo, new THREE.MeshBasicMaterial({ color: this.dull.clone() }))
      crystal.position.y = 2.2
      root.add(crystal)
      const rune = new THREE.Mesh(runeGeo, new THREE.MeshBasicMaterial({ color: this.dull.clone(), transparent: true, opacity: 0.9, depthWrite: false }))
      rune.position.y = 0.06
      rune.renderOrder = 6
      root.add(rune)
      this.group.add(root)
      return { key: a.key, name: a.name, pos: new THREE.Vector3(x, y, z), crystal, rune }
    })
    this.paint()
  }

  isLit(key: string) {
    return this.g.profile.world.altars.includes(key)
  }

  byKey(key: string) {
    return this.list.find((a) => a.key === key) ?? this.list[0]
  }

  /** The lit altar she stands at, if any. */
  near(): Altar | null {
    const p = this.g.player.pos
    for (const a of this.list) if (this.isLit(a.key) && Math.hypot(p.x - a.pos.x, p.z - a.pos.z) < ALTAR_REACH) return a
    return null
  }

  /** The closest altar she has not lit yet, for the HUD. */
  nearestUnlit(): { altar: Altar; dist: number } | null {
    const p = this.g.player.pos
    let best: { altar: Altar; dist: number } | null = null
    for (const a of this.list) {
      if (this.isLit(a.key)) continue
      const d = Math.hypot(p.x - a.pos.x, p.z - a.pos.z)
      if (!best || d < best.dist) best = { altar: a, dist: d }
    }
    return best
  }

  private paint() {
    for (const a of this.list) {
      const on = this.isLit(a.key)
      ;(a.crystal.material as THREE.MeshBasicMaterial).color.copy(on ? this.lit : this.dull)
      ;(a.rune.material as THREE.MeshBasicMaterial).color.copy(on ? this.lit : this.dull).multiplyScalar(on ? 0.7 : 1)
    }
  }

  update(dt: number) {
    const g = this.g
    const p = g.player
    this.spin += dt
    for (const a of this.list) {
      a.crystal.rotation.y = this.spin * 0.8
      a.crystal.position.y = 2.2 + Math.sin(this.spin * 1.6 + a.pos.x) * 0.08
    }
    if (!p.alive) return
    const w = g.profile.world
    for (const a of this.list) {
      if (Math.hypot(p.pos.x - a.pos.x, p.pos.z - a.pos.z) >= ALTAR_REACH) continue
      if (!w.altars.includes(a.key)) {
        w.altars.push(a.key)
        this.paint()
        g.hud.banner(a.name, 'menyala: Ilyra akan bangkit di sini, dan bisa kembali ke sini dari altar lain')
        g.sfx.riteResult(true)
        g.rings.spawn(a.pos, COLOR.umbra, 0.5, 6, 0.7)
      }
      if (w.last !== a.key) {
        w.last = a.key
        g.saveSoon()
      }
      // a lit altar heals her while she stands at it
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * HEAL * dt)
      p.mana = Math.min(p.maxMana, p.mana + p.maxMana * HEAL * dt)
