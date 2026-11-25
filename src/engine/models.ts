import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { MOVE } from '../game/balance'
import { COLOR } from './palette'
import type { Player } from './player'

const loader = new GLTFLoader()

/** Loads a model exported by previz/blender/export_glb.py. */
export async function loadModel(url: string): Promise<THREE.Group> {
  const gltf = await loader.loadAsync(url)
  gltf.scene.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    m.castShadow = true
    const mat = m.material as THREE.MeshStandardMaterial
    // emission strengths from Blender are tuned for its renderer; bloom here needs far less
    if (mat.emissive && mat.emissiveIntensity > 0 && mat.emissive.getHex() !== 0) mat.emissiveIntensity = Math.min(mat.emissiveIntensity, 3.5)
  })
  return gltf.scene
}

/** Bakes a static model into one geometry per material, for instanced crowds. */
export function bakeByMaterial(root: THREE.Object3D): { geometry: THREE.BufferGeometry; material: THREE.Material }[] {
  root.updateMatrixWorld(true)
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>()
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const g = m.geometry.clone()
    g.applyMatrix4(m.matrixWorld)
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name)
    const mat = m.material as THREE.Material
    if (!groups.has(mat)) groups.set(mat, [])
    groups.get(mat)!.push(g.index ? g.toNonIndexed() : g)
  })
  return [...groups].map(([material, geos]) => ({ geometry: mergeGeometries(geos), material }))
}

const rad = (d: number) => (d * Math.PI) / 180
const ease = (k: number) => {
  const c = Math.min(1, Math.max(0, k))
  return c * c * (3 - 2 * c)
}
const mix = (a: number, b: number, k: number) => a + (b - a) * k

/** What she is doing with her hands this frame, from the fight, the spells and the Umbra layer. */
export interface IlyraPose {
  /** A staff swing: which one, and how far into windup, active and recovery (seconds). */
  swing: { index: number; heavy: boolean; t: number; windup: number; active: number; recover: number } | null
  /** Block held (0 to 1), and a parry's push that fades from 1. */
  block: number
  parry: number
  /** Execution progress 0 to 1, or -1. */
  execute: number
  /** Staff throw and catch, 0 to 1 while they play, else -1. */
  throwK: number
  catchK: number
  /** The staff is in her hand (not thrown). */
  staff: boolean
  /** Left hand kick of a bolt (fades from 1), Telekinesis held, Umbra Rite gathering (0 to 1, or -1). */
  cast: number
  grip: boolean
  rite: number
  /** Flinch after a hit (fades from 1), and her fall (0 to 1, or -1). */
  hurt: number
  dead: number
  /** Turned to stone: she freezes in place. */
  stone: boolean
}

export const idlePose = (): IlyraPose => ({ swing: null, block: 0, parry: 0, execute: -1, throwK: -1, catchK: -1, staff: true, cast: 0, grip: false, rite: -1, hurt: 0, dead: -1, stone: false })

/** Arm and body angles of one swing at its windup end (`back`) and after the blow (`through`). */
const SWINGS = [
  // sweep from her right to her left
  { back: { torso: -38, armX: -70, armY: -65, fore: -10 }, through: { torso: 42, armX: -80, armY: 55, fore: -5 } },
  // backhand from her left to her right
  { back: { torso: 42, armX: -75, armY: 55, fore: -45 }, through: { torso: -48, armX: -80, armY: -75, fore: -5 } },
  // rising diagonal finisher, a step further in
  { back: { torso: -50, armX: -10, armY: -40, fore: -20 }, through: { torso: 35, armX: -165, armY: 30, fore: -10 } },
]

/**
 * Ilyra's model with procedural motion on its named parts: the walk cycle of the previz animatic,
 * a forward roll for the dodge, a raised left hand while aiming, breathing when still, and the fight:
 * staff swings, block, parry, execution, throw and catch, bolt, Telekinesis, Umbra Rite, hurt and fall.
 */
export class IlyraModel {
  readonly root = new THREE.Group()
  private readonly pivot = new THREE.Group()
  private readonly parts: Record<string, THREE.Object3D> = {}
  private readonly sigils: THREE.MeshStandardMaterial[] = []
  private t = 0

