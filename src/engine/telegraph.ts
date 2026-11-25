import * as THREE from 'three'
import type { HeightFn } from './camera'
import { COLOR } from './palette'
import { ringOf, type Unit } from './units'

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

/**
 * Slow pulse: the edge breathes about twice a second and the inside fills toward the edge; when the
 * fill reaches the edge the blow lands. This one can be blocked or parried.
 */
const RING_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uFill;
  uniform float uTime;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float pulse = 0.5 + 0.5 * sin(uTime * 2.2 * 6.2832);
    float edge = smoothstep(0.09, 0.0, abs(r - 0.93)) * (0.55 + 0.45 * pulse);
    float fill = step(r, uFill) * 0.22;
    float front = smoothstep(0.06, 0.0, abs(r - uFill)) * 0.7 * step(0.03, uFill);
    float a = edge + fill + front;
    gl_FragColor = vec4(uColor * a, a);
  }
`

/** Fast flash: a thick band along the lunge that blinks about seven times a second. Only a roll avoids it. */
const LINE_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uFill;
  uniform float uTime;
  void main() {
    float side = min(vUv.x, 1.0 - vUv.x);
    float border = smoothstep(0.12, 0.0, side);
    float blink = step(0.5, fract(uTime * 7.0));
    float fill = step(vUv.y, uFill) * 0.3;
    float tip = smoothstep(0.08, 0.0, 1.0 - vUv.y) * 0.6;
    float a = (border * 0.8 + 0.1 + fill * 0.6 + tip) * (0.3 + 0.7 * blink);
    // dimmer than the ring: it is long and close to the camera, and bloom would turn it into a wall
    gl_FragColor = vec4(uColor * a * 0.55, a);
  }
`

const RING_SEG = 40
const LINE_SEG = 16
const LIFT = 0.1

interface Item {
  mesh: THREE.Mesh
  mat: THREE.ShaderMaterial
  kind: 'ring' | 'line'
  unit: Unit | null
  /** Line: where it starts on the ground, its direction and length. */
  ox: number
  oz: number
  dx: number
