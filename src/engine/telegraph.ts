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
