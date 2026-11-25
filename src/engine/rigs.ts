import * as THREE from 'three'
import { UNITS, type UnitKind } from '../game/balance'
import { bakeByMaterial } from './models'
import { COLOR } from './palette'
import type { Team, Unit } from './units'

const D = Math.PI / 180
const UP = new THREE.Vector3(0, 1, 0)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
/** Steering passes per frame for the Hydra's necks, and how high a head's middle lies above its circle (m). */
const NECK_PASSES = 3
const HEAD_LIES = 1

/** Adds a per-instance emissive colour (hit flash, the violet glow of a body that can be raised). */
function patchGlow(mat: THREE.MeshStandardMaterial) {
  mat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aGlow;\nvarying vec3 vGlow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;')
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGlow;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vGlow;')
  }
  mat.customProgramCacheKey = () => 'unit-glow'
}

/** The shadow version of a creature's material: near-black violet, glowing eyes and veins in Umbra. */
/** Mean of a geometry's vertex colours: the real colour of a two-tone part, whose material is white. */
function meanColor(geo: THREE.BufferGeometry | undefined): THREE.Color | null {
  const a = geo?.getAttribute('color')
  if (!a || a.count === 0) return null
  const c = new THREE.Color(0, 0, 0)
  for (let i = 0; i < a.count; i++) c.add(new THREE.Color(a.getX(i), a.getY(i), a.getZ(i)))
  return c.multiplyScalar(1 / a.count)
}

function shadowMaterial(src: THREE.MeshStandardMaterial, geo?: THREE.BufferGeometry): THREE.MeshStandardMaterial {
  const m = src.clone()
  // a shadow is one purple body: the creature's two tones only set how light it is
  m.vertexColors = false
  const c = src.vertexColors ? (meanColor(geo) ?? src.color) : src.color
  const lum = c.r * 0.3 + c.g * 0.59 + c.b * 0.11
  m.color.setRGB(0.045 + lum * 0.16, 0.02 + lum * 0.07, 0.085 + lum * 0.28)
  const glowing = src.emissive && src.emissive.getHex() !== 0 && src.emissiveIntensity > 0
  if (glowing) {
    m.emissive.set(COLOR.umbraHot)
    m.emissiveIntensity = 2.4
  } else {
    m.emissive.set(COLOR.umbraDeep)
    m.emissiveIntensity = 0.5
  }
  m.roughness = 0.55
  m.metalness = 0
  return m
}

interface Part {
  /** Names of the mesh and every named node above it, for hiding a part with its children. */
  chain: string[]
  src: THREE.Mesh
  geo: THREE.BufferGeometry
  mat: THREE.MeshStandardMaterial
  mesh: THREE.InstancedMesh
  glow: THREE.InstancedBufferAttribute
}

/** What a pose function may move: named parts (degrees, added to the rest pose) and the whole body. */
export interface Poser {
  rot(name: string, x: number, y?: number, z?: number): void
  /** Whole body: lift (m), pitch forward and roll to its left (degrees). */
  body(lift: number, pitch?: number, roll?: number): void
  /** Leaves a part, and everything hanging from it, out of this unit's drawing. */
  hide(name: string): void
}

type PoseFn = (p: Poser, u: Unit, t: number) => void

const ease = (k: number) => {
  const c = Math.min(1, Math.max(0, k))
  return c * c * (3 - 2 * c)
}

/** Shared tail end of every pose: hurt, held, thrown, lifted, dead. Returns true when it posed the body. */
function common(p: Poser, u: Unit, t: number, limbs: string[]): boolean {
  if (u.state === 'dead') {
    const k = ease(u.deadT / 0.45)
    p.body(u.radius * 0.55 * k, 8 * k, 90 * u.fallSide * k)
    for (const n of limbs) p.rot(n, 15 * k)
    return true
  }
  if (u.state === 'held') {
    for (let i = 0; i < limbs.length; i++) p.rot(limbs[i], 55 * Math.sin(t * 13 + i * 1.7), 0, 20 * Math.sin(t * 9 + i))
    p.body(0, 20 * Math.sin(t * 3), 25 * Math.sin(t * 2.3))
    return true
  }
  if (u.state === 'thrown') {
    p.body(0, u.t * 520, 30)
    for (let i = 0; i < limbs.length; i++) p.rot(limbs[i], 40 * Math.sin(t * 15 + i))
    return true
  }
  if (u.lifted > 0) {
    p.body(0, 25 * Math.sin(t * 1.3 + u.id), 18 * Math.sin(t * 1.1))
    for (let i = 0; i < limbs.length; i++) p.rot(limbs[i], 30 * Math.sin(t * 2 + i), 0, 15)
    return true
  }
  if (u.state === 'finishing') {
    p.body(0, -14, 6 * u.fallSide)
    for (const n of limbs) p.rot(n, -25)
    return true
  }
  return false
}

const IMP_LIMBS = ['upperarm_L', 'upperarm_R', 'thigh_L', 'thigh_R', 'tail']

