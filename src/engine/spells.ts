import * as THREE from 'three'
import { CHAOS, SPELL } from '../game/balance'
import { hasUpgrade, impactDamage, isUnlocked } from '../game/progression'
import { skillById, type SkillId } from '../game/skills'
import type { Game } from './game'
import { COLOR } from './palette'
import type { Prop } from './props'
import type { Unit } from './units'

interface Bolt {
  pos: THREE.Vector3
  prev: THREE.Vector3
  vel: THREE.Vector3
  life: number
  damage: number
  mesh: THREE.Mesh
  light: THREE.PointLight | null
}

interface Field {
  pos: THREE.Vector3
  radius: number
  t: number
  duration: number
  group: THREE.Object3D
  mats: THREE.ShaderMaterial[]
}

export interface SpellInput {
  /** Left button this frame, and whether she is aiming (right button held). */
  pressed: boolean
  held: boolean
  aiming: boolean
  overload: boolean
  burst: boolean
  snare: boolean
  barrier: boolean
  warp: boolean
}

const PLAIN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
