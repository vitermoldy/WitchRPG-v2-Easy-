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
    if (!this.body) this.spawn()
    const body = this.body!
    if (this.state === 'calm') {
      if (p.alive && this.inside(p.pos.x, p.pos.z) && g.profile.level >= HYDRA.lairLevel) this.start()
      return
    }
    if (!body.alive) return
    // heads go where the rig drew them, so the head she sees is the head she hits
    for (const h of this.heads) {
      if (!h || !h.alive || h.state === 'finishing' || !Number.isFinite(h.visual.x)) continue
      h.pos.set(h.visual.x, h.visual.y - h.height * 0.5, h.visual.z)
    }
    if (this.phase === 1 && body.hp <= body.maxHp * HYDRA.phase2At) this.enterPhase(2)
    else if (this.phase === 2 && body.hp <= body.maxHp * HYDRA.phase3At) this.enterPhase(3)
    if (this.phase < 3) this.headsFight(dt)
    else this.bodyFights(dt)
    // boulders come back on the islands while the flood is up
    if (this.phase >= 2 && Math.random() < dt * 0.3) {
      for (const isl of this.islands) {
        if (g.props.list.length >= HYDRA.rocks) break
        if (!g.props.list.some((r) => Math.hypot(r.pos.x - isl.x, r.pos.z - isl.z) < isl.r)) g.props.add(isl.x, isl.z)
      }
    }
  }

  private target(): THREE.Vector3 | null {
    const p = this.g.player
    return p.alive ? this.tmp.set(p.pos.x, p.pos.y, p.pos.z) : null
  }

  private headsFight(dt: number) {
    const g = this.g
    const body = this.body!
    const attacks = UNITS.hydraHead.attacks!
    const slam = attacks[0]
    const spit = attacks[1]
    const her = this.target()
    let busy = 0
    for (const h of this.heads) if (h && h.alive && (h.state === 'windup' || h.state === 'strike')) busy++
    this.attackIn -= dt
    if (her && this.attackIn <= 0 && busy < 2) {
      const idle = this.heads.filter((h): h is Unit => !!h && h.alive && h.state === 'move')
      if (idle.length) {
        // a head only comes down where its neck reaches; past that it spits
        const reach = Math.hypot(her.x - body.pos.x, her.z - body.pos.z)
        const useSpit = reach > HYDRA.slamReach + 1 || (this.phase === 2 && Math.random() < 0.55)
        // a slam comes from the head nearest her, a spit from any
        let h = idle[Math.floor(Math.random() * idle.length)]
        if (!useSpit) for (const o of idle) if (o.visual.distanceToSquared(her) < h.visual.distanceToSquared(her)) h = o
        this.windup(h, useSpit ? spit : slam, her)
        this.attackIn = this.phase === 1 ? 1.6 : 1.3
      }
    }
    for (const h of this.heads) {
      if (!h || !h.alive) continue
      const atk = h.atk
      if (h.state === 'windup') {
        if (her) h.aimAt.lerp(her, Math.min(1, dt * 1.5))
        if (!atk.shot) this.inReach(h.aimAt)
        if (h.t >= atk.windup) {
          if (atk.shot) {
            g.fire(h, atk)
            h.set('recover')
          } else h.set('strike')
        }
      } else if (h.state === 'strike' && h.t >= (atk.lungeTime ?? 0.25)) {
        this.land(h, atk)
        h.set('recover')
      } else if (h.state === 'recover' && h.t >= atk.recover) {
        if (!atk.shot) g.clearTelegraph(h)
        h.set('move')
      }
    }
  }

  /** Keeps a head's slam circle where its neck can lay the head: between slamNear and slamReach from the body. */
  private inReach(at: THREE.Vector3) {
    const b = this.body!
    const dx = at.x - b.pos.x
    const dz = at.z - b.pos.z
    const d = Math.hypot(dx, dz) || 1
    const k = Math.min(HYDRA.slamReach, Math.max(HYDRA.slamNear, d)) / d
    if (k === 1) return
    at.x = b.pos.x + dx * k
    at.z = b.pos.z + dz * k
    at.y = this.g.height(at.x, at.z)
  }

  private windup(u: Unit, atk: AttackSpec, at: THREE.Vector3) {
    u.atk = atk
    u.aimAt.copy(at)
    if (u !== this.body && !atk.shot) this.inReach(u.aimAt)
    u.lungeDir.set(at.x - u.pos.x, 0, at.z - u.pos.z).normalize()
    u.set('windup')
    this.g.telegraph(u)
  }

  /** A slam comes down on its circle: whoever stands inside is struck; in phase 1 it spews Imps. */
  private land(u: Unit, atk: AttackSpec) {
    const g = this.g
    const p = g.player
    const r = ringOf(atk)
    g.clearTelegraph(u)
    const low = p.pos.y - g.height(p.pos.x, p.pos.z) < 2.5
    if (p.alive && low && Math.hypot(p.pos.x - u.aimAt.x, p.pos.z - u.aimAt.z) < r + MOVE.radius) g.strikePlayer(u, atk)
    for (const s of g.units.units) {
      if (s.team === 'shadow' && s.targetable && Math.hypot(s.pos.x - u.aimAt.x, s.pos.z - u.aimAt.z) < r + s.radius) g.strikeUnit(u, s, atk)
    }
    const at = u.aimAt.clone()
    at.y = g.height(at.x, at.z)
    g.rings.spawn(at, COLOR.rift, 0.5, r + 1, 0.4)
    g.smoke.emit({ pos: at, count: 14, color: 0x2a2a20, life: 1.2, size: 1, sizeEnd: 2, speed: 2, alpha: 0.6 })
    g.addTrauma(0.3)
    g.sfx.impact(1.2)
    const body = this.body
    if (this.phase === 1 && body && u !== body) {
      const n = Math.min(HYDRA.impsPerSlam, HYDRA.maxImps - body.helpers)
      for (let k = 0; k < n; k++) {
        // only onto ground she can reach: an Imp in deep water could never come out, nor be struck
        let spot: { x: number; z: number } | null = null
        for (let tries = 0; tries < 8 && !spot; tries++) {
          const a = Math.random() * Math.PI * 2
          const x = at.x + Math.cos(a) * 2.5
          const z = at.z + Math.sin(a) * 2.5
          if (!g.blocked(x, z) && this.inside(x, z)) spot = { x, z }
        }
        if (!spot) break
        const imp = g.units.spawn('imp', 'enemy', 10, spot, true)
        imp.owner = body
        imp.aggro = true
        body.helpers++
        g.summoned(imp)
      }
    }
  }

  /** Phase 3: the body crawls to the shore, slams under a wide circle and spits volleys. */
  private bodyFights(dt: number) {
    const g = this.g
    const body = this.body!
    const to = this.bodyAt(3)
    const step = Math.min(1, dt * 0.6)
    body.pos.x += (to.x - body.pos.x) * step
    body.pos.z += (to.z - body.pos.z) * step
    body.pos.y += (Math.max(g.height(body.pos.x, body.pos.z), this.waterY - 1.2) - body.pos.y) * step
    const her = this.target()
    const slam = UNITS.hydra.attacks![0]
    const spit = UNITS.hydraHead.attacks![1]
    if (body.state === 'move') {
      if (her) body.yaw = Math.atan2(her.x - body.pos.x, her.z - body.pos.z)
      this.bodyAttackIn -= dt
      if (her && this.bodyAttackIn <= 0) {
        const d = Math.hypot(her.x - body.pos.x, her.z - body.pos.z)
        if (d < 15) this.windup(body, slam, her)
        else {
          // a volley of three globs around her, each on its own amber circle
          for (let k = 0; k < 3; k++) {
            body.aimAt.set(her.x + (Math.random() - 0.5) * 6, her.y, her.z + (Math.random() - 0.5) * 6)
            body.lungeDir.set(body.aimAt.x - body.pos.x, 0, body.aimAt.z - body.pos.z).normalize()
            body.atk = spit
            g.fire(body, spit)
            g.warnings.show(body.aimAt, ringOf(spit), Math.max(0.3, Math.hypot(body.aimAt.x - body.pos.x, body.aimAt.z - body.pos.z) / spit.shot!.speed))
          }
        }
        this.bodyAttackIn = 3.2
      }
    } else if (body.state === 'windup') {
      if (her) body.aimAt.lerp(her, Math.min(1, dt * 1.2))
      if (body.t >= slam.windup) body.set('strike')
    } else if (body.state === 'strike' && body.t >= 0.3) {
      this.land(body, slam)
      body.set('recover')
    } else if (body.state === 'recover' && body.t >= slam.recover) body.set('move')
  }

  /** ?debug: what the bot and the tests read. */
  info() {
    const b = this.body
    return {
      state: this.state,
      phase: this.phase,
      hp: b ? Math.round(b.hp) : 0,
      maxHp: b ? Math.round(b.maxHp) : 0,
      heads: this.heads.map((h) => (h ? (h.alive ? h.state : 'severed') : 'swallowed')),
      flood: +this.flood.toFixed(2),
      rocks: this.g.props.list.length,
    }
  }
}