/** Imp: hunched, quick, crouches under its circle and leaps claws first. */
const poseImp: PoseFn = (p, u, t) => {
  if (common(p, u, t, IMP_LIMBS)) return
  const s = Math.sin(u.walk * 1.4)
  const amp = Math.min(1.4, Math.hypot(u.vel.x, u.vel.z) / Math.max(1, u.speed))
  const breath = Math.sin(t * 2.4 + u.id) * (1 - Math.min(1, amp))
  p.rot('tail', 10 * Math.sin(t * 2 + u.id), 25 * Math.sin(t * 3 + u.id))
  if (u.state === 'windup') {
    const k = ease(u.t / u.spec.windup)
    const shake = k > 0.7 ? Math.sin(t * 60) * 3 : 0
    p.body(-0.14 * k, 18 * k)
    p.rot('thigh_L', -55 * k)
    p.rot('thigh_R', -55 * k)
    p.rot('shin_L', 85 * k)
    p.rot('shin_R', 85 * k)
    p.rot('torso', 20 * k + shake)
    p.rot('head', -25 * k)
    p.rot('upperarm_L', -150 * k, 0, 25 * k)
    p.rot('upperarm_R', -150 * k, 0, -25 * k)
    p.rot('forearm_L', -35 * k)
    p.rot('forearm_R', -35 * k)
    return
  }
  if (u.state === 'strike') {
    const k = Math.min(1, u.t / (u.spec.lungeTime ?? 0.3))
    p.body(0.55 * Math.sin(Math.PI * k), 35 * Math.sin(Math.PI * k))
    const arm = -150 + 190 * ease(k)
    p.rot('upperarm_L', arm, 0, 20)
    p.rot('upperarm_R', arm, 0, -20)
    p.rot('thigh_L', 35)
    p.rot('thigh_R', 25)
    p.rot('shin_L', 20)
    p.rot('shin_R', 30)
    p.rot('torso', 25)
    return
  }
  if (u.state === 'recover') {
    const k = 1 - ease(u.t / u.spec.recover)
    p.body(-0.08 * k, 20 * k)
    p.rot('upperarm_L', 40 * k)
    p.rot('upperarm_R', 40 * k)
    p.rot('torso', 25 * k)
    p.rot('thigh_L', -30 * k)
    p.rot('thigh_R', -30 * k)
    p.rot('shin_L', 50 * k)
    p.rot('shin_R', 50 * k)
    return
  }
  if (u.state === 'stagger') {
    p.body(-0.06, 10, 8 * Math.sin(t * 3.2))
    p.rot('head', 30 + 12 * Math.sin(t * 5))
    p.rot('torso', 30)
    p.rot('upperarm_L', 12, 0, 8 * Math.sin(t * 4))
    p.rot('upperarm_R', 12, 0, -8 * Math.sin(t * 4.4))
    p.rot('forearm_L', 25)
    p.rot('forearm_R', 25)
    p.rot('thigh_L', -25)
    p.rot('thigh_R', -15)
    p.rot('shin_L', 40)
    p.rot('shin_R', 30)
    return
  }
  p.body(0.03 * Math.abs(s) * amp, 10 * amp)
  p.rot('thigh_L', -32 * s * amp)
  p.rot('thigh_R', 32 * s * amp)
  p.rot('shin_L', Math.max(0, 45 * Math.sin(u.walk * 1.4 + 1.2)) * amp)
  p.rot('shin_R', Math.max(0, 45 * Math.sin(u.walk * 1.4 + 1.2 + Math.PI)) * amp)
  p.rot('upperarm_L', 28 * s * amp - 10, 0, 8)
  p.rot('upperarm_R', -28 * s * amp - 10, 0, -8)
  p.rot('forearm_L', -20)
  p.rot('forearm_R', -20)
  p.rot('torso', 8 + 10 * amp + 3 * breath)
  p.rot('head', -6 - 6 * amp)
}

const HOUND_LIMBS = ['leg_FL', 'leg_FR', 'leg_HL', 'leg_HR', 'tail']

