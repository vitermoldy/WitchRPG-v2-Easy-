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
