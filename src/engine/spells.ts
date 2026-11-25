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
  varying vec3 vView;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalMatrix * normal;
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`
const SHIELD_FRAG = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec2 vUv;
  uniform float uHit;
  uniform float uFade;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.0);
    vec2 g = vUv * vec2(24.0, 12.0);
    float hex = smoothstep(0.08, 0.0, abs(fract(g.x + 0.5 * floor(g.y)) - 0.5) - 0.42) + smoothstep(0.08, 0.0, abs(fract(g.y) - 0.5) - 0.44);
    float v = (f * 0.75 + hex * 0.04 + uHit * 0.35) * uFade;
    gl_FragColor = vec4(vec3(1.0, 0.16, 0.22) * v * 1.2, v * 0.4);
  }
`

const boltGeo = new THREE.SphereGeometry(0.11, 10, 8)
const boltMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(COLOR.chaos).multiplyScalar(4) })

/** Held this long, the left button turns from a bolt into Telekinesis. */
const GRIP_HOLD = 0.25

/**
 * Chaos, the left hand: Hex Bolt and Telekinesis while aiming, Chaos Burst, Hex Snare, Hex Barrier and
 * Reality Warp on their keys, the Chaos meter, Crimson Overload and its Backlash. Same rules and
 * numbers as v1; the aim comes from the shoulder camera instead of the eyes.
 */
export class Spells {
  private readonly g: Game
  readonly bolts: Bolt[] = []
  private readonly snares: Field[] = []
  private readonly warps: Field[] = []
  boltCd = 0
  burstCd = 0
  snareCd = 0
  barrierCd = 0
  warpCd = 0
  grabbed: Unit[] = []
  chaos = 0
  overloadT = 0
  backlashT = 0
  barrierT = 0
  barrierAbsorb = 0
  private barrierHit = 0
  private holdT = 0
  private readonly shield: THREE.Mesh
  private readonly tendril: THREE.Line
  private readonly tendrilPts: THREE.Vector3[] = []
  private tendrilLight: THREE.PointLight | null = null
  private readonly tmp = new THREE.Vector3()
  private readonly ray = new THREE.Ray()
  private readonly sphere = new THREE.Sphere()

  constructor(g: Game) {
    this.g = g
    this.shield = new THREE.Mesh(
      new THREE.SphereGeometry(1.25, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: { uHit: { value: 0 }, uFade: { value: 0 } },
        vertexShader: SHIELD_VERT,
        fragmentShader: SHIELD_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    )
    this.shield.visible = false
    this.shield.renderOrder = 12
    g.scene.add(this.shield)
    for (let i = 0; i < 16; i++) this.tendrilPts.push(new THREE.Vector3())
    this.tendril = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(this.tendrilPts),
      new THREE.LineBasicMaterial({ color: new THREE.Color(COLOR.chaos).multiplyScalar(3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    )
    this.tendril.frustumCulled = false
    this.tendril.visible = false
    g.scene.add(this.tendril)
  }

  reset() {
    for (const b of this.bolts) this.killBolt(b)
    this.bolts.length = 0
    for (const f of [...this.snares, ...this.warps]) this.g.scene.remove(f.group)
    this.snares.length = 0
    this.warps.length = 0
    this.drop(false)
    this.boltCd = this.burstCd = this.snareCd = this.barrierCd = this.warpCd = 0
    this.overloadT = this.backlashT = this.barrierT = 0
    this.shield.visible = false
  }

  get overloaded() {
    return this.overloadT > 0
  }

  get damageMult() {
    return this.g.derived.damageMult * (this.overloaded ? CHAOS.overloadDamage : 1)
  }

  /** A boulder held by Telekinesis (when no creature was in the aim). */
  heldProp: Prop | null = null

  get gripping() {
