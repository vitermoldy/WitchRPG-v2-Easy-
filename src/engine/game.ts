import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { CAMERA, CHAOS, COMBAT, EFFECTS, ELITE, MOVE, REVIVE, RITE, V2_KINDS, type AttackSpec, type EliteTrait, type UnitKind, type V2Kind } from '../game/balance'
import { addShadow, chaosFromDamage, derive, gainXp, xpForUnit, type Derived, type Profile } from '../game/progression'
import { loadProfile, saveProfile } from '../game/save'
import { SKILLS, skillById } from '../game/skills'
import { Hud } from '../ui/hud'
import { Ambient } from '../world/ambient'
import { Atmosphere, water } from '../world/atmosphere'
import { Altars } from '../world/altars'
import { Lair } from '../world/lair'
import { Seal } from '../world/seal'
import { Camps } from '../world/camps'
import { Fauna } from '../world/fauna'
import { addColliders, Forest, scatter } from '../world/forest'
import { heightAt, inWaterRect, PLAY_HALF, SPOTS, toMap, toWorld, WATER_LEVEL, ZONES } from '../world/map'
import { Terrain } from '../world/terrain'
import { Sfx } from './audio'
import { CameraRig, yawTo, type CamPose } from './camera'
import { resolveDefense } from './combat'
import { Fight } from './fight'
import { LightPool, Particles, Rings, ShadowPools, Warnings } from './fx'
import { Input } from './input'
import { LockOn, lockPoint } from './lockon'
import { idlePose, IlyraModel, loadModel, type IlyraPose } from './models'
import { Obstacles } from './obstacles'
import { COLOR } from './palette'
import { Player, type Ground, type MoveInput } from './player'
import { Projectiles } from './projectiles'
import { Props } from './props'
import { Rigs } from './rigs'
import { Spells } from './spells'
import { Telegraphs } from './telegraph'
import { Umbra } from './umbra'
import { shieldShare, Unit, UnitSystem, type DamageKind, type Foe, type UnitHost } from './units'

export type State = 'loading' | 'title' | 'playing' | 'paused'

/** Inputs a ?debug bot can hold instead of the keyboard and mouse; buttons go through `input.press`. */
export interface BotInput {
  x: number
  y: number
  sprint: boolean
  aim: boolean
  /** Turn the camera by this much per second (radians). */
  turn: number
  /** While flying: 1 climbs, -1 sinks. */
  rise?: number
}

export interface AimHit {
  point: THREE.Vector3
  dist: number
  unit: Unit | null
}

const FRAME_SAMPLES = 900
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

export class Game implements UnitHost {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(CAMERA.normal.fov, 16 / 9, CAMERA.near, CAMERA.far)
  readonly input: Input
  readonly rig = new CameraRig()
  readonly player = new Player()
  readonly lockon = new LockOn()
  readonly obstacles = new Obstacles()
  readonly profile = loadProfile().profile
  readonly sfx = new Sfx()
  readonly units: UnitSystem
  readonly fight: Fight
  readonly spells: Spells
  readonly umbra: Umbra
  readonly hud: Hud
  readonly shots: Projectiles
  derived: Derived
  glow!: Particles
  smoke!: Particles
  lights!: LightPool
  rings!: Rings
  warnings!: Warnings
  pools!: ShadowPools
  telegraphs!: Telegraphs
  rigs!: Rigs
  camps!: Camps
  fauna!: Fauna
  altars!: Altars
  lair!: Lair
  seal!: Seal
  props!: Props
  ilyra!: IlyraModel
  ground!: Ground
  state: State = 'loading'
  /** ?debug: run the simulation this many fixed steps per frame. */
  debugSpeed = 1
  /** ?debug: wait for the GPU after every frame (reads one pixel), so frame times include all GPU work. */
  syncFrames = false
  /** ?debug: when set, the bot drives her instead of the keyboard. */
  bot: BotInput | null = null
  /** ?debug: called at the start of every simulation step, so a bot can react on the exact frame. */
  botThink: ((g: Game, dt: number) => void) | null = null
  /** ?debug: holds her in a pose for the animation check sheet. */
  debugPose: Partial<IlyraPose> | null = null
  /** ?debug: a fixed camera around her (angle from her facing, radians; distance in metres). */
  debugCam: { angle: number; dist: number } | null = null
  /** Game seconds played (simulation time, includes debugSpeed). */
  t = 0
  sensitivity = 1
  onPause: (() => void) | null = null
  readonly counts = { kills: 0, campsCleared: 0, falls: 0, damageTaken: 0, levelUps: 0 }
  /** ?debug: every blow that reached her and how it resolved, for the test bot's report. */
  readonly strikeLog: { t: number; kind: string; strike: string; res: string; angle: number; blocking: boolean; since: number; swing: boolean; rolling: boolean }[] = []
  /** The target of creatures' blows: her feet, her size, and whether she stands. */
  readonly foe: Foe = { pos: new THREE.Vector3(), radius: MOVE.radius, alive: true }

  private readonly debug: boolean
  private readonly composer: EffectComposer
  private readonly bloom: UnrealBloomPass
  private readonly timer = new THREE.Timer()
  private terrain!: Terrain
  private forest!: Forest
  private atmosphere!: Atmosphere
  private ambient!: Ambient
  private pivotY = 0
  private cullIn = 0
  private botDodge = false
  private botLock = false
  private lastFrame = 0
  private readonly frames = new Float32Array(FRAME_SAMPLES)
  private frameCount = 0
  private minClearance = Infinity
  private readonly v = new THREE.Vector3()
  private gpu = ''
  private readonly pixel = new Uint8Array(4)
  private hitstopT = 0
  private trauma = 0
  private hurtGrace = 0
  private calm = 0
  private deadT = 0
  private saveIn = -1
  private readonly pose = idlePose()
  /** Bursts waiting on their amber circles: elites that explode, a Phoenix's second fall. */
  private readonly blasts: { x: number; y: number; z: number; radius: number; damage: number; t: number }[] = []
  private readonly ray = new THREE.Ray()
  private readonly sphere = new THREE.Sphere()

