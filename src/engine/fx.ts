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
      this.cursor = (this.cursor + 1) % this.max
      const j = e.jitter ?? 0
      this.pos[i * 3] = e.pos.x + (Math.random() - 0.5) * 2 * j
      this.pos[i * 3 + 1] = e.pos.y + (Math.random() - 0.5) * 2 * j
      this.pos[i * 3 + 2] = e.pos.z + (Math.random() - 0.5) * 2 * j
      const s = e.speed ?? 0
      // Uniform direction on a sphere.
      const u = Math.random() * 2 - 1
      const t = Math.random() * Math.PI * 2
      const r = Math.sqrt(1 - u * u) * s * (0.4 + Math.random() * 0.6)
      this.vel[i * 3] = Math.cos(t) * r + (e.vel?.x ?? 0)
      this.vel[i * 3 + 1] = u * s * (0.4 + Math.random() * 0.6) + (e.vel?.y ?? 0)
      this.vel[i * 3 + 2] = Math.sin(t) * r + (e.vel?.z ?? 0)
      this.baseCol[i * 3] = this.c.r
      this.baseCol[i * 3 + 1] = this.c.g
      this.baseCol[i * 3 + 2] = this.c.b
      const life = e.life * (1 + (Math.random() - 0.5) * 2 * (e.lifeJitter ?? 0.3))
      this.life[i] = life
      this.maxLife[i] = life
      this.size0[i] = e.size
      this.size1[i] = e.sizeEnd ?? e.size * 0.2
      this.alpha0[i] = e.alpha ?? 1
      this.grav[i] = e.gravity ?? 0
      this.drag[i] = e.drag ?? 1.5
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) {
        if (this.alpha[i] !== 0) {
          this.alpha[i] = 0
          this.size[i] = 0
        }
        continue
      }
      this.life[i] -= dt
      const k = Math.max(0, this.life[i] / this.maxLife[i])
      const damp = Math.exp(-this.drag[i] * dt)
      this.vel[i * 3] *= damp
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * damp - this.grav[i] * dt
      this.vel[i * 3 + 2] *= damp
      this.pos[i * 3] += this.vel[i * 3] * dt
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt
      this.size[i] = this.size1[i] + (this.size0[i] - this.size1[i]) * k
      // Fade in over the first 10% of life, then out.
      const fade = Math.min(1, (1 - k) * 10) * k
      this.alpha[i] = this.alpha0[i] * Math.min(1, fade * 1.6)
      this.col[i * 3] = this.baseCol[i * 3]
      this.col[i * 3 + 1] = this.baseCol[i * 3 + 1]
      this.col[i * 3 + 2] = this.baseCol[i * 3 + 2]
    }
    const g = this.points.geometry
    g.attributes.position.needsUpdate = true
    g.attributes.aColor.needsUpdate = true
    g.attributes.aSize.needsUpdate = true
    g.attributes.aAlpha.needsUpdate = true
  }

  clear() {
    this.life.fill(0)
  }
}

interface LightSlot {
  light: THREE.PointLight
  ttl: number
  maxTtl: number
  peak: number
  held: boolean
}

/**
 * Point lights are created once and reused. Changing the number of lights in a scene recompiles
 * every material, which shows up as a visible hitch, so the count never changes.
 */
export class LightPool {
  private readonly slots: LightSlot[] = []

  constructor(scene: THREE.Object3D, count: number) {
    for (let i = 0; i < count; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 10, 2)
      light.castShadow = false
      scene.add(light)
