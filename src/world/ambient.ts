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
  varying float vAlpha;
  uniform float uScale;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(size * uScale / max(0.5, -mv.z), 1.0, 24.0);
    vTint = tint;
    vAlpha = alpha;
  }
`
const MOTE_FRAG = /* glsl */ `
  varying vec3 vTint;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = (1.0 - smoothstep(0.2, 1.0, d)) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vTint * a, a);
  }
`

// a tear in the sky: a jagged opening onto a dark, slowly pulsing void, its rim white-hot, a crimson
// glow around it. Normal blending, so the void can be darker than the sky behind it.
const RIFT_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uFade;
  float zig(float y) {
    // a triangle wave gives the sharp turns of a tear, a slow sine its overall lean
    return 0.5 + 0.07 * sin(y * 5.0 + 0.8) + 0.05 * (abs(fract(y * 7.0) - 0.5) * 2.0 - 0.5) + 0.02 * (abs(fract(y * 19.0 + 0.3) - 0.5) * 2.0 - 0.5);
  }
  void main() {
    float y = vUv.y;
    float taper = smoothstep(0.0, 0.3, y) * smoothstep(1.0, 0.62, y);
    float w = 0.012 + 0.07 * taper;
    float d = abs(vUv.x - zig(y));
    float inside = (1.0 - smoothstep(w * 0.75, w, d)) * step(0.02, taper);
    float rim = exp(-abs(d - w) * 140.0) * taper;
    float glow = exp(-max(0.0, d - w) * 11.0) * taper * 0.55;
    float pulse = 0.5 + 0.5 * sin(uTime * 1.6 + y * 18.0);
    vec3 voidCol = vec3(0.07, 0.01, 0.06) + vec3(0.45, 0.04, 0.22) * pulse * 0.25;
    vec3 col = voidCol * inside + vec3(1.0, 0.78, 0.72) * rim * (1.0 - inside) + vec3(0.95, 0.16, 0.3) * glow * (1.0 - inside);
    float a = clamp(inside * 0.96 + rim + glow, 0.0, 1.0) * uFade;
    gl_FragColor = vec4(col / max(a, 0.001) * uFade, a);
  }
`
const RIFT_VERT = /* glsl */ `
  varying vec2 vUv;