  constructor(canvas: HTMLCanvasElement, debug: boolean) {
    this.debug = debug
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    // counted over every pass of a frame (shadows, scene, bloom), reset by hand in tick()
    this.renderer.info.autoReset = false
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    const gl = this.renderer.getContext()
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    this.gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown'

    this.input = new Input(canvas)
    this.input.virtualLock = debug
    this.input.onLockChange = (locked) => {
      if (!locked && this.state === 'playing' && !this.debug) this.pause()
    }
    this.sensitivity = this.profile.settings.sensitivity
    this.derived = derive(this.profile.stats, this.profile.level)
    this.applyDerived(true)
    this.units = new UnitSystem(this)
    this.fight = new Fight(this)
    this.spells = new Spells(this)
    this.umbra = new Umbra(this)
    this.hud = new Hud(this)
    this.shots = new Projectiles(this)
    this.scene.add(this.shots.group)

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    // One NaN pixel blurred by bloom turns the whole screen black (v1). Zero any that slip through.
    this.composer.addPass(
      new ShaderPass({
        uniforms: { tDiffuse: { value: null } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        // isnan() is optimised away by the D3D compiler behind ANGLE, so test the exponent bits.
        fragmentShader: [
          'uniform sampler2D tDiffuse;',
          'varying vec2 vUv;',
          'bool bad(float v) { return (floatBitsToUint(v) & 0x7f800000u) == 0x7f800000u; }',
          'void main() {',
          '  vec4 c = texture2D(tDiffuse, vUv);',
          '  if (bad(c.r) || bad(c.g) || bad(c.b) || bad(c.a)) c = vec4(0.0);',
          '  gl_FragColor = clamp(c, 0.0, 60000.0);',
          '}',
        ].join('\n'),
      }),
    )
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.5, 0.86)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
    window.addEventListener('resize', () => this.resize())
    this.resize()
  }

  // ------------------------------------------------------------ UnitHost

  /** Ground height, with the Hydra's islands standing out of the flood. */
  height(x: number, z: number) {
    const base = heightAt(x, z)
    return this.lair ? this.lair.height(x, z, base) : base
  }

  /** Deep water and the map edge; then the seal on zones IV and V, and the lair's edge. */
  private baseBlocked(x: number, z: number) {
    const [mx, my] = toMap(x, z)
    if (Math.abs(mx) > PLAY_HALF || Math.abs(my) > PLAY_HALF) return true
    return inWaterRect(mx, my) && WATER_LEVEL - heightAt(x, z) > MOVE.maxWade
  }

  /** Past the edge of the playable map. */
  private offMap(x: number, z: number) {
    const [mx, my] = toMap(x, z)
    return Math.abs(mx) > PLAY_HALF || Math.abs(my) > PLAY_HALF
  }

  blocked(x: number, z: number, fx?: number, fz?: number) {
    return this.baseBlocked(x, z) || this.seal.blocks(x, z, fx, fz) || this.lair.blocks(x, z, fx, fz, false)
  }

  /** Game time a step of hers was refused by the seal, for the HUD. */
  sealRefusedAt = -99

  /** A creature's blow on her lands now: dodge, parry, block or hit. */
  strikePlayer(u: Unit, atk: AttackSpec = u.atk) {
    const p = this.player
    if (!p.alive || this.hurtGrace > 0) return
    const strike = atk.strike
    const angle = wrap(yawTo(p.pos.x, p.pos.z, u.pos.x, u.pos.z) - p.facing)
    const res = resolveDefense(this.t, strike, p.invulnerable || this.fight.invulnerable, this.fight.blocking, this.fight.blockPressedAt, angle)
    if (this.debug && this.strikeLog.length < 2000) this.strikeLog.push({ t: this.t, kind: u.kind, strike, res, angle: +angle.toFixed(2), blocking: this.fight.blocking, since: +(this.t - this.fight.blockPressedAt).toFixed(3), swing: !!this.fight.combo.current, rolling: p.dodging })
    const mid = this.v.set((p.pos.x + u.pos.x) / 2, p.pos.y + 1.1, (p.pos.z + u.pos.z) / 2)
    if (res === 'dodge') {
      this.fight.stats.dodged++
      return
    }
    if (res === 'parry') {
      this.fight.stats.parries++
      this.fight.parried()
      this.units.hurt(u, 0, p.pos, COMBAT.parry.stun, 5)
      this.spells.addChaos(4)
      this.sfx.parry()
      this.hitstop(COMBAT.hitstop.parry)
      this.addTrauma(0.15)
      this.glow.emit({ pos: mid, count: 26, color: 0xfff2e0, intensity: 3.2, life: 0.3, size: 0.1, sizeEnd: 0.01, speed: 7, gravity: 8 })
      this.lights.flash(mid, COLOR.chaosHot, 10, 6, 0.2)
      this.hud.parry()
      return
    }
    if (res === 'block') {
      this.fight.stats.blocks++
      this.units.hurt(u, 0, p.pos, 6, 2)
      p.nudge(p.pos.x - u.pos.x, p.pos.z - u.pos.z, 0.35, 0.14)
      this.sfx.clank()
      this.hitstop(COMBAT.hitstop.light)
      this.glow.emit({ pos: mid, count: 10, color: COLOR.rift, intensity: 2.4, life: 0.25, size: 0.08, speed: 4, gravity: 8 })
      return
    }
    if (strike === 'ring') this.fight.stats.hitRing++
    else this.fight.stats.hitLine++
    this.hurtPlayer(u.damage * (atk.damage ?? 1), u.pos)
    if (!p.alive) return
    if (atk.effect === 'petrify' && this.spells.barrierT <= 0) {
      p.petrified = EFFECTS.petrify
      this.fight.reset(true)
      this.hud.message(`${u.spec.name} membatukan Ilyra. Tahan C saat tatapannya penuh, atau pasang Hex Barrier.`, 'chaos')
    }
    if (atk.effect === 'poison') {
      p.poisonT = EFFECTS.poisonTime
      p.poisonDps = u.damage * EFFECTS.poisonShare
    }
  }

  /** A blow between a creature and a shadow. */
  strikeUnit(u: Unit, target: Unit, atk?: AttackSpec) {
    const focus = u.team === 'shadow' && target === u.focus ? 1 + u.focusBonus : 1
    this.hurtUnit(target, u.damage * focus * (atk?.damage ?? 1), u.pos, u.team === 'shadow' ? 4 : 0, 1.5, u.team === 'shadow' ? 'shadow' : 'enemy', 'shadow')
  }

  fire(u: Unit, atk: AttackSpec) {
    this.shots.fire(u, atk)
  }

  fx(u: Unit, what: 'blink' | 'ashes' | 'reborn', from?: THREE.Vector3) {
    if (what === 'blink') {
      if (Math.hypot(u.pos.x - this.player.pos.x, u.pos.z - this.player.pos.z) < 40) this.sfx.blink()
      for (const at of [from ?? u.pos, u.pos]) {
        this.smoke.emit({ pos: at, count: 10, color: 0x1a1020, life: 0.8, size: 0.8, sizeEnd: 1.5, speed: 1.4, jitter: 0.4, alpha: 0.75 })
        this.glow.emit({ pos: { x: at.x, y: at.y + 1.2, z: at.z }, count: 16, color: 0x5fe0a0, intensity: 2.4, life: 0.5, size: 0.14, speed: 3 })
      }
    } else if (what === 'ashes') {
      this.sfx.ashes()
      this.smoke.emit({ pos: u.pos, count: 14, color: 0x2a2420, life: 1.6, size: 1, sizeEnd: 2, speed: 0.8, vel: { x: 0, y: 0.8, z: 0 }, alpha: 0.7 })
      this.hud.message(`${u.spec.name} jatuh menjadi abu, dan akan bangkit sekali lagi. Eksekusi mencegahnya.`, 'info')
    } else {
      this.glow.emit({ pos: u.center(), count: 60, color: 0xff7a2a, intensity: 3, life: 0.8, size: 0.22, sizeEnd: 0.03, speed: 6, gravity: -1 })
      this.rings.spawn(u.pos, 0xff7a2a, 0.5, 5, 0.5)
      this.sfx.burst()
    }
  }

