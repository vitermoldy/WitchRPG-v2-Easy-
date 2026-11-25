import * as THREE from 'three'

type Vec = { x: number; y: number; z: number }

export interface Emit {
  pos: Vec
  count: number
  color: THREE.ColorRepresentation
  /** Multiplies the colour; above 1 it feeds the bloom pass. */
  intensity?: number
  life: number
  lifeJitter?: number
  size: number
  sizeEnd?: number
  /** Random velocity magnitude in every direction. */
  speed?: number
  /** Base velocity added to every particle. */
  vel?: Vec
  /** Random offset around pos. */
  jitter?: number
  gravity?: number
  drag?: number
  alpha?: number
}

const VERT = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Capped so an ember drifting past the lens never fills the screen.
    gl_PointSize = min(aSize * uScale / max(0.001, -mv.z), 90.0);
    gl_Position = projectionMatrix * mv;
  }
`

const FRAG_GLOW = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a * vAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vColor * a, a);
  }
`

const FRAG_SMOKE = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.1, d) * vAlpha;
