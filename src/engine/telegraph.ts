import * as THREE from 'three'
import type { HeightFn } from './camera'
import { COLOR } from './palette'
import { ringOf, type Unit } from './units'

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