  /** A burst lands `delay` seconds from now on an amber circle: step out of it, or roll through. */
  private blastLater(at: THREE.Vector3, radius: number, damage: number, delay: number) {
    this.warnings.show(at, radius, delay)
    this.blasts.push({ x: at.x, y: at.y, z: at.z, radius, damage, t: delay })
  }

  private updateBlasts(dt: number) {
    const p = this.player
    for (let i = this.blasts.length - 1; i >= 0; i--) {
      const b = this.blasts[i]
      b.t -= dt
      if (b.t > 0) continue
      this.blasts.splice(i, 1)
      const at = new THREE.Vector3(b.x, b.y, b.z)
      const low = p.pos.y - this.height(p.pos.x, p.pos.z) < 2.5
      if (p.alive && low && Math.hypot(p.pos.x - b.x, p.pos.z - b.z) < b.radius + MOVE.radius && !p.invulnerable) this.hurtPlayer(b.damage, at)
      for (const u of this.units.units) if (u.team === 'shadow' && u.targetable && Math.hypot(u.pos.x - b.x, u.pos.z - b.z) < b.radius + u.radius) this.units.hurt(u, b.damage, at)
      this.glow.emit({ pos: at.clone().setY(b.y + 0.6), count: 90, color: 0xff7a2a, intensity: 3, life: 0.6, size: 0.4, sizeEnd: 0.05, speed: b.radius * 1.5, drag: 3 })
      this.rings.spawn(at, 0xff7a2a, 0.4, b.radius, 0.4)
      this.sfx.burst()
      this.addTrauma(0.3)
    }
  }

  summoned(h: Unit) {
    this.pools.open(h.pos, 1 + h.radius * 1.5, 1)
    this.glow.emit({ pos: h.center(), count: 18, color: COLOR.rift, intensity: 2.2, life: 0.6, size: 0.18, speed: 2.5 })
  }

  impact(u: Unit, other: Unit | null, speed: number) {
    this.spells.impact(u, other, speed)
  }

  died(u: Unit) {
    if (u.team === 'shadow') {
      this.umbra.shadowFell(u)
      return
    }
    if (u.spec.part) {
      this.lair.partDied(u)
      return
    }
    if (u === this.lair.body) this.lair.bossDied()
    this.counts.kills++
    this.reward(u)
    if (u.elite === 'meledak') this.blastLater(u.pos.clone(), ELITE.burst.radius, u.damage * ELITE.burst.damage, ELITE.burst.delay)
    const rb = u.spec.rebirth
    if (rb && u.reborn) this.blastLater(u.pos.clone(), rb.burst, u.damage * 2, rb.delay)
    this.smoke.emit({ pos: u.pos, count: 6, color: 0x2a2024, life: 1, size: 0.6, sizeEnd: 1.2, speed: 0.8, alpha: 0.5 })
  }

  telegraph(u: Unit) {
    if (u.team !== 'enemy') return
    this.telegraphs.show(u)
    // both kinds have their own sound too, so the warning does not depend on sight alone
    const near = Math.hypot(u.pos.x - this.player.pos.x, u.pos.z - this.player.pos.z) < 30
    if (near) this.sfx.warn(u.spec.strike ?? 'ring')
  }

  clearTelegraph(u: Unit) {
    this.telegraphs?.clear(u)
  }

  // ------------------------------------------------------------ setup

  /** Builds the valley, loads the models and warms the shaders. */
  async init(progress: (step: string) => void) {
    progress('Membentuk lembah')
    await frame()
    this.terrain = new Terrain()
    this.scene.add(this.terrain.group)
    this.atmosphere = new Atmosphere(this.scene)
    this.ambient = new Ambient(this.scene)
    this.scene.add(water())
    this.ground = {
      height: (x, z) => this.height(x, z),
      obstacles: this.obstacles,
      blocked: (x, z, fx, fz, air) => {
        if (air ? this.offMap(x, z) : this.baseBlocked(x, z)) return true
        if (this.seal.blocks(x, z, fx, fz)) {
          this.sealRefusedAt = this.t
          return true
        }
        return this.lair.blocks(x, z, fx, fz, true, air)
      },
      floor: (x, z) => {
        let y = this.height(x, z)
        const [mx, my] = toMap(x, z)
        if (inWaterRect(mx, my)) y = Math.max(y, WATER_LEVEL + 0.3)
        if (this.lair.flood > 0.05 && this.lair.inside(x, z)) y = Math.max(y, this.lair.waterY + 0.3)
        return y
      },
    }
    this.seal = new Seal(this.profile.bossKills > 0)
    this.scene.add(this.seal.mesh)
    this.glow = new Particles(5000, 'glow')
    this.smoke = new Particles(1400, 'smoke')
    this.scene.add(this.glow.points, this.smoke.points)
    // every point light is paid for by every lit pixel of the forest, every frame: keep the pool small
    this.lights = new LightPool(this.scene, 4)
    this.rings = new Rings(this.scene, 12)
    this.warnings = new Warnings(this.scene, 12)
    this.pools = new ShadowPools(this.scene, 140)
    this.telegraphs = new Telegraphs(this.scene, (x, z) => this.height(x, z))
    progress('Menanam hutan')
    await frame()
    const trees = scatter()
    addColliders(trees, this.obstacles)
    this.forest = new Forest(trees)
    this.scene.add(this.forest.mesh)
    progress('Memanggil Ilyra dan makhluk hutan')
    const [ilyra, ...creatures] = await Promise.all([
      loadModel('./models/ilyra.glb'),
      ...V2_KINDS.map((k) => loadModel(`./models/${k}.glb`)),
      ...V2_KINDS.map((k) => loadModel(`./models/${k}_lod.glb`)),
    ])
    this.ilyra = new IlyraModel(ilyra)
    // in first person her body is hidden from the view but still casts its shadow
    this.atmosphere.sun.shadow.camera.layers.enable(IlyraModel.HIDDEN_LAYER)
    if (this.profile.settings.firstPerson) {
      this.rig.firstPerson = true
      this.rig.fp = 1
      this.ilyra.firstPerson(true)
    }
    this.scene.add(this.ilyra.root)
    const models: Partial<Record<UnitKind, THREE.Group>> = {}
    const lods: Partial<Record<UnitKind, THREE.Group>> = {}
    V2_KINDS.forEach((k, i) => {
      models[k] = creatures[i]
      lods[k] = creatures[V2_KINDS.length + i]
    })
    this.rigs = new Rigs(models, lods)
    this.rigs.detail = this.profile.settings.detail
    this.rigs.prepare([...V2_KINDS])
    this.scene.add(this.rigs.group)
    this.camps = new Camps(this)
    this.fauna = new Fauna(this)
    this.scene.add(this.camps.group)
    this.altars = new Altars(this)
    this.scene.add(this.altars.group)
    this.props = new Props(this)
    this.scene.add(this.props.mesh)
    this.lair = new Lair(this)
    this.scene.add(this.lair.group)
    this.spawn(SPOTS.hero[0], SPOTS.hero[1], 0.3, 1)
    progress('Menyiapkan cahaya dan shader')
    await frame()
    this.terrain.prepare(this.camera.position)
    this.forest.cull(this.player.pos.x, this.player.pos.z)
    this.renderer.compile(this.scene, this.camera)
    this.state = 'title'
  }

