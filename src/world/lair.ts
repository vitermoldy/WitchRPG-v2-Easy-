import * as THREE from 'three'
import { HYDRA, MOVE, UNITS, type AttackSpec } from '../game/balance'
import type { Game } from '../engine/game'
import { COLOR } from '../engine/palette'
import { ringOf, type DamageKind, type Unit } from '../engine/units'
import { heightAt, LAKE, SPOTS, toWorld, WATER_LEVEL } from './map'

export type LairState = 'calm' | 'fight' | 'won'

/**
 * How much of a blow on the Hydra lands. Phase 1: everything. Phase 2: its slimy skin lets bolts and
 * blasts do 10% and thrown things (boulders, bodies, the staff) 150%. Phase 3: nothing, except inside
 * Reality Warp, where its open heart takes 150%. The army's blows always do 15% of their damage: the
 * Hydra is her fight.
 */
export function hydraShare(phase: 1 | 2 | 3, kind: DamageKind, inWarp: boolean): number {
  const army = kind === 'shadow' ? HYDRA.armyShare : 1
  if (phase === 3) return inWarp ? HYDRA.warpShare * army : 0
  if (phase === 2) {
    if (kind === 'bolt' || kind === 'blast') return HYDRA.boltShare
    if (kind === 'impact' || kind === 'staff') return HYDRA.thrownShare
  }
  return army
}

/** The radius of the lair: the shore the fight happens on. */
export const LAIR_RADIUS = 24
const LEVEL = 12
const WATER_UP = 0.5

const CURTAIN_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uFade;
  uniform vec3 uColor;
  void main() {
    float bands = 0.5 + 0.5 * sin(vUv.y * 16.0 - uTime * 3.0 + sin(vUv.x * 50.0) * 0.6);
    float k = (1.0 - vUv.y);
    float a = k * k * (0.2 + 0.4 * bands) * uFade;
    gl_FragColor = vec4(uColor * a * 1.6, a);
  }
