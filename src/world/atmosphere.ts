import * as THREE from 'three'
import { toMap, WATER_LEVEL, WATER_RECT, ZONES, zoneWeights } from './map'

/** Top of the sky per zone: clear blue over the first three, grey over the ruins, smoke over the burning valley. */
const ZENITH: Record<string, string> = { pembuka: '#47689a', tebing: '#47689a', rawa: '#4f6a82', kuil: '#565e6c', bara: '#3e1d17' }

/** Towards the morning sun: low in the east-south-east, like the previz hero shot. */
export const SUN_DIR = new THREE.Vector3(0.78, 0.42, 0.46).normalize()

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w;
}`

const SKY_FRAG = /* glsl */ `
uniform vec3 zenith;
uniform vec3 horizon;
uniform vec3 ground;
uniform vec3 fogColor;
uniform vec3 sunDir;
uniform vec3 sunColor;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 c = mix(horizon, zenith, smoothstep(0.02, 0.55, h));
  c = mix(c, ground, smoothstep(0.0, -0.25, h));
  // the band at the horizon takes the fog colour, so far hills melt into the sky
  c = mix(c, fogColor, (1.0 - smoothstep(0.0, 0.22, abs(h))) * 0.85);
  float s = max(dot(d, sunDir), 0.0);
  c += sunColor * (pow(s, 600.0) * 6.0 + pow(s, 12.0) * 0.25);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`

/**
 * Fog, sky and ambient light. Each zone has its own fog colour and sight distance; at any spot they
 * blend by the zone weights, and the blend eases over time so walking between zones never pops.
 */
export class Atmosphere {
  readonly fog = new THREE.FogExp2('#cddbea', 0.007)
  readonly hemi = new THREE.HemisphereLight('#c6d4e6', '#4a4636', 1.9)
  readonly sun = new THREE.DirectionalLight('#ffe9cc', 3.6)
  readonly sky: THREE.Mesh
  private readonly uniforms: Record<string, THREE.IUniform>
  /** How much of each zone (ZONES order) is around her now; the sound mixes by it too. */
  readonly w = new Float32Array(ZONES.length)
  private readonly fogTarget = new THREE.Color()
  private readonly skyTarget = new THREE.Color()
  private densityTarget = 0.007
  private readonly zoneFog = ZONES.map((z) => new THREE.Color(z.fog))
  private readonly zoneSky = ZONES.map((z) => new THREE.Color(z.sky))
  private readonly zoneZenith = ZONES.map((z) => new THREE.Color(ZENITH[z.key] ?? '#47689a'))
  private readonly zenithTarget = new THREE.Color()
  /** Index of the zone with the largest share where she stands. */
  zone = 0

  constructor(scene: THREE.Scene) {
    scene.fog = this.fog
    this.uniforms = {
      zenith: { value: new THREE.Color('#47689a') },
      horizon: { value: new THREE.Color('#e9d7c0') },
      ground: { value: new THREE.Color('#2a2a26') },
      fogColor: { value: this.fog.color },
      sunDir: { value: SUN_DIR },
      sunColor: { value: new THREE.Color('#ffe2b0') },
    }
    const mat = new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, fog: false })
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat)
    this.sky.name = 'sky'
    this.sky.frustumCulled = false
    this.sky.renderOrder = -1
    scene.add(this.sky, this.hemi, this.sun, this.sun.target)

    const s = this.sun
    s.castShadow = true
    s.shadow.mapSize.set(2048, 2048)
    const box = 60
    s.shadow.camera.left = -box
    s.shadow.camera.right = box
    s.shadow.camera.top = box
    s.shadow.camera.bottom = -box
    s.shadow.camera.near = 1
    s.shadow.camera.far = 400
    s.shadow.bias = -0.0006
    s.shadow.normalBias = 0.04
  }

  /** Where she stands (world). Snap jumps straight to the zone's look (first frame, teleports). */
  update(dt: number, at: THREE.Vector3, camPos: THREE.Vector3, snap = false) {
    const [mx, my] = toMap(at.x, at.z)
    zoneWeights(mx, my, this.w)
    this.fogTarget.setRGB(0, 0, 0)
    this.skyTarget.setRGB(0, 0, 0)
    this.zenithTarget.setRGB(0, 0, 0)
    let inv = 0
    let best = 0
    for (let i = 0; i < ZONES.length; i++) {
      const w = this.w[i]
      this.fogTarget.r += this.zoneFog[i].r * w
      this.fogTarget.g += this.zoneFog[i].g * w
      this.fogTarget.b += this.zoneFog[i].b * w
      this.skyTarget.r += this.zoneSky[i].r * w
      this.skyTarget.g += this.zoneSky[i].g * w
      this.skyTarget.b += this.zoneSky[i].b * w
      this.zenithTarget.r += this.zoneZenith[i].r * w
      this.zenithTarget.g += this.zoneZenith[i].g * w
