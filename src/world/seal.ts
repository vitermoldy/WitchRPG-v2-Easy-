import * as THREE from 'three'
import { heightMap, PLAY_HALF, toMap, zoneAt } from './map'

const CELL = 8
/** Zones that stay sealed until the Hydra has fallen (PROMPT: "Terbuka setelah Hydra kalah"). */
const SEALED = new Set(['kuil', 'bara'])

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
/** A curtain of amber light that runs upward and fades toward the top. */
const FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uFade;
  void main() {
    float bands = 0.5 + 0.5 * sin(vUv.y * 18.0 - uTime * 2.4 + sin(vUv.x * 6.2832 + uTime) * 0.8);
    float k = (1.0 - vUv.y);
    vec3 col = mix(vec3(1.0, 0.65, 0.24), vec3(0.56, 0.33, 1.0), vUv.y) * 1.5;
    float a = k * k * (0.18 + 0.35 * bands) * uFade;
    gl_FragColor = vec4(col * a, a);
  }
`

/**
 * The seal on Reruntuhan Kuil and Lembah Bara. A grid of 8 m cells marks which ground belongs to a
 * sealed zone; while the seal holds, a step from open ground into sealed ground is refused (stepping
 * out is always allowed), and a curtain of light stands on every edge between the two.
 */
export class Seal {
  readonly mesh: THREE.Mesh
  private readonly n: number
  private readonly mask: Uint8Array
  private open = false
  private fade = 1
  private readonly mat: THREE.ShaderMaterial

  constructor(open: boolean) {
    this.open = open
    this.fade = open ? 0 : 1
    this.n = Math.ceil((PLAY_HALF * 2) / CELL)
