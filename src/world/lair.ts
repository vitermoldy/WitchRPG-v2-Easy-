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

