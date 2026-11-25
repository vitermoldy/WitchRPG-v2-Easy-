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