`
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

interface Island {
  x: number
  z: number
  r: number
  mesh: THREE.Mesh
}

/**
 * The Hydra's lair on the shore of Danau Hitam, and the Hydra itself (PROMPT boss 1, on the plan of
 * v1's Hollow Warden). Only a witch of Lv 10 can step in: phase 3 is won inside Reality Warp, which
 * opens at Lv 10. Once the fight starts the lair closes until the Hydra or she falls.
 */
export class Lair {
  readonly group = new THREE.Group()
  state: LairState = 'calm'
  phase: 1 | 2 | 3 = 1
  body: Unit | null = null
  heads: (Unit | null)[] = []
  /** Middle of the shore the fight happens on (world), and the way to the lake. */
  readonly center: THREE.Vector3
  private readonly dir: THREE.Vector3
  private readonly groundY: number
  /** Water of the flood in phase 2 (world height), and how far the flood has come (0 to 1). */
  waterY: number
  flood = 0
  private floodTo = 0
  private readonly water: THREE.Mesh
  private readonly islands: Island[] = []
  private readonly curtain: THREE.Mesh
  private readonly curtainMat: THREE.ShaderMaterial
  private readonly g: Game
  private attackIn = 2
  private bodyAttackIn = 2.5
  private wonAt = -1
  private time = 0
  /** Game time a step into the lair was refused, for the HUD. */
  refusedAt = -99
  private readonly tmp = new THREE.Vector3()

  constructor(g: Game) {
    this.g = g
    this.group.name = 'lair'
    const [lx, lz] = toWorld(SPOTS.hydra[0], SPOTS.hydra[1])
    const [kx, kz] = toWorld(LAKE.c[0], LAKE.c[1])
    this.dir = new THREE.Vector3(kx - lx, 0, kz - lz).normalize()
    this.center = new THREE.Vector3(lx, 0, lz).addScaledVector(this.dir, 4)
    this.groundY = heightAt(this.center.x, this.center.z)
    this.center.y = this.groundY
    this.waterY = this.groundY - 3
    // the flood: a dark disc that rises over the shore in phase 2
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(LAIR_RADIUS, 48).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x0b1512, roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.88 }),
    )
    water.position.set(this.center.x, this.waterY, this.center.z)
    water.visible = false
    this.water = water
    this.group.add(water)
    // the islands left standing in the flood: boulders wait on them
    const rock = new THREE.MeshStandardMaterial({ color: 0x3e3a36, roughness: 0.95, flatShading: true })
    const base = Math.atan2(this.dir.x, this.dir.z)
    for (let k = -2; k <= 2; k++) {
      const a = base + Math.PI + k * 0.7
      const x = this.center.x + Math.sin(a) * 9
      const z = this.center.z + Math.cos(a) * 9
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.4, 4, 9), rock)
      mesh.position.set(x, this.groundY - 5, z)
      mesh.castShadow = mesh.receiveShadow = true
      mesh.visible = false
      this.group.add(mesh)
      this.islands.push({ x, z, r: 3.6, mesh })
    }
    this.curtainMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uFade: { value: 0 }, uColor: { value: new THREE.Color(COLOR.rift) } },
      vertexShader: VERT,
      fragmentShader: CURTAIN_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
    this.curtain = new THREE.Mesh(new THREE.CylinderGeometry(LAIR_RADIUS, LAIR_RADIUS, 16, 72, 1, true), this.curtainMat)
    this.curtain.position.set(this.center.x, this.groundY + 6, this.center.z)
    this.curtain.renderOrder = 7
    this.group.add(this.curtain)
  }

  /** Where the body lies in the lake (phase 1 and 2), and how close it crawls in phase 3. */
  private bodyAt(phase: number) {
    return this.center.clone().addScaledVector(this.dir, phase === 3 ? HYDRA.crawls : HYDRA.lies)
  }

  inside(x: number, z: number) {
    return Math.hypot(x - this.center.x, z - this.center.z) < LAIR_RADIUS
  }

  /** The Hydra's level, for the HUD and the tests. */
  get level() {
    return LEVEL
  }

  // ------------------------------------------------------------ the Hydra comes and goes

  private spawn() {
    const g = this.g
    const at = this.bodyAt(1)
    const body = g.units.spawn('hydra', 'enemy', LEVEL, { x: at.x, z: at.z })
    body.controlled = true
    body.aggro = false
    body.setScale(HYDRA.scale)
    body.pos.y = WATER_LEVEL - 1
    body.yaw = Math.atan2(this.center.x - at.x, this.center.z - at.z)
    this.heads = []
    for (let i = 0; i < HYDRA.heads; i++) {
      const h = g.units.spawn('hydraHead', 'enemy', LEVEL, { x: at.x, z: at.z })
      h.controlled = true
      h.aggro = false
      h.owner = body
      h.pos.y = WATER_LEVEL + 9
      this.heads.push(h)
    }
    body.parts = this.heads
    this.body = body
    this.phase = 1
    this.attackIn = 2
    this.bodyAttackIn = 2.5
  }

  /** Back to the start: her fall during the fight, or the Hydra standing again later. */
  reset() {
    const g = this.g
    for (const u of [...g.units.units]) {
      if (u === this.body || this.heads.includes(u) || (u.owner && u.owner === this.body)) g.units.remove(u)
    }
    this.body = null
    this.heads = []
    this.flood = this.floodTo = 0
    this.waterY = this.groundY - 3
    this.water.visible = false
    for (const isl of this.islands) {
      isl.mesh.visible = false
      isl.mesh.position.y = this.groundY - 5
    }
    g.props.clear()
    if (this.state === 'fight') this.state = 'calm'
  }

  private start() {
    const g = this.g
    if (!this.body) return
    this.state = 'fight'
    this.body.aggro = true
    for (const h of this.heads) if (h) h.aggro = true
    g.hud.banner('Hydra', 'bangkit dari Danau Hitam. Sarang tertutup sampai salah satu dari kalian tumbang')
    g.sfx.roar()
    g.addTrauma(0.4)
  }

  private enterPhase(n: 2 | 3) {
    const g = this.g
    const p = g.player
    this.phase = n
    // each new phase gives her a breath (v1)
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * HYDRA.phaseHeal)
    p.mana = Math.min(p.maxMana, p.mana + HYDRA.phaseMana)
    g.sfx.roar()
    g.addTrauma(0.5)
    if (n === 2) {
      this.floodTo = 1
      g.hud.banner('Air naik', 'kulitnya berlendir: bolt hanya 10%, batu yang dilempar 150%')
      g.hud.message('Fase 2: pulau batu muncul dari air, dan batunya bisa diangkat dengan Telekinesis (bidik, tahan klik kiri).', 'chaos')
      for (const isl of this.islands) g.props.add(isl.x, isl.z)
    } else {
      // it swallows what is left of its heads and crawls up to the shore
      for (let i = 0; i < this.heads.length; i++) {
        const h = this.heads[i]
        if (h) {
          g.clearTelegraph(h)
          g.units.remove(h)
        }
        this.heads[i] = null
      }
      if (this.body) this.body.parts = this.heads
      g.hud.banner('Hydra menelan kepalanya', 'kebal, kecuali di dalam Reality Warp: di sana jantungnya terbuka')
      g.hud.message('Fase 3: pasang Reality Warp (V) di atas Hydra, lalu serang selagi ia di dalam medan.', 'chaos')
    }
  }

  /** A head fell (an execution severs it): the body loses a share of its life. */
  partDied(h: Unit) {
    const g = this.g
    h.riteTried = true
    const i = this.heads.indexOf(h)
    if (i >= 0) this.heads[i] = h
    const body = this.body
    if (body && body.alive) {
      body.hp = Math.max(1, body.hp - body.maxHp * HYDRA.severShare)
      body.flash = 0.3
    }
    g.hud.message('Kepala Hydra terpenggal. Tubuhnya kehilangan 8% HP.', 'chaos')
    g.sfx.roar()
    if (this.phase < 3 && !this.heads.some((x) => x && x.alive)) this.enterPhase(3)
  }

  /** The body fell: the lair opens, and so do Reruntuhan Kuil and Lembah Bara. */
  bossDied() {
    const g = this.g
    this.state = 'won'
    this.wonAt = this.time
    this.floodTo = 0
    g.profile.bossKills += 1
    g.seal.unlock()
    g.hud.banner('Hydra tumbang', 'Reruntuhan Kuil dan Lembah Bara terbuka')
    g.hud.message('Segel Reruntuhan Kuil dan Lembah Bara pecah. Tubuh Hydra bersinar: dengan Kebangkitan Marsekal ia bisa dibangkitkan, satu kali.', 'umbra')
    g.saveSoon()
  }

  /** Share of a blow that lands on a Hydra part (see hydraShare). */
  share(u: Unit, kind: DamageKind): number {
    const body = this.body
    const inWarp = !!body && this.g.spells.inWarp(body.center(this.tmp))
    return hydraShare(this.phase, kind, inWarp && u === body)
  }

  // ------------------------------------------------------------ ground, water and the lair's edge

  /** Ground height in the lair: the islands stand up out of the flood. */
  height(x: number, z: number, base: number): number {
    if (this.flood <= 0 || !this.inside(x, z)) return base
    for (const isl of this.islands) {
      const d = Math.hypot(x - isl.x, z - isl.z)
      if (d > isl.r + 2) continue
      const top = this.groundY + 1 - (1 - this.flood) * 4
      if (top <= base) continue
      const k = Math.min(1, Math.max(0, (isl.r + 2 - d) / 2))
      return base + (top - base) * k * k * (3 - 2 * k)
    }
    return base
  }

  /**
   * Steps refused at the lair: into it below Lv 10; out of it while the fight lasts; into flood water
   * deeper than she can wade. `player` marks her own steps, so the HUD can say why.
   */
  blocks(x: number, z: number, fx: number | undefined, fz: number | undefined, player: boolean, air = false): boolean {
    const inTo = this.inside(x, z)
    const inFrom = fx === undefined || fz === undefined ? null : this.inside(fx, fz)
    if (this.state === 'calm' && this.g.profile.level < HYDRA.lairLevel && inTo && inFrom !== true) {
      if (player) this.refusedAt = this.time
      return true
    }
    if (this.state === 'fight' && inFrom === true && !inTo) return true
    if (!air && this.flood > 0.3 && inTo && this.waterY - this.height(x, z, heightAt(x, z)) > MOVE.maxWade) return true
    return false
  }

  /** How deep she stands in the flood (m), for wading. */
  depthAt(x: number, z: number, y: number) {
    return this.flood > 0 && this.inside(x, z) ? Math.max(0, this.waterY - y) : 0
  }

  // ------------------------------------------------------------ the fight

  update(dt: number) {
    const g = this.g
    const p = g.player
    this.time += dt
    this.curtainMat.uniforms.uTime.value = this.time
    // water and islands follow the flood
    this.flood += (this.floodTo - this.flood) * Math.min(1, dt * 0.5)
    this.waterY = this.groundY - 3 + (3 + WATER_UP) * this.flood
    this.water.position.y = this.waterY
    this.water.visible = this.flood > 0.02
    for (const isl of this.islands) {
      isl.mesh.visible = this.flood > 0.02
      isl.mesh.position.y = this.groundY + 1 - 2 - (1 - this.flood) * 4
    }
    // the edge: amber while it is shut to her, violet while the fight holds her in
    const shut = this.state === 'calm' && g.profile.level < HYDRA.lairLevel
    const want = this.state === 'fight' ? 1 : shut ? 0.7 : 0
    const fade = this.curtainMat.uniforms.uFade.value as number
    this.curtainMat.uniforms.uFade.value = fade + (want - fade) * Math.min(1, dt * 2)
    ;(this.curtainMat.uniforms.uColor.value as THREE.Color).set(this.state === 'fight' ? COLOR.umbra : COLOR.rift)
    this.curtain.visible = this.curtainMat.uniforms.uFade.value > 0.01

    if (this.state === 'won') {
      if (this.time - this.wonAt > HYDRA.respawn) {
        this.reset()
        this.state = 'calm'
      }
      return
    }
    // the Hydra only lies in the lake while she is near: far away it would cost frames for nothing
    const near = Math.hypot(p.pos.x - this.center.x, p.pos.z - this.center.z)
    if (this.state === 'calm') {
      if (!this.body && near > HYDRA.wake) return
      if (this.body && near > HYDRA.sleep) {
        this.reset()
        return
      }
    }