/** Hellhound: three heads on a lean body; circles, crouches, then lunges along its line. */
const poseHound: PoseFn = (p, u, t) => {
  if (common(p, u, t, HOUND_LIMBS)) return
  const ph = u.walk * 1.1
  const amp = Math.min(1.4, Math.hypot(u.vel.x, u.vel.z) / Math.max(1, u.speed * 0.6))
  p.rot('tail', -10 + 10 * Math.sin(t * 3), 25 * Math.sin(t * 4 + u.id))
  for (let i = 0; i < 3; i++) p.rot('neck' + i, -4 + 6 * Math.sin(t * 2.6 + i * 2.1 + u.id), (i === 1 ? 10 : i === 2 ? -10 : 0) + 6 * Math.sin(t * 1.7 + i))
  if (u.state === 'windup') {
    const k = ease(u.t / u.spec.windup)
    p.body(-0.2 * k, -6 * k)
    p.rot('leg_FL', -25 * k)
    p.rot('leg_FR', -25 * k)
    p.rot('leg_HL', 30 * k)
    p.rot('leg_HR', 30 * k)
    for (let i = 0; i < 3; i++) p.rot('neck' + i, 28 * k + Math.sin(t * 40 + i) * 2 * k, (i === 1 ? 14 : i === 2 ? -14 : 0) * k)
    p.rot('tail', -35 * k)
    return
  }
  if (u.state === 'strike') {
    const k = Math.min(1, u.t / (u.spec.lungeTime ?? 0.45))
    p.body(0.35 * Math.sin(Math.PI * k), -12 * Math.sin(Math.PI * k))
    p.rot('leg_FL', -65)
    p.rot('leg_FR', -60)
    p.rot('leg_HL', 65)
    p.rot('leg_HR', 60)
    for (let i = 0; i < 3; i++) p.rot('neck' + i, -18, (i === 1 ? 6 : i === 2 ? -6 : 0))
    return
  }
  if (u.state === 'stagger') {
    p.body(-0.12, 6, 7 * Math.sin(t * 3))
    for (let i = 0; i < 3; i++) p.rot('neck' + i, 40 + 8 * Math.sin(t * 4 + i), (i - 1) * -12)
    p.rot('leg_FL', 10 * Math.sin(t * 5))
    p.rot('leg_FR', -10 * Math.sin(t * 5))
    p.rot('leg_HL', 15)
    p.rot('leg_HR', 15)
    return
  }
  // trot: diagonal pairs move together
  const a = Math.sin(ph)
  p.body(0.05 * Math.abs(Math.sin(ph * 2)) * amp, 3 * Math.sin(ph * 2) * amp)
  p.rot('leg_FL', 38 * a * amp)
  p.rot('leg_HR', 38 * a * amp)
  p.rot('leg_FR', -38 * a * amp)
  p.rot('leg_HL', -38 * a * amp)
}

const HARPY_LIMBS = ['upperarm_L', 'upperarm_R', 'thigh_L', 'thigh_R']

/** Harpy: wing-arms. Hovers on slow beats, rears back to scream, then dives talons first. */
const poseHarpy: PoseFn = (p, u, t) => {
  if (common(p, u, t, HARPY_LIMBS)) return
  const flying = u.flyer && u.alt > 0.8
  if (u.state === 'windup') {
    const k = ease(u.t / u.spec.windup)
    p.body(0, -22 * k)
    p.rot('upperarm_L', -20 * k, 0, 130 * k + 6 * Math.sin(t * 30))
    p.rot('upperarm_R', -20 * k, 0, -130 * k - 6 * Math.sin(t * 30))
    p.rot('head', -35 * k + 4 * Math.sin(t * 50))
    p.rot('thigh_L', 25)
    p.rot('thigh_R', 25)
    p.rot('shin_L', 40)
    p.rot('shin_R', 40)
    return
  }
  if (u.state === 'strike') {
    p.body(0, 62)
    p.rot('upperarm_L', 55, 0, 55)
    p.rot('upperarm_R', 55, 0, -55)
    p.rot('thigh_L', -65)
    p.rot('thigh_R', -60)
    p.rot('shin_L', 25)
    p.rot('shin_R', 25)
    p.rot('head', -30)
    return
  }
  if (u.state === 'stagger') {
    p.body(0, 15, 9 * Math.sin(t * 3))
    p.rot('upperarm_L', 10, 0, 30 + 10 * Math.sin(t * 6))
    p.rot('upperarm_R', 10, 0, -30 - 10 * Math.sin(t * 6))
    p.rot('head', 30)
    p.rot('torso', 20)
    return
  }
  if (flying) {
    const fast = u.state === 'recover' ? 1.6 : 1
    const flap = Math.sin(t * 8.5 * fast + u.id)
    p.body(0.12 * Math.sin(t * 8.5 * fast + u.id + 1.2), 14 + 6 * Math.min(1, Math.hypot(u.vel.x, u.vel.z) / u.speed))
    p.rot('upperarm_L', 0, 0, 85 + 42 * flap)
    p.rot('upperarm_R', 0, 0, -85 - 42 * flap)
    p.rot('forearm_L', 0, 0, 15 * flap)
    p.rot('forearm_R', 0, 0, -15 * flap)
    p.rot('thigh_L', 28)
    p.rot('thigh_R', 34)
    p.rot('shin_L', 45)
    p.rot('shin_R', 40)
    return
  }
  // on the ground (downed): wings dragging and beating weakly
  const s = Math.sin(u.walk * 1.4)
  const amp = Math.min(1, Math.hypot(u.vel.x, u.vel.z) / Math.max(1, u.speed * 0.35))
  const weak = u.downed > 0 ? 18 * Math.sin(t * 14) : 0
  p.body(-0.05, 18)
  p.rot('upperarm_L', 20, 0, 30 + weak)
  p.rot('upperarm_R', 20, 0, -30 - weak)