  constructor(model: THREE.Group) {
    this.root.name = 'ilyra'
    // the roll turns about her hips, not her feet
    this.pivot.position.y = 0.9
    model.position.y -= 0.9
    this.pivot.add(model)
    this.root.add(this.pivot)
    model.traverse((o) => {
      this.parts[o.name] = o
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
      if (m && m.name.includes('sigil_staff') && !this.sigils.includes(m)) this.sigils.push(m)
    })
    for (const [side, col] of [['L', COLOR.chaos], ['R', COLOR.umbra]] as const) {
      const hand = this.parts['hand_' + side]
      if (!hand) continue
      const l = new THREE.PointLight(col, 2.2, 5, 2)
      l.position.set(0, -0.06, 0.04)
      hand.add(l)
    }
  }

  /** Layer the main camera does not draw; the sun's shadow camera does, so her shadow stays. */
  static readonly HIDDEN_LAYER = 1
  /** What she sees of herself in first person: forearms, hands and the staff. */
  private static readonly SEEN = new Set(['forearm_L', 'forearm_R', 'hand_L', 'hand_R', 'staff'])

  /**
   * First person: everything but her forearms, hands and staff leaves the view. The palms' lights go
   * dark and their glow dims: a swing brings them right past the eye, where they would light the
   * ground next to the camera and the bloom would flood the screen.
   */
  firstPerson(on: boolean) {
    const walk = (o: THREE.Object3D) => {
      if (IlyraModel.SEEN.has(o.name)) return
      o.layers.set(on ? IlyraModel.HIDDEN_LAYER : 0)
      for (const c of o.children) walk(c)
    }
    walk(this.root)
    for (const side of ['L', 'R']) {
      this.parts['hand_' + side]?.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
        if (m?.emissive) {
          m.userData.glow ??= m.emissiveIntensity
          m.emissiveIntensity = on ? m.userData.glow * 0.2 : m.userData.glow
        }
        const l = o as THREE.PointLight
        if (l.isPointLight) {
          l.userData.glow ??= l.intensity
          l.intensity = on ? 0 : l.userData.glow
        }
      })
    }
  }

  /** World position of a palm (L: Chaos, R: Umbra). */
  hand(side: 'L' | 'R', out = new THREE.Vector3()): THREE.Vector3 {
    const h = this.parts['hand_' + side]
    if (!h) return out.copy(this.root.position).setY(this.root.position.y + 1.2)
    this.root.updateMatrixWorld(true)
    return h.getWorldPosition(out)
  }

  /** A copy of the staff for the throw (shares its geometry and materials). */
  staffCopy(): THREE.Object3D | null {
    const s = this.parts['staff']
    if (!s) return null
    const c = s.clone(true)
    c.position.set(0, 0, 0)
    c.rotation.set(0, 0, 0)
    return c
  }

  private rot(name: string, x: number, y = 0, z = 0) {
    const p = this.parts[name]
    if (p) p.rotation.set(rad(x), rad(y), rad(z))
  }

  update(dt: number, p: Player, aim: number, act: IlyraPose = idlePose()) {
    this.t += dt
    this.root.position.set(p.pos.x, p.pos.y, p.pos.z)
    // her yaw faces -z at 0; the model faces +z
    this.root.rotation.y = p.facing + Math.PI
    const staff = this.parts['staff']
    if (staff) staff.visible = act.staff
    // turned to stone: she holds whatever pose she was in until it wears off
    if (act.stone) return
    this.pivot.rotation.set(0, 0, 0)
    if (act.dead >= 0) {
      // she sinks to her knees and falls back
      const k = ease(act.dead / 0.8)
      this.pivot.rotation.x = -rad(78) * k
      this.pivot.position.y = 0.9 - 0.62 * k
      this.rot('thigh_L', -60 * k)
      this.rot('thigh_R', -50 * k)
      this.rot('shin_L', 90 * k)
      this.rot('shin_R', 80 * k)
      this.rot('torso', -10 * k)
      this.rot('head', -20 * k)
      this.rot('upperarm_L', -20 * k, 0, 40 * k)
      this.rot('upperarm_R', -20 * k, 0, -40 * k)
      this.rot('forearm_L', 0)
      this.rot('forearm_R', 0)
      this.rot('staff', 0)
      this.rot('cloak', 30 * k)
      return
    }
    const amp = p.flying ? 0 : Math.min(1.6, p.speed / MOVE.jog)
    const sprint = p.flying ? 0 : Math.max(0, (p.speed - MOVE.jog) / (MOVE.sprint - MOVE.jog))
    const s = Math.sin(p.stride)
    const breath = Math.sin(this.t * 2.2) * (1 - Math.min(1, amp))
    if (p.dodging) {
      const u = Math.min(1, p.dodgeT / MOVE.dodge.time)
      const e = u * u * (3 - 2 * u)
      this.pivot.rotation.x = Math.PI * 2 * e
      this.pivot.position.y = 0.9 - 0.35 * Math.sin(Math.PI * u)
      const tuck = Math.sin(Math.PI * u)
      this.rot('thigh_L', -75 * tuck)
      this.rot('thigh_R', -75 * tuck)
      this.rot('shin_L', 100 * tuck)
      this.rot('shin_R', 100 * tuck)
      this.rot('torso', 30 * tuck)
      this.rot('head', 20 * tuck)
      return
    }
    if (p.flying) {
      // flight: she leans into the way she flies, legs trailing, the cloak streaming behind
      const lean = Math.min(38, Math.hypot(p.vx, p.vz) * 1.6)
      const drift = Math.sin(this.t * 2.1)
      this.pivot.rotation.x = rad(lean)
      this.pivot.position.y = 0.9 + 0.05 * Math.sin(this.t * 2)
      this.rot('thigh_L', 12 + 4 * drift)
      this.rot('thigh_R', 18 - 4 * drift)
      this.rot('shin_L', 30)
      this.rot('shin_R', 22)
      this.rot('pelvis', 0)
      this.rot('cloak', 14 + lean * 0.5)
      this.rot('head', -2 - lean * 0.6)
    } else {
      this.pivot.position.y = 0.9 + 0.02 * Math.abs(s) * amp
      this.rot('thigh_L', -24 * s * amp)
      this.rot('thigh_R', 24 * s * amp)
      this.rot('shin_L', Math.max(0, 30 * Math.sin(p.stride + 1.2)) * amp)
      this.rot('shin_R', Math.max(0, 30 * Math.sin(p.stride + 1.2 + Math.PI)) * amp)
      this.rot('pelvis', 0, -3 * s * amp)
      this.rot('cloak', 5 + 3 * Math.sin(p.stride * 2) * amp + 10 * sprint)
      this.rot('head', -2 - 6 * sprint, -3 * s * amp)
    }

    // upper body: the fight overrides the walk's arm swing
    let torsoX = 3 + 9 * sprint + breath * 1.2
    let torsoY = 4 * s * amp
    let armRX = -8 * s * amp
    let armRY = 0
    let armRZ = 0
    let foreR = 0
    let staffX = 115 * aim
    let staffZ = 12 * aim
    let armLX = 14 * s * amp * (1 - aim) - 65 * aim
    let armLY = 0
    let armLZ = 10 * aim
    let foreL = -12 * aim
    let crouch = 0

    if (act.block > 0) {
      // staff across the chest, both hands on it
      const b = ease(act.block)
      const push = act.parry
      armRX = mix(armRX, -70 - 15 * push, b)
      armRY = mix(armRY, 30, b)
      foreR = mix(foreR, -45 + 35 * push, b)
      armLX = mix(armLX, -68 - 15 * push, b)
      armLY = mix(armLY, -30, b)
      armLZ = mix(armLZ, 0, b)
      foreL = mix(foreL, -50 + 35 * push, b)
      // found on the pose sheet: across the chest, long seen from the front, short from the side
      staffX = mix(staffX, 20, b)
      staffZ = mix(staffZ, -110, b)
      torsoX = mix(torsoX, 8 - 6 * push, b)
      crouch = 0.06 * b
    }
    const sw = act.swing
    if (sw) {
      const k = sw.windup + sw.active
      let w: number
      let back: { torso: number; armX: number; armY: number; fore: number }
      let through: typeof back
      if (sw.heavy) {
        back = { torso: -18, armX: -175, armY: 0, fore: -25 }
        through = { torso: 38, armX: -35, armY: 0, fore: 0 }
      } else ({ back, through } = SWINGS[sw.index % SWINGS.length])
      const rest = { torso: torsoY, armX: armRX, armY: armRY, fore: foreR }
      let pose: typeof back
      if (sw.t < sw.windup) {
        w = ease(sw.t / sw.windup)
        pose = { torso: mix(rest.torso, back.torso, w), armX: mix(rest.armX, back.armX, w), armY: mix(rest.armY, back.armY, w), fore: mix(rest.fore, back.fore, w) }
      } else if (sw.t < k) {
        w = ease((sw.t - sw.windup) / sw.active)
        pose = { torso: mix(back.torso, through.torso, w), armX: mix(back.armX, through.armX, w), armY: mix(back.armY, through.armY, w), fore: mix(back.fore, through.fore, w) }
      } else {
        w = ease((sw.t - k) / sw.recover)
        pose = { torso: mix(through.torso, rest.torso, w), armX: mix(through.armX, rest.armX, w), armY: mix(through.armY, rest.armY, w), fore: mix(through.fore, rest.fore, w) }
      }
      const weight = sw.t < k ? 1 : 1 - ease((sw.t - k) / sw.recover)
      torsoY = pose.torso
      armRX = pose.armX
      armRY = pose.armY
      foreR = pose.fore
      // the staff points out along the arm while it swings, head first
      staffX = mix(staffX, 165, weight)
      staffZ = mix(staffZ, 0, weight)
      if (sw.heavy) {
        // both hands on the staff, and a deep bend into the slam
        armLX = armRX + 10
        armLY = -20
        foreL = foreR - 10
        const slam = sw.t > sw.windup ? Math.sin(Math.PI * Math.min(1, (sw.t - sw.windup) / (sw.active + sw.recover * 0.6))) : 0
        torsoX += 30 * slam
        crouch = 0.16 * slam
      } else torsoX += 8 * weight
    }
    if (act.execute >= 0) {
      // raise the staff high in both hands, drive it down, hold, then stand
      const e = act.execute
      const up = ease(e / 0.35)
      const down = ease((e - 0.35) / 0.2)
      const back = ease((e - 0.75) / 0.25)
      const x = mix(mix(armRX, -175, up), -25, down)
      armRX = mix(x, armRX, back)
      armLX = armRX + 8
      armRY = 0
      armLY = -15
      foreR = -15 * (1 - back)
      foreL = -20 * (1 - back)
      staffX = mix(mix(staffX, 180, up), 200, down) * (1 - back) + staffX * back
      staffZ = 0
      torsoX = mix(mix(torsoX, -12, up), 42, down) * (1 - back) + torsoX * back
      crouch = 0.22 * down * (1 - back)
    }
    if (act.throwK >= 0) {
      const e = act.throwK
      const wind = ease(e / 0.4)
      const fling = ease((e - 0.4) / 0.25)
      armRX = mix(mix(armRX, 30, wind), -130, fling)
      armRY = 0
      armRZ = -15
      foreR = mix(-60 * wind, 0, fling)
      torsoY = mix(mix(torsoY, -30, wind), 25, fling)
    }
    if (act.catchK >= 0) {
      const e = 1 - act.catchK
      armRX = mix(armRX, -95, e)
      foreR = mix(foreR, -10, e)
      torsoY += -12 * e
    }
    if (act.grip) {
      armLX = -88
      armLY = -10
      armLZ = 8
      foreL = -5 + 4 * Math.sin(this.t * 30)
    } else if (act.cast > 0) {
      foreL += -25 * act.cast
      armLX += -10 * act.cast
    }
    if (act.rite >= 0) {
      const tremble = Math.sin(this.t * 40) * 3 * act.rite
      armRX = -55 - 20 * act.rite + tremble
      armRY = 15
      foreR = -30
      staffX = 60
    }
    if (act.hurt > 0) {
      torsoX -= 16 * act.hurt
      this.rot('head', -18 * act.hurt)
      armLZ += 20 * act.hurt
      armRZ -= 20 * act.hurt
    }

    this.pivot.position.y -= crouch
    if (crouch > 0) {
      this.rot('thigh_L', -24 * s * amp - 120 * crouch)
      this.rot('thigh_R', 24 * s * amp - 100 * crouch)
      this.rot('shin_L', 200 * crouch)
      this.rot('shin_R', 180 * crouch)
    }
    this.rot('torso', torsoX, torsoY)
    this.rot('upperarm_L', armLX, armLY, armLZ)
    this.rot('forearm_L', foreL)
    this.rot('upperarm_R', armRX, armRY, armRZ)
    this.rot('forearm_R', foreR)
    // While aiming the glowing staff head would sit right on the aim point (previz variant D):
    // lower it to point forward and down by her right side, and dim the sigil.
    this.rot('staff', staffX, 0, staffZ)
    for (const m of this.sigils) m.emissiveIntensity = 1.4 - 0.9 * aim
  }
}