  /** Puts her at a map point facing a map direction, with the camera behind her. */
  spawn(mx: number, my: number, fx = 0, fy = 1) {
    const [x, z] = toWorld(mx, my)
    this.placeAt(x, z, yawTo(0, 0, fx, -fy))
  }

  /** Puts her at a world point facing `yaw`, with the camera behind her. */
  placeAt(x: number, z: number, yaw: number) {
    this.player.place(x, z, this.ground, yaw)
    this.obstacles.pushOut(this.player.pos, MOVE.radius, MOVE.height)
    this.player.pos.y = heightAt(this.player.pos.x, this.player.pos.z)
    this.rig.yaw = yaw
    this.rig.pitch = (CAMERA.pitch * Math.PI) / 180
    this.rig.aim = 0
    this.rig.lock = 0
    this.rig.frac = 1
    this.pivotY = this.player.pos.y + CAMERA.normal.height
    this.lockon.current = null
    this.place(1 / 60, true)
    this.ilyra.update(0, this.player, 0, this.pose)
  }

  start() {
    // a witch who has lit other altars enters the forest at the one she last rose at
    if (this.profile.world.last !== 'pembuka' && this.profile.world.altars.includes(this.profile.world.last)) {
      const a = this.altars.byKey(this.profile.world.last)
      const at = this.altars.standAt(a)
      this.placeAt(at.x, at.z, yawTo(at.x, at.z, a.pos.x, a.pos.z) + Math.PI)
    }
    this.state = 'playing'
    this.input.capture = true
    this.sfx.start()
    this.sfx.setVolume(this.profile.settings.volume)
    this.hud.show(true)
    this.lastFrame = performance.now()
  }

  pause() {
    if (this.state !== 'playing') return
    this.state = 'paused'
    this.input.capture = false
    this.sfx.suspend()
    this.saveNow()
    this.onPause?.()
  }

  /** A menu (the Ledger, an altar) holds the game without the pause screen. */
  openMenu() {
    if (this.state !== 'playing') return
    this.state = 'paused'
    this.input.capture = false
    this.input.releaseAll()
    this.saveNow()
  }

  resume() {
    if (this.state !== 'paused') return
    this.state = 'playing'
    this.input.capture = true
    this.sfx.resume()
    this.lastFrame = performance.now()
  }

  run() {
    this.timer.connect(document)
    this.renderer.setAnimationLoop((ts) => {
      this.timer.update(ts)
      this.tick()
    })
  }

  // ------------------------------------------------------------ her vitals, levels and falls

  /** Stats and level changed: new max HP and mana (keeping the share she had), pace, roll. */
  private applyDerived(fill = false) {
    const p = this.player
    const d = (this.derived = derive(this.profile.stats, this.profile.level))
    const hpShare = fill ? 1 : p.hp / p.maxHp
    const manaShare = fill ? 1 : p.mana / p.maxMana
    p.maxHp = d.maxHp
    p.maxMana = d.maxMana
    p.hp = p.maxHp * hpShare
    p.mana = p.maxMana * manaShare
    p.speedMult = d.speedMult
    p.dodgeDistance = d.dodgeDistance
  }

  private reward(u: Unit) {
    const res = gainXp(this.profile, xpForUnit(u.kind, u.level, !!u.elite), SKILLS.map((s) => s.id))
    if (res.levelsGained) {
      this.counts.levelUps += res.levelsGained
      this.applyDerived()
      // a new level steadies her: HP and mana back to full
      this.player.hp = this.player.maxHp
      this.player.mana = this.player.maxMana
      this.sfx.levelUp()
      this.hud.banner(`Lv ${this.profile.level}`, `${res.levelsGained * 3} poin stat dan ${res.levelsGained} poin skill menunggu di Ledger`)
      for (const id of res.unlocked) {
        const def = skillById(id)
        this.hud.message(`${def.name} terbuka (${def.key}): ${def.effect}`, 'level')
      }
    }
    this.saveSoon()
  }

  /** Stats or upgrades changed in the Ledger: new derived numbers, kept in the save. */
  statsChanged() {
    this.applyDerived()
    this.saveNow()
  }

  private refusedMsgAt = -99

  /** When a step of hers was just refused by the seal or the lair, say why (not too often). */
  private refusals() {
    if (this.t - this.refusedMsgAt < 5) return
    if (this.t - this.sealRefusedAt < 0.1) {
      this.refusedMsgAt = this.t
      this.sfx.refused()
      this.hud.message('Reruntuhan Kuil dan Lembah Bara tersegel sampai Hydra di Danau Hitam kalah.', 'info')
    } else if (this.t - this.lair.refusedAt < 0.1) {
      this.refusedMsgAt = this.t
      this.sfx.refused()
      this.hud.message('Sarang Hydra hanya terbuka untuk witch Lv 10: fase terakhirnya hanya bisa dimenangkan di dalam Reality Warp.', 'info')
    }
  }

  /** Damage to her after the barrier. */
  hurtPlayer(dmg: number, from: { x: number; z: number }) {
    const p = this.player
    if (!p.alive) return
    const d = this.spells.absorb(dmg)
    this.calm = 0
    if (d <= 0) return
    p.hp -= d
    this.counts.damageTaken += d
    this.hurtGrace = COMBAT.hurtGrace
    this.fight.hurt()
    this.umbra.interrupt()
    this.spells.addChaos(chaosFromDamage(0, d))
    this.hud.hurtFlash(Math.min(0.7, (d / p.maxHp) * 3 + 0.15))
    this.sfx.hurt()
    this.addTrauma(0.28)
    p.nudge(p.pos.x - from.x, p.pos.z - from.z, 0.7, 0.18)
    if (p.hp <= 0) this.fall()
  }

