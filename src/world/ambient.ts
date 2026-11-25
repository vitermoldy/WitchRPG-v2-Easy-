import * as THREE from 'three'
import { toWorld, ZONES } from './map'

/**
 * What hangs in the air around her, by zone: pollen in the light of Hutan Pembuka, dust blown along
 * Tebing Berangin, fireflies over Rawa Berkabut, stone dust falling in Reruntuhan Kuil, embers rising
 * in Lembah Bara. One Points object of a few hundred motes that wrap around the camera, each taking
 * the kind of the zone she stands in when it wraps. And the Rift torn in the sky over Lembah Bara
 * (PROMPT zone V), shown only there.
 */

const COUNT = 520
const HALF = 26
const LOW = -3
const HIGH = 16

interface Kind {
  color: number
  size: number
  /** Drift (m/s) and how much it wanders. */
  vel: [number, number, number]
  wander: number
  /** Twinkle: 0 steady, 1 fireflies blinking. */
  blink: number
  alpha: number
}

// in ZONES order: pembuka, tebing, rawa, kuil, bara
const KINDS: Kind[] = [
  { color: 0xfff2c8, size: 0.09, vel: [0.15, -0.05, 0.05], wander: 0.25, blink: 0.2, alpha: 0.55 },
  { color: 0xe8d2aa, size: 0.06, vel: [2.6, 0.1, 0.8], wander: 0.6, blink: 0, alpha: 0.4 },
  { color: 0xc8ff6a, size: 0.12, vel: [0, 0.05, 0], wander: 0.7, blink: 1, alpha: 0.95 },
  { color: 0xb8b4ac, size: 0.07, vel: [0.1, -0.35, 0.05], wander: 0.15, blink: 0, alpha: 0.35 },
  { color: 0xffc070, size: 0.16, vel: [0.3, 1.4, 0.2], wander: 0.8, blink: 0.6, alpha: 1 },
]

const MOTE_VERT = /* glsl */ `
  attribute vec3 tint;
  attribute float size;
  attribute float alpha;
  varying vec3 vTint;
