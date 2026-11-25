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