  /** Damage to a creature or shadow; her blows fill the Chaos meter and flash the hit mark. */
  hurtUnit(u: Unit, dmg: number, from: { x: number; z: number }, stun: number, knock: number, source: 'player' | 'shadow' | 'enemy', kind: DamageKind = 'melee'): boolean {
    if (!u.targetable) return false
    if ((u.kind === 'hydra' || u.kind === 'hydraHead') && u.team === 'enemy' && this.lair.body) return this.hurtHydra(u, dmg, from, stun, source, kind)
    let share = shieldShare(u, from.x, from.z, kind)
    // elite Berlapis: only thrown things go through its plates
    if (u.elite === 'berlapis' && kind !== 'impact' && kind !== 'staff') share *= ELITE.armor
    // an elite Penjaga shields the creatures around it while it stands
    if (u.team === 'enemy' && !u.elite) {
      for (const o of this.units.units) {
        if (o.elite === 'penjaga' && o.targetable && o !== u && Math.hypot(o.pos.x - u.pos.x, o.pos.z - u.pos.z) < ELITE.ward.radius) {
          share *= ELITE.ward.share
          break
        }
      }
    }
    if (share < 1) {
      // turned aside by the shield: a spark and a clank, a little stun gets through
      dmg *= share
      stun *= 0.3
      if (source === 'player') {
        this.sfx.clank()
        this.glow.emit({ pos: u.center(this.v), count: 8, color: 0xfff2e0, intensity: 2.4, life: 0.25, size: 0.08, speed: 4, gravity: 6 })
      }
    }
    const died = this.units.hurt(u, dmg, from, stun, knock)
    if (source === 'player') {
      this.spells.addChaos(chaosFromDamage(dmg, 0))
      this.hud.hit(died)
    }
    return died
  }

  /** A blow on the Hydra: its phase decides the share; a head takes the stun and passes the damage to the body. */
  private hurtHydra(u: Unit, dmg: number, from: { x: number; z: number }, stun: number, source: 'player' | 'shadow' | 'enemy', kind: DamageKind): boolean {
    const share = this.lair.share(u, kind)
    const body = this.lair.body!
    if (share <= 0) {
      // phase 3 outside Reality Warp: nothing gets through
      if (source === 'player' && this.t - this.immuneAt > 0.4) {
        this.immuneAt = this.t
        this.sfx.clank()
        this.glow.emit({ pos: u.center(this.v), count: 10, color: 0xfff2e0, intensity: 2.2, life: 0.25, size: 0.1, speed: 4 })
        if (this.t - this.immuneMsgAt > 6) {
          this.immuneMsgAt = this.t
          this.hud.message('Hydra kebal. Pasang Reality Warp (V) di atasnya: di dalam medan jantungnya terbuka.', 'chaos')
        }
      }
      return false
    }
    dmg *= share
    if (u !== body) this.units.hurt(u, 0, from, stun, 0)
    const died = this.units.hurt(body, dmg, from, u === body ? stun : 0, 0)
    if (source === 'player') {
      this.spells.addChaos(chaosFromDamage(dmg, 0))
      this.hud.hit(died)
    }
    return died
  }

  private immuneAt = -9
  private landMsgAt = -99

  /** P: first person (her eyes, as in v1) or third person (over her shoulder). Kept in her settings. */
  toggleView(first = !this.rig.firstPerson) {
    this.rig.firstPerson = first
    this.ilyra.firstPerson(first)
    this.profile.settings.firstPerson = first
    this.saveSoon()
    this.hud.message(first ? 'Pandangan orang pertama. Tekan P untuk kembali ke belakang bahu.' : 'Pandangan orang ketiga, dari belakang bahu.', 'info')
  }
  private immuneMsgAt = -99

  private fall() {
    const p = this.player
    p.hp = 0
    p.alive = false
    this.deadT = 0
    this.counts.falls++
    this.fight.reset()
    this.umbra.cancel()
    this.lockon.current = null
    this.telegraphs.clearAll()
    this.shots.clear()
    this.blasts.length = 0
    this.warnings.clear()
    for (const u of this.units.units) u.token = false
    this.sfx.collapse()
    this.hud.message(`Ilyra tumbang. Ia bangkit lagi di ${this.altars.byKey(this.profile.world.last).name}; XP dan bayangan tetap.`, 'chaos')
  }

  private revive() {
    const p = this.player
    this.camps.sleepAll()
    if (this.lair.state === 'fight') this.lair.reset()
    this.umbra.dismiss(true)
    this.spells.reset()
    this.spells.chaos = 0
    p.alive = true
    p.petrified = 0
    p.poisonT = 0
    this.applyDerived(true)
    // she rises at the last altar she stood at
    const a = this.altars.byKey(this.profile.world.last)
    const at = this.altars.standAt(a)
    this.placeAt(at.x, at.z, yawTo(at.x, at.z, a.pos.x, a.pos.z) + Math.PI)
    this.hud.fade()
    this.saveNow()
  }

  /** Fast travel from one lit altar to another; the shadows on the field come along. */
  travel(key: string) {
    if (!this.profile.world.altars.includes(key) || !this.player.alive) return
    const a = this.altars.byKey(key)
    const at = this.altars.standAt(a)
    this.fight.reset()
    this.umbra.cancel()
    this.telegraphs.clearAll()
    this.shots.clear()
    this.placeAt(at.x, at.z, yawTo(at.x, at.z, a.pos.x, a.pos.z) + Math.PI)
    this.profile.world.last = key
    for (const u of this.umbra.field()) {
      const spot = this.umbra.spot(u.slot)
      u.pos.copy(spot)
      u.vel.set(0, 0, 0)
      u.groundX = NaN
      u.command = 'follow'
      u.focus = null
      u.set('rising')
      this.pools.open(spot, 0.9 + u.radius * 1.6, 1.2)
    }
    this.hud.fade()
    this.sfx.warp()
    this.saveNow()
  }

  hitstop(s: number) {
    this.hitstopT = Math.max(this.hitstopT, s)
  }

  addTrauma(k: number) {
    this.trauma = Math.min(1, this.trauma + k)
  }

  saveSoon() {
    if (this.saveIn < 0) this.saveIn = 2
  }

  saveNow() {
    this.saveIn = -1
    saveProfile(this.profile)
    this.onSaved?.()
  }

  /** After every save of the witch; the account layer sends it to the server. */
  onSaved: (() => void) | null = null

  /** A witch from the server takes this one's place, on the start screen before she enters the forest. */
  adoptProfile(p: Profile) {
    const own = this.profile as unknown as Record<string, unknown>
    for (const k of Object.keys(own)) if (!(k in p)) delete own[k]
    Object.assign(this.profile, p)
    saveProfile(this.profile, false)
    this.sensitivity = p.settings.sensitivity
    this.rigs.detail = p.settings.detail
    this.sfx.setVolume(p.settings.volume)
    if (p.bossKills > 0) this.seal.unlock()
    this.applyDerived(true)
  }

  // ------------------------------------------------------------ aiming from the shoulder camera

