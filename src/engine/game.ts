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
