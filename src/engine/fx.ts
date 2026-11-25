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
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`

/** A fixed pool of point sprites simulated on the CPU. One draw call per system. */
export class Particles {
  readonly points: THREE.Points
  private readonly max: number
  private readonly pos: Float32Array
  private readonly col: Float32Array
  private readonly size: Float32Array
  private readonly alpha: Float32Array
  private readonly vel: Float32Array
  private readonly baseCol: Float32Array
  private readonly life: Float32Array
  private readonly maxLife: Float32Array
  private readonly size0: Float32Array
  private readonly size1: Float32Array
  private readonly alpha0: Float32Array
  private readonly grav: Float32Array
  private readonly drag: Float32Array
  private cursor = 0
  private readonly material: THREE.ShaderMaterial
  private readonly c = new THREE.Color()

  constructor(max: number, mode: 'glow' | 'smoke') {
    this.max = max
    this.pos = new Float32Array(max * 3)
    this.col = new Float32Array(max * 3)
    this.size = new Float32Array(max)
    this.alpha = new Float32Array(max)
    this.vel = new Float32Array(max * 3)
    this.baseCol = new Float32Array(max * 3)
    this.life = new Float32Array(max)
    this.maxLife = new Float32Array(max)
    this.size0 = new Float32Array(max)
    this.size1 = new Float32Array(max)
    this.alpha0 = new Float32Array(max)
    this.grav = new Float32Array(max)
    this.drag = new Float32Array(max)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage))
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage))
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage))
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6)
    this.material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 400 } },
      vertexShader: VERT,
      fragmentShader: mode === 'glow' ? FRAG_GLOW : FRAG_SMOKE,
      transparent: true,
      depthWrite: false,
      blending: mode === 'glow' ? THREE.AdditiveBlending : THREE.NormalBlending,
    })
    this.points = new THREE.Points(geo, this.material)
    this.points.frustumCulled = false
    this.points.renderOrder = mode === 'glow' ? 10 : 9
  }

  setViewport(heightPx: number, fovDeg: number) {
    this.material.uniforms.uScale.value = heightPx / (2 * Math.tan((fovDeg * Math.PI) / 360))
  }

  emit(e: Emit) {
    this.c.set(e.color).multiplyScalar(e.intensity ?? 1)
    for (let n = 0; n < e.count; n++) {
      const i = this.cursor