  /** The first creature, tree, rock or patch of ground along the middle of the view. */
  aim(maxDist: number): AimHit {
    const o = this.camera.position
    const dir = this.camera.getWorldDirection(new THREE.Vector3())
    // skip the stretch between the camera and her, so a creature behind her shoulder is not picked
    const skip = Math.max(0, this.v.set(this.player.pos.x, this.player.pos.y + 1.4, this.player.pos.z).sub(o).dot(dir) - 0.3)
    const end = o.clone().addScaledVector(dir, maxDist)
    let best = this.obstacles.sweep(o.x, o.y, o.z, end.x, end.y, end.z, 0) * maxDist
    // the ground: march, then refine
    let prev = 0
    for (let d = 1; d <= best; d += 1.5) {
      const x = o.x + dir.x * d
      const z = o.z + dir.z * d
      if (o.y + dir.y * d < heightAt(x, z)) {
        let lo = prev
        let hi = d
        for (let i = 0; i < 5; i++) {
          const m = (lo + hi) / 2
          if (o.y + dir.y * m < heightAt(o.x + dir.x * m, o.z + dir.z * m)) hi = m
          else lo = m
        }
        best = hi
        break
      }
      prev = d
    }
    let unit: Unit | null = null
    this.ray.set(o, dir)
    for (const u of this.units.units) {
      if (u.team !== 'enemy' || !u.targetable) continue
      u.center(this.sphere.center)
      this.sphere.radius = Math.max(u.radius, u.height * 0.42)
      const hit = this.ray.intersectSphere(this.sphere, this.v)
      if (!hit) continue
      const d = hit.distanceTo(o)
      if (d >= skip && d < best) {
        best = d
        unit = u
      }
    }
    return { point: o.clone().addScaledVector(dir, best), dist: best, unit }
  }

  // ------------------------------------------------------------ the loop

