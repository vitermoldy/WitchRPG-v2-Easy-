import * as THREE from 'three'
import { UNITS, type UnitKind } from '../game/balance'
import { bakeByMaterial } from './models'
import { COLOR } from './palette'
import type { Team, Unit } from './units'

const D = Math.PI / 180
const UP = new THREE.Vector3(0, 1, 0)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/** Steering passes per frame for the Hydra's necks, and how high a head's middle lies above its circle (m). */
const NECK_PASSES = 3
const HEAD_LIES = 1

/** Adds a per-instance emissive colour (hit flash, the violet glow of a body that can be raised). */
function patchGlow(mat: THREE.MeshStandardMaterial) {
  mat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aGlow;\nvarying vec3 vGlow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;')
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGlow;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vGlow;')
  }
  mat.customProgramCacheKey = () => 'unit-glow'
}

/** The shadow version of a creature's material: near-black violet, glowing eyes and veins in Umbra. */
/** Mean of a geometry's vertex colours: the real colour of a two-tone part, whose material is white. */
function meanColor(geo: THREE.BufferGeometry | undefined): THREE.Color | null {
  const a = geo?.getAttribute('color')
