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
  dz: number
  len: number
  width: number
  radius: number
  /** When it started and how long until the blow lands (game seconds). */
  t0: number
  total: number
  /** The circle follows the creature's aim while it winds up. */
  follow: boolean
}

/** Amber telegraphs under creatures' attacks, both laid on the ground and following its shape. */
export class Telegraphs {
  private readonly items: Item[] = []
  private readonly byUnit = new Map<number, Item>()
  private readonly height: HeightFn
  private time = 0
  private readonly color = new THREE.Color(COLOR.rift).multiplyScalar(2.4)

  constructor(scene: THREE.Object3D, height: HeightFn, count = 24) {
    this.height = height
    for (let i = 0; i < count; i++) {
      this.items.push(this.make(scene, 'ring'))
      this.items.push(this.make(scene, 'line'))
    }
  }

  private make(scene: THREE.Object3D, kind: 'ring' | 'line'): Item {
    const geo = kind === 'ring' ? new THREE.CircleGeometry(1, RING_SEG) : new THREE.PlaneGeometry(1, 1, 1, LINE_SEG)
    // both lie flat; vertex heights are filled in from the ground every time they move
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position as THREE.BufferAttribute
    pos.setUsage(THREE.DynamicDrawUsage)
    geo.userData.base = Float32Array.from(pos.array as Float32Array)
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: this.color }, uFill: { value: 0 }, uTime: { value: 0 } },
      vertexShader: VERT,
      fragmentShader: kind === 'ring' ? RING_FRAG : LINE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.frustumCulled = false
    mesh.visible = false
    mesh.renderOrder = 8
    scene.add(mesh)
    return { mesh, mat, kind, unit: null, ox: 0, oz: 0, dx: 0, dz: 1, len: 1, width: 1, radius: 1, t0: 0, total: 1, follow: false }
  }

  /**
   * Starts the telegraph for the attack this unit is winding up. A ring fills until the blow lands:
   * the windup plus the leap, or plus the flight of a glob. A line runs the length of the lunge, or
   * from the shooter to past her for an arrow, and fills over the windup.
   */
  show(u: Unit) {
    this.clear(u)
    const atk = u.atk
    const kind = atk.strike
    const it = this.items.find((i) => i.kind === kind && !i.unit)
    if (!it) return
    it.unit = u
    it.mesh.visible = true
    it.mat.uniforms.uFill.value = 0
    it.t0 = this.time
    const dist = Math.hypot(u.aimAt.x - u.pos.x, u.aimAt.z - u.pos.z)
    if (kind === 'line') {
      it.ox = u.pos.x
      it.oz = u.pos.z
      it.dx = u.lungeDir.x
      it.dz = u.lungeDir.z
      it.len = atk.shot ? dist + 4 : (atk.lungeSpeed ?? 12) * (atk.lungeTime ?? 0.4) + u.radius + 1
      it.width = atk.shot ? 0.9 : Math.max(1.1, u.radius * 2.2)
      it.total = atk.windup * u.tempo
      this.layLine(it)
    } else {
      it.radius = ringOf(atk)
      it.follow = atk.ahead === undefined
      it.total = atk.windup * u.tempo + (atk.shot ? Math.max(0.3, dist / atk.shot.speed) : (atk.lungeTime ?? 0.3))
      this.layRing(it, u.aimAt.x, u.aimAt.z)
    }
    this.byUnit.set(u.id, it)
  }

  clear(u: Unit) {
    const it = this.byUnit.get(u.id)
    if (!it) return
    it.unit = null
    it.mesh.visible = false
    this.byUnit.delete(u.id)
  }

  clearAll() {
    for (const it of this.items) {
      it.unit = null
      it.mesh.visible = false
    }
    this.byUnit.clear()
  }

  /** Active telegraphs, for the debug readout and the test bot. */
  get active() {
    return this.byUnit.size
  }

  private layRing(it: Item, cx: number, cz: number) {
    const geo = it.mesh.geometry
    const pos = geo.attributes.position as THREE.BufferAttribute
    const base = geo.userData.base as Float32Array
    for (let i = 0; i < pos.count; i++) {
      const x = cx + base[i * 3] * it.radius
      const z = cz + base[i * 3 + 2] * it.radius
      pos.setXYZ(i, x, this.height(x, z) + LIFT, z)
    }
    pos.needsUpdate = true
  }

  private layLine(it: Item) {
    const geo = it.mesh.geometry
    const pos = geo.attributes.position as THREE.BufferAttribute
    const base = geo.userData.base as Float32Array
    // the plane spans -0.5..0.5 across (x) and along (z, after the flat turn: +z is its start)
    const rx = it.dz
    const rz = -it.dx
    for (let i = 0; i < pos.count; i++) {
      const across = base[i * 3] * it.width
      const along = (0.5 - base[i * 3 + 2]) * it.len
      const x = it.ox + it.dx * along + rx * across
      const z = it.oz + it.dz * along + rz * across
