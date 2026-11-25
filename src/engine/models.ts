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
