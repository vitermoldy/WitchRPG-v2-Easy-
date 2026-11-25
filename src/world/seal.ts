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
    float bands = 0.5 + 0.5 * sin(vUv.y * 18.0 - uTime * 2.4 + sin(vUv.x * 6.2832 + uTime) * 0.8);
    float k = (1.0 - vUv.y);
    vec3 col = mix(vec3(1.0, 0.65, 0.24), vec3(0.56, 0.33, 1.0), vUv.y) * 1.5;
    float a = k * k * (0.18 + 0.35 * bands) * uFade;
    gl_FragColor = vec4(col * a, a);
  }
`

/**
 * The seal on Reruntuhan Kuil and Lembah Bara. A grid of 8 m cells marks which ground belongs to a
 * sealed zone; while the seal holds, a step from open ground into sealed ground is refused (stepping
 * out is always allowed), and a curtain of light stands on every edge between the two.
 */
export class Seal {
  readonly mesh: THREE.Mesh
  private readonly n: number
  private readonly mask: Uint8Array
  private open = false
  private fade = 1
  private readonly mat: THREE.ShaderMaterial

  constructor(open: boolean) {
    this.open = open
    this.fade = open ? 0 : 1
    this.n = Math.ceil((PLAY_HALF * 2) / CELL)
    this.mask = new Uint8Array(this.n * this.n)
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        const mx = -PLAY_HALF + (i + 0.5) * CELL
        const my = -PLAY_HALF + (j + 0.5) * CELL
        this.mask[i * this.n + j] = SEALED.has(zoneAt(mx, my).key) ? 1 : 0
      }
    }
    // a wall segment on every edge between a sealed cell and an open one
    const pos: number[] = []
    const uv: number[] = []
    const H = 16
    const wall = (ax: number, ay: number, bx: number, by: number) => {
      const ha = heightMap(ax, ay) - 1
      const hb = heightMap(bx, by) - 1
      // three.js puts map north at -z
      pos.push(ax, ha, -ay, bx, hb, -by, bx, hb + H, -by, ax, ha, -ay, bx, hb + H, -by, ax, ha + H, -ay)
      uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1)
    }
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        if (!this.mask[i * this.n + j]) continue
        const x0 = -PLAY_HALF + i * CELL
        const y0 = -PLAY_HALF + j * CELL
        if (i > 0 && !this.mask[(i - 1) * this.n + j]) wall(x0, y0, x0, y0 + CELL)
        if (i < this.n - 1 && !this.mask[(i + 1) * this.n + j]) wall(x0 + CELL, y0, x0 + CELL, y0 + CELL)
        if (j > 0 && !this.mask[i * this.n + j - 1]) wall(x0, y0, x0 + CELL, y0)
        if (j < this.n - 1 && !this.mask[i * this.n + j + 1]) wall(x0, y0 + CELL, x0 + CELL, y0 + CELL)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uFade: { value: this.fade } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
    this.mesh = new THREE.Mesh(geo, this.mat)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 7
    this.mesh.visible = !open
  }

  get isOpen() {
    return this.open
  }

  /** True where the world point lies in a sealed zone. */
  sealedAt(wx: number, wz: number): boolean {
    const [mx, my] = toMap(wx, wz)
    const i = Math.floor((mx + PLAY_HALF) / CELL)
    const j = Math.floor((my + PLAY_HALF) / CELL)
    if (i < 0 || j < 0 || i >= this.n || j >= this.n) return false
    return this.mask[i * this.n + j] === 1
  }

  /** While the seal holds: a step into sealed ground from open ground (or from nowhere known) is refused. */
  blocks(x: number, z: number, fx?: number, fz?: number): boolean {
    if (this.open || !this.sealedAt(x, z)) return false
    return fx === undefined || fz === undefined || !this.sealedAt(fx, fz)
  }

  unlock() {
    this.open = true
  }

  update(dt: number) {
    this.mat.uniforms.uTime.value += dt
    if (this.open && this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt * 0.4)
      this.mat.uniforms.uFade.value = this.fade
      if (this.fade === 0) this.mesh.visible = false
    }
  }
}
