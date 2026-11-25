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
