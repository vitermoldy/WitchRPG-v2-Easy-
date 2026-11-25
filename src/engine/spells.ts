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
const RUNE_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uFade;
  uniform vec3 uColor;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float a = atan(p.y, p.x);
    float ring = smoothstep(0.03, 0.0, abs(r - 0.94)) + smoothstep(0.02, 0.0, abs(r - 0.78)) * 0.7;
    float spokes = smoothstep(0.04, 0.0, abs(sin(a * 6.0 + uTime * 0.8))) * step(0.78, r) * step(r, 0.94);
    float inner = smoothstep(0.02, 0.0, abs(r - 0.45 - 0.03 * sin(a * 3.0 - uTime * 2.0)));
    float fill = (1.0 - smoothstep(0.0, 0.95, r)) * 0.12;
    float v = (ring + spokes * 0.8 + inner * 0.6 + fill) * step(r, 1.0);
    gl_FragColor = vec4(uColor * v * 2.2, v * uFade);
  }
`
/** The wall of the Reality Warp field: bands that run upward and fade toward the top. */
const WARP_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uFade;
  void main() {
    float bands = 0.5 + 0.5 * sin(vUv.y * 22.0 - uTime * 7.0 + sin(vUv.x * 40.0) * 0.6);
    float k = (1.0 - vUv.y) * (1.0 - vUv.y);
    vec3 col = mix(vec3(0.56, 0.33, 1.0), vec3(1.0, 0.16, 0.24), vUv.y) * 1.6;
    float a = k * (0.25 + 0.5 * bands) * uFade;
    gl_FragColor = vec4(col * a, a);
  }
`
const SHIELD_VERT = /* glsl */ `
  varying vec3 vNormal;
