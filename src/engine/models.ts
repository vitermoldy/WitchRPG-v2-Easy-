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
