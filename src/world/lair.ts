import * as THREE from 'three'
import { HYDRA, MOVE, UNITS, type AttackSpec } from '../game/balance'
import type { Game } from '../engine/game'
import { COLOR } from '../engine/palette'
import { ringOf, type DamageKind, type Unit } from '../engine/units'
import { heightAt, LAKE, SPOTS, toWorld, WATER_LEVEL } from './map'

export type LairState = 'calm' | 'fight' | 'won'

/**
 * How much of a blow on the Hydra lands. Phase 1: everything. Phase 2: its slimy skin lets bolts and
 * blasts do 10% and thrown things (boulders, bodies, the staff) 150%. Phase 3: nothing, except inside
 * Reality Warp, where its open heart takes 150%. The army's blows always do 15% of their damage: the
 * Hydra is her fight.
 */
export function hydraShare(phase: 1 | 2 | 3, kind: DamageKind, inWarp: boolean): number {
  const army = kind === 'shadow' ? HYDRA.armyShare : 1
  if (phase === 3) return inWarp ? HYDRA.warpShare * army : 0
  if (phase === 2) {
    if (kind === 'bolt' || kind === 'blast') return HYDRA.boltShare
    if (kind === 'impact' || kind === 'staff') return HYDRA.thrownShare
  }
  return army
}

/** The radius of the lair: the shore the fight happens on. */
export const LAIR_RADIUS = 24
const LEVEL = 12
const WATER_UP = 0.5

const CURTAIN_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uFade;
  uniform vec3 uColor;
  void main() {
    float bands = 0.5 + 0.5 * sin(vUv.y * 16.0 - uTime * 3.0 + sin(vUv.x * 50.0) * 0.6);
    float k = (1.0 - vUv.y);
    float a = k * k * (0.2 + 0.4 * bands) * uFade;
    gl_FragColor = vec4(uColor * a * 1.6, a);
  }
`
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

interface Island {
  x: number
  z: number
  r: number
  mesh: THREE.Mesh
}

/**
 * The Hydra's lair on the shore of Danau Hitam, and the Hydra itself (PROMPT boss 1, on the plan of
 * v1's Hollow Warden). Only a witch of Lv 10 can step in: phase 3 is won inside Reality Warp, which
 * opens at Lv 10. Once the fight starts the lair closes until the Hydra or she falls.
 */
export class Lair {
  readonly group = new THREE.Group()
  state: LairState = 'calm'
  phase: 1 | 2 | 3 = 1
  body: Unit | null = null
  heads: (Unit | null)[] = []
  /** Middle of the shore the fight happens on (world), and the way to the lake. */
  readonly center: THREE.Vector3
  private readonly dir: THREE.Vector3
  private readonly groundY: number
  /** Water of the flood in phase 2 (world height), and how far the flood has come (0 to 1). */
  waterY: number
  flood = 0
  private floodTo = 0
  private readonly water: THREE.Mesh
  private readonly islands: Island[] = []
  private readonly curtain: THREE.Mesh
  private readonly curtainMat: THREE.ShaderMaterial
  private readonly g: Game
  private attackIn = 2
  private bodyAttackIn = 2.5
  private wonAt = -1
  private time = 0
  /** Game time a step into the lair was refused, for the HUD. */
  refusedAt = -99
  private readonly tmp = new THREE.Vector3()

  constructor(g: Game) {
    this.g = g
    this.group.name = 'lair'