  private tick() {
    // Timer.reset() measures with performance.now() while update() gets the frame timestamp; the next
    // delta can come out negative (v1's black-screen bug). Never let time run backwards.
    const dt = Math.min(1 / 30, Math.max(0, this.timer.getDelta()))
    const now = performance.now()
    if (this.state === 'playing') {
      this.frames[this.frameCount % FRAME_SAMPLES] = now - this.lastFrame
      this.frameCount++
      const ts = performance.now()
      for (let i = 0; i < this.debugSpeed; i++) {
        this.simulate(dt)
        if (i < this.debugSpeed - 1) this.input.endFrame()
      }
      this.prof('sim', ts)
    } else if (this.state === 'title') {
      // a slow drift around her while the title is up
      this.rig.yaw += dt * 0.05
      this.place(dt, false)
      this.ilyra.update(dt, this.player, 0, this.pose)
    }
    this.lastFrame = now
    const th = performance.now()
    this.hud.update(dt)
    this.prof('hud', th)
    this.renderer.info.reset()
    const tr = performance.now()
    this.composer.render(dt)
    this.prof('render', tr)
    if (this.syncFrames) {
      const tw = performance.now()
      const gl = this.renderer.getContext()
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.pixel)
      this.prof('gpuWait', tw)
    }
    this.input.endFrame()
  }

  /** ?debug: average milliseconds of each part of a frame (CPU side), for finding what costs. */
  readonly profile_: Record<string, number> = {}

  private prof(key: string, from: number) {
    if (!this.debug) return
    const ms = performance.now() - from
    this.profile_[key] = (this.profile_[key] ?? ms) * 0.95 + ms * 0.05
  }

  private simulate(dt: number) {
    this.t += dt
    this.botThink?.(this, dt)
    const inp = this.input
    const b = this.bot
    const p = this.player
    // hitstop: the fight freezes for a moment on impact; the camera keeps moving
    const sdt = this.hitstopT > 0 ? dt * 0.05 : dt
    this.hitstopT = Math.max(0, this.hitstopT - dt)
    this.hurtGrace = Math.max(0, this.hurtGrace - dt)
    const alive = p.alive
    p.petrified = Math.max(0, p.petrified - dt)
    const stone = p.petrified > 0
    const wheel = this.umbra.wheelOpen
    const aiming = alive && !wheel && (b ? b.aim : inp.held('Mouse2')) && !this.fight.exec
    const steer = b ? { x: b.x, y: b.y } : { x: (inp.held('KeyD') ? 1 : 0) - (inp.held('KeyA') ? 1 : 0), y: (inp.held('KeyW') ? 1 : 0) - (inp.held('KeyS') ? 1 : 0) }
    const air = p.flying
    const move: MoveInput = alive && !stone
      ? {
          x: steer.x,
          y: steer.y,
          sprint: b ? b.sprint : inp.held('ShiftLeft') || inp.held('ShiftRight'),
          dodge: !air && (b ? this.botDodge : inp.pressed('Space')) && this.fight.canDodge,
          fly: this.state === 'playing' && inp.pressed('KeyB') && !this.fight.exec,
          rise: (inp.held('Space') ? 1 : 0) - (inp.held('KeyC') ? 1 : 0) + (b?.rise ?? 0),
        }
      : { x: 0, y: 0, sprint: false, dodge: false }
    if (this.state === 'playing' && inp.pressed('KeyP')) this.toggleView()
    this.botDodge = false
    // the wheel takes the mouse while it is open
    if (!wheel) {
      if (b) this.rig.look((-b.turn * dt) / (CAMERA.sensitivity * this.sensitivity), 0, CAMERA.sensitivity * this.sensitivity)
      else this.rig.look(inp.dx, inp.dy, CAMERA.sensitivity * this.sensitivity)
    }

    const targets = this.units.enemies().filter((u) => u.targetable || (u === this.lockon.current && u.state === 'finishing'))
    if (alive && (inp.pressed('Mouse1') || this.botLock)) this.lockon.toggle(targets, p.pos, this.rig.yaw)
    this.botLock = false
    const cur = this.lockon.current
    let visible = true
    if (cur) {
      const lp = lockPoint(cur)
      const c = this.camera.position
      visible = this.obstacles.sweep(c.x, c.y, c.z, lp.x, lp.y, lp.z, 0) > 0.97
    }
    this.lockon.update(dt, targets, p.pos, b || wheel ? 0 : inp.dx, visible)

    // her fight: staff, block, parry, execution, thrown staff
    const f = { x: -Math.sin(this.rig.yaw), z: -Math.cos(this.rig.yaw) }
    const r = { x: Math.cos(this.rig.yaw), z: -Math.sin(this.rig.yaw) }
    const canAct = alive && !stone && this.state === 'playing'
    this.fight.update(sdt, {
      attackPressed: canAct && inp.pressed('Mouse0'),
      attackHeld: canAct && inp.held('Mouse0'),
      // in the air C sinks her: no block up there
      blockHeld: canAct && !air && inp.held('KeyC'),
      blockPressed: canAct && !air && inp.pressed('KeyC'),
      execute: canAct && inp.pressed('KeyF'),
      throwStaff: canAct && inp.pressed('KeyH'),
      dirX: f.x * steer.y + r.x * steer.x,
      dirZ: f.z * steer.y + r.z * steer.x,
    }, aiming)

    const target = this.lockon.current
    // in first person she faces where the view looks, like v1
    const face = this.fight.faceYaw ?? (target ? yawTo(p.pos.x, p.pos.z, target.x, target.z) : aiming || this.fight.blocking || this.rig.fp > 0.5 ? this.rig.yaw : null)
    // wading in the Hydra's flood is slow
    const wading = this.lair.depthAt(p.pos.x, p.pos.z, p.pos.y) > 0.3 ? 0.6 : 1
    p.moveScale = alive ? this.fight.moveScale * (this.umbra.casting.length ? 0.4 : 1) * wading : 0
    p.update(sdt, move, this.rig.yaw, face, aiming, this.ground)
    if (p.landRefused && this.t - this.landMsgAt > 3) {
      this.landMsgAt = this.t
      this.hud.message('Tidak bisa mendarat di air dalam. Terbang ke tepi dulu.', 'info')
    }
    this.sfx.wind(p.flying ? Math.min(1, Math.hypot(p.vx, p.vy, p.vz) / MOVE.fly.boost) : 0)
    // flying: wisps trail from both palms, red from the Chaos hand and violet from the Umbra hand
    if (p.flying && Math.random() < 0.7) {
      for (const [side, col] of [['L', COLOR.chaos], ['R', COLOR.umbra]] as const) this.glow.emit({ pos: this.ilyra.hand(side, this.v), count: 1, color: col, intensity: 2.2, life: 0.5, size: 0.12, sizeEnd: 0.02, speed: 0.6 })
    }
    this.foe.pos.set(p.pos.x, p.pos.y, p.pos.z)
    this.foe.alive = alive

    this.spells.update(sdt, canAct && !this.fight.exec, {
      pressed: inp.pressed('Mouse0'),
      held: inp.held('Mouse0'),
      aiming,
      overload: inp.pressed('KeyG'),
      burst: inp.pressed('KeyQ'),
      snare: inp.pressed('KeyE'),
      barrier: inp.pressed('KeyX'),
      warp: inp.pressed('KeyV'),
    })
    const t2 = performance.now()
    this.umbra.update(sdt, canAct && !this.fight.exec, {
      riteHeld: inp.held('KeyR'),
      ritePressed: inp.pressed('KeyR'),
      toggle: inp.pressed('KeyT'),
      wheelHeld: inp.held('KeyZ'),
      wheelPressed: inp.pressed('KeyZ'),
      dx: inp.dx,
      dy: inp.dy,
    })
    this.prof('umbra', t2)
    const t0 = performance.now()
    this.units.update(sdt)
    this.shots.update(sdt)
    this.updateBlasts(sdt)
    this.prof('units', t0)
    this.camps.update(dt)
    this.fauna.update()
    this.altars.update(dt)
    this.lair.update(sdt)
    this.seal.update(dt)
    this.props.update(sdt)
    this.refusals()

    // vitals
    if (alive && p.poisonT > 0) {
      p.poisonT -= dt
      p.hp -= p.poisonDps * dt
      this.counts.damageTaken += p.poisonDps * dt
      if (p.hp <= 0) this.fall()
    }
    if (p.alive) {
      if (this.spells.backlashT <= 0) p.mana = Math.min(p.maxMana, p.mana + this.derived.manaRegen * dt)
      this.calm += dt
      if (this.calm > REVIVE.calm) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * REVIVE.calmRegen * dt)
    } else {
      this.deadT += dt
      if (this.deadT > REVIVE.delay) this.revive()
    }
    if (this.saveIn >= 0) {
      this.saveIn -= dt
      if (this.saveIn < 0) this.saveNow()
    }

    this.place(dt, false, aiming)

    this.cullIn -= dt
    if (this.cullIn <= 0) {
      this.forest.cull(p.pos.x, p.pos.z)
      this.cullIn = 0.5
    }
    this.glow.update(dt)
    this.smoke.update(dt)
    this.lights.update(dt)
    this.rings.update(dt)
    this.warnings.update(dt)
    this.pools.update(dt)
    this.telegraphs.update(sdt)
    const t1 = performance.now()
    this.rigs.update(this.units.units, this.t, dt, this.camera.position, (u) => this.umbra.glowOf(u))
    this.prof('rigs', t1)

    // her pose: the fight, the spells and the rite
    this.fight.pose(this.pose)
    this.pose.grip = this.spells.gripping
    this.pose.rite = this.umbra.casting.length ? Math.min(1, this.umbra.progress) : -1
    this.pose.dead = alive ? -1 : this.deadT
    this.pose.stone = stone
    if (this.debugPose) Object.assign(this.pose, this.debugPose)
    this.ilyra.update(sdt, p, this.rig.aim, this.pose)

    this.hud.zone(ZONES[this.atmosphere.zone])
    this.hud.aim(this.rig.aim > 0.5 || this.rig.fp > 0.5)
    if (target) {
      const lp = lockPoint(target)
      this.v.set(lp.x, lp.y, lp.z).project(this.camera)
      const w = this.renderer.domElement.clientWidth
      const h = this.renderer.domElement.clientHeight
      this.hud.lock(this.v.z < 1 ? { x: (this.v.x * 0.5 + 0.5) * w, y: (-this.v.y * 0.5 + 0.5) * h } : null)
    } else this.hud.lock(null)
    if (this.debug) this.hud.debug(this.debugText())
  }

  /** Camera, terrain detail, fog and shadows for the current state. */
  private place(dt: number, snap: boolean, aiming = false) {
    const p = this.player
    // the pivot follows her height softly so small bumps in the ground do not shake the view
    const wantY = p.pos.y + CAMERA.normal.height
    this.pivotY = snap ? wantY : this.pivotY + (wantY - this.pivotY) * Math.min(1, dt * 12)
    const pivot = { x: p.pos.x, y: this.pivotY, z: p.pos.z }
    const target = this.lockon.current
    const pose: CamPose = this.rig.update(dt, pivot, aiming, target ? { point: lockPoint(target), height: target.height } : null, this.obstacles, heightAt)
    const c = this.camera
    c.position.set(pose.pos.x, pose.pos.y, pose.pos.z)
    c.lookAt(pose.pos.x + pose.dir.x, pose.pos.y + pose.dir.y, pose.pos.z + pose.dir.z)
    if (this.debugCam) {
      // ?debug: look at her from a fixed angle around her facing (the animation sheet)
      const a = p.facing + this.debugCam.angle
      c.position.set(p.pos.x - Math.sin(a) * this.debugCam.dist, p.pos.y + 1.1, p.pos.z - Math.cos(a) * this.debugCam.dist)
      c.lookAt(p.pos.x, p.pos.y + 0.95, p.pos.z)
    }
    // shake: small turns of the view (never a move, so it cannot push the camera into a tree)
    this.trauma = Math.max(0, this.trauma - dt * 1.6)
    if (this.trauma > 0 && this.profile.settings.shake) {
      const k = this.trauma * this.trauma * 0.035
      const t = this.t * 40
      c.rotateX(Math.sin(t * 1.3) * k)
      c.rotateY(Math.sin(t * 1.7 + 1) * k)
      c.rotateZ(Math.sin(t * 1.1 + 2) * k * 0.6)
    }
    if (Math.abs(c.fov - pose.fov) > 1e-3) {
      c.fov = pose.fov
      c.updateProjectionMatrix()
      this.glow?.setViewport(this.renderer.domElement.height, c.fov)
      this.smoke?.setViewport(this.renderer.domElement.height, c.fov)
    }
    const clear = Math.min(this.obstacles.clearance(c.position.x, c.position.y, c.position.z), c.position.y - heightAt(c.position.x, c.position.z))
    if (this.state === 'playing') this.minClearance = Math.min(this.minClearance, clear)
    this.atmosphere.update(dt, this.v.set(p.pos.x, p.pos.y, p.pos.z), c.position, snap)
    if (this.state === 'playing') this.sfx.ambience(dt, this.atmosphere.w)
    this.ambient.update(dt, c.position, heightAt(c.position.x, c.position.z), this.atmosphere.w, snap)
    this.terrain.update(c.position, snap ? 1000 : 1)
  }

  private resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.renderer.setSize(w, h, false)
    this.composer.setSize(w, h)
    this.bloom.resolution.set(w / 2, h / 2)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.glow?.setViewport(this.renderer.domElement.height, this.camera.fov)
    this.smoke?.setViewport(this.renderer.domElement.height, this.camera.fov)
  }

  // ------------------------------------------------------------ measurements for ?debug and the bot

  /** Frame times (ms) of the recent frames while playing, and their median and 95th percentile. */
  frameStats() {
    const n = Math.min(this.frameCount, FRAME_SAMPLES)
    const arr = Array.from(this.frames.slice(0, n)).filter((v) => v > 0).sort((a, b) => a - b)
    const at = (q: number) => (arr.length ? arr[Math.min(arr.length - 1, Math.floor(q * arr.length))] : 0)
    return { samples: arr.length, median: at(0.5), p95: at(0.95), gpu: this.gpu }
  }

  resetStats() {
    this.frameCount = 0
    this.frames.fill(0)
    this.minClearance = Infinity
  }

  stats() {
    const info = this.renderer.info
    const p = this.player
    return {
      ...this.frameStats(),
      minClearance: this.minClearance,
      calls: info.render.calls,
      triangles: info.render.triangles,
      t: this.t,
      zone: ZONES[this.atmosphere.zone].name,
      pos: toMap(p.pos.x, p.pos.z).map((v) => Math.round(v)),
      hp: Math.round(p.hp),
      maxHp: p.maxHp,
      mana: Math.round(p.mana),
      chaos: Math.round(this.spells.chaos),
      level: this.profile.level,
      xp: this.profile.xp,
      alive: p.alive,
      dodges: p.dodges,
      locked: !!this.lockon.current,
      enemies: this.units.enemies().length,
      shadowsField: this.umbra.field().length,
      shadowsRoom: this.profile.shadows.length,
      staff: this.fight.staff.state,
      fight: { ...this.fight.stats },
      umbra: { ...this.umbra.stats },
      game: { ...this.counts },
      width: this.renderer.domElement.width,
      height: this.renderer.domElement.height,
    }
  }

  dodge() {
    this.botDodge = true
  }

  toggleLock() {
    this.botLock = true
  }

  /** ?debug: the bot's stand-in for a quick sideways mouse flick while locked on. */
  flick(side: number) {
    return this.lockon.switchSide(this.units.enemies(), this.player.pos, side)
  }

  /** ?debug: what the bot may know about each creature near her (the same things a player sees). */
  enemyInfo(range = 40) {
    const p = this.player.pos
    return this.units.units
      .filter((u) => u.team === 'enemy' && Math.hypot(u.pos.x - p.x, u.pos.z - p.z) < range)
      .map((u) => ({
        id: u.id,
        kind: u.kind,
        x: u.pos.x,
        y: u.pos.y,
        z: u.pos.z,
        alive: u.alive,
        state: u.state,
        t: u.t,
        strike: u.spec.strike ?? 'ring',
        windup: u.spec.windup,
        lunge: u.spec.lungeTime ?? 0.3,
        aimX: u.aimAt.x,
        aimZ: u.aimAt.z,
        dirX: u.lungeDir.x,
        dirZ: u.lungeDir.z,
        hp: u.hp,
        maxHp: u.maxHp,
        stun: u.stun.share,
        alt: u.alt,
        aggro: u.aggro,
        camp: u.camp,
        executed: u.executed,
        riteTried: u.riteTried,
        deadT: u.deadT,
      }))
  }

  /** ?debug: creatures around her, for tests. */
  debugSpawn(kind: V2Kind, n: number, level = 1, dist = 12) {
    const p = this.player.pos
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const u = this.units.spawn(kind, 'enemy', level, { x: p.x + Math.cos(a) * dist, z: p.z + Math.sin(a) * dist })
      u.aggro = true
    }
  }

  /** ?debug: the Hydra's state for the bot. */
  lairInfo() {
    return this.lair.info()
  }

  /** ?debug: an elite with a trait (or a random one) near her. */
  debugElite(kind: V2Kind, trait: EliteTrait | null = null, level = 10, dist = 10) {
    const p = this.player.pos
    const u = this.units.spawn(kind, 'enemy', level, { x: p.x, z: p.z - dist })
    u.makeElite(trait ?? ELITE.traits[Math.floor(Math.random() * ELITE.traits.length)])
    u.aggro = true
    return u
  }

  /** ?debug: adds shadows to the Shadow Room (for the army measurements). */
  debugShadows(n: number, kind: V2Kind = 'imp', level = 1) {
    for (let i = 0; i < n; i++) addShadow(this.profile, V2_KINDS.includes(kind) ? kind : 'imp', level)
    this.saveSoon()
  }

  /** ?debug: a witch of this level (for trying the skills that open later). */
  debugLevel(level: number) {
    this.profile.level = Math.max(1, Math.min(30, level))
    this.profile.xp = 0
    this.applyDerived(true)
    this.saveSoon()
  }

  private debugText() {
    const s = this.frameStats()
    const i = this.renderer.info.render
    const [mx, my] = toMap(this.player.pos.x, this.player.pos.z)
    return [
      `frame ${s.median.toFixed(1)} ms (p95 ${s.p95.toFixed(1)})`,
      `draw ${i.calls}, segitiga ${(i.triangles / 1000).toFixed(0)}k`,
      `peta ${mx.toFixed(0)}, ${my.toFixed(0)}  ${ZONES[this.atmosphere.zone].name}`,
      `musuh ${this.units.enemies().length}, bayangan ${this.umbra.field().length} dari ${this.profile.shadows.length}`,
      `telegraf ${this.telegraphs.active}, chaos ${Math.round(this.spells.chaos)} dari ${CHAOS.max}, rite ${RITE.window} dtk`,
      `kamera bebas ${this.minClearance.toFixed(2)} m`,
      s.gpu,
    ].join('\n')
  }
}

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))
