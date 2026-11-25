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
