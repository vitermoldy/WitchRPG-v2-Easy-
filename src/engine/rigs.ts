import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
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

/**
 * Colour variants worn by elites (owner, 28 Nov 2026: the colour variants of the reference pictures, on
 * elites only): material slot of the block-out -> colour. The slot's two-tone shading gives way to the
 * plain colour.
 */
export const VARIANTS: Partial<Record<UnitKind, Record<string, string>>> = {
  // the dark harpy: brown feathers and wings
  harpy: { membrane: '#4a3424', accent: '#2a1e16', hair: '#1e1612', leg: '#5a3a24' },
  // the white-and-gold griffin
  griffin: { body: '#d8ac48', body2: '#f2eee6', membrane: '#f0ebe0', accent: '#c89a38' },
  // the lavender hellhound, after the purple Cerberus of the poster
  hellhound: { body_veins: '#9a92ae', snake: '#7e7694', horn: '#f2f0ea', mouth: '#a01c22' },
  // kinds that are never elite wear theirs at random (owner): the pink Pegasus with a teal mane,
  pegasus: { body: '#f4dce6', body2: '#4ac8b0', membrane: '#f8e6ee', accent: '#f0d2de' },
  // the dark blue Cerberus with glowing cyan eyes and mouths, after the blazing hound of the poster,
  cerberus: { body: '#1e2434', collar: '#0e1018', mouth: '#2ad8f0', nose: '#10141c' },
  // and the Chimera with a red mane and a green snake
  chimera: { body2: '#b83a20', snake: '#3e7a34', goat: '#8a8a8a' },
}

/** Kinds whose variant shows on about one creature in four, chosen by the creature's id (not by elites). */
const RANDOM_VARIANTS = new Set<UnitKind>(['pegasus', 'cerberus', 'chimera'])
const VARIANT_SHARE = 0.25

/** Whether a creature wears its kind's colour variant: elites of most kinds, one in four of the random kinds. */
function wearsVariant(u: Unit) {
  if (u.team !== 'enemy' || !VARIANTS[u.kind]) return false
  if (RANDOM_VARIANTS.has(u.kind)) return ((Math.imul(u.id, 2654435761) >>> 0) / 4294967296) < VARIANT_SHARE
  return !!u.elite
}

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
  p.rot('thigh_L', -28 * s * amp - 10)
  p.rot('thigh_R', 28 * s * amp - 10)
  p.rot('shin_L', 30 + Math.max(0, 30 * Math.sin(u.walk * 1.4 + 1.2)) * amp)
  p.rot('shin_R', 30 + Math.max(0, 30 * Math.sin(u.walk * 1.4 + 1.2 + Math.PI)) * amp)
  p.rot('head', -10)
}

/** Diagonal-pair trot of a four-legged body; shared by the Centaur's horse half and the Chimera. */
function trot(p: Poser, u: Unit, swing: number, speedShare: number) {
  const ph = u.walk * 1.0
  const amp = Math.min(1.4, Math.hypot(u.vel.x, u.vel.z) / Math.max(1, u.speed * speedShare))
  const a = Math.sin(ph)
  p.rot('leg_FL', swing * a * amp)
  p.rot('leg_HR', swing * a * amp)
  p.rot('leg_FR', -swing * a * amp)
  p.rot('leg_HL', -swing * a * amp)
  return { ph, amp }
}

const CENTAUR_LIMBS = ['leg_FL', 'leg_FR', 'leg_HL', 'leg_HR', 'upperarm_L', 'upperarm_R']

/** Centaur: an old archer on a horse's body. Draws, holds, looses; rears to kick when she is close. */
const poseCentaur: PoseFn = (p, u, t) => {
  if (common(p, u, t, CENTAUR_LIMBS)) return
  const { ph, amp } = trot(p, u, 34, 0.7)
  p.rot('tail', -15 + 8 * Math.sin(t * 3), 18 * Math.sin(t * 2.4 + u.id))
  p.body(0.06 * Math.abs(Math.sin(ph * 2)) * amp, 2 * Math.sin(ph * 2) * amp)
  // bow arm: the left hand holds the bow out, the right pulls the string to the cheek
  const draw = u.state === 'windup' && u.atk.shot ? ease(u.t / u.atk.windup) : u.state === 'recover' && u.atk.shot ? 1 - ease(u.t / 0.25) : 0
  if (u.state === 'windup' && !u.atk.shot) {
    const k = ease(u.t / u.atk.windup)
    p.body(0.25 * k, -22 * k)
    p.rot('leg_FL', -70 * k)
    p.rot('leg_FR', -55 * k)
    return
  }
  if (u.state === 'strike' && !u.atk.shot) {
    p.body(0.1, 8)
    p.rot('leg_FL', 30)
    p.rot('leg_FR', 25)
    return
  }
  if (u.state === 'stagger') {
    p.body(-0.1, 5, 6 * Math.sin(t * 3))
    p.rot('torso', 25)
    p.rot('head', 25 + 8 * Math.sin(t * 4))
    return
  }
  p.rot('upperarm_L', -80 * draw - 10, -10 * draw, 0)
  p.rot('forearm_L', -5 * draw)
  p.rot('upperarm_R', -85 * draw - 5, 35 * draw)
  p.rot('forearm_R', -120 * draw)
  p.rot('torso', 4 - 6 * draw, -25 * draw)
  p.rot('head', -4, -15 * draw)
}

/** Naga Rawa: a long swamp serpent. Sways, rears back to spit, snaps forward to bite. */
const poseNaga: PoseFn = (p, u, t) => {
  if (common(p, u, t, ['head'])) return
  const sway = Math.sin(t * 1.8 + u.id)
  p.rot('body', 0, 10 * sway)
  if (u.state === 'windup') {
    const k = ease(u.t / u.atk.windup)
    p.body(0.1 * k, -12 * k)
    p.rot('head', -35 * k + Math.sin(t * 40) * 2 * k)
    return
  }
  if (u.state === 'strike' || (u.state === 'recover' && u.t < 0.2)) {
    p.body(0, 14)
    p.rot('head', 30)
    return
  }
  if (u.state === 'stagger') {
    p.body(-0.15, 10, 8 * Math.sin(t * 3))
    p.rot('head', 40)
    return
  }
  p.body(0.05 * Math.sin(t * 2.2 + u.id), 3 * sway)
  p.rot('head', 6 * Math.sin(t * 2.6 + u.id), -8 * sway)
}

const MINO_LIMBS = ['upperarm_L', 'upperarm_R', 'thigh_L', 'thigh_R', 'tail']

/** Minotaur: heavy steps, the axes raised high and brought down, or head lowered for the charge. */
const poseMinotaur: PoseFn = (p, u, t) => {
  if (common(p, u, t, MINO_LIMBS)) return
  const s = Math.sin(u.walk * 1.1)
  const amp = Math.min(1.4, Math.hypot(u.vel.x, u.vel.z) / Math.max(1, u.speed))
  p.rot('tail', 10, 20 * Math.sin(t * 2 + u.id))
  const charge = u.atk.name === 'seruduk'
  if (u.state === 'windup') {
    const k = ease(u.t / u.atk.windup)
    if (charge) {
      p.body(-0.1 * k, 18 * k)
      p.rot('torso', 30 * k)
      p.rot('head', 35 * k)
      p.rot('upperarm_L', 30 * k, 0, 20 * k)
      p.rot('upperarm_R', 30 * k, 0, -20 * k)
      p.rot('thigh_L', -40 * k)
      p.rot('shin_L', 50 * k)
      p.rot('thigh_R', 20 * k)
    } else {
      p.body(-0.05 * k, -10 * k)
      p.rot('torso', -15 * k)
      p.rot('upperarm_L', -165 * k, 0, 15 * k)
      p.rot('upperarm_R', -165 * k, 0, -15 * k)
      p.rot('forearm_L', -30 * k)
      p.rot('forearm_R', -30 * k)
    }
    return
  }
  if (u.state === 'strike') {
    if (charge) {
      const run = Math.sin(t * 18)
      p.body(0.05 * Math.abs(run), 25)
      p.rot('torso', 30)
      p.rot('head', 40)
      p.rot('thigh_L', -45 * run)
      p.rot('thigh_R', 45 * run)
      p.rot('upperarm_L', 35, 0, 25)
      p.rot('upperarm_R', 35, 0, -25)
    } else {
      const k = ease(u.t / (u.atk.lungeTime ?? 0.35))
      p.body(0, 18 * k)
      p.rot('torso', 35 * k)
      p.rot('upperarm_L', -165 + 185 * k, 0, 15)
      p.rot('upperarm_R', -165 + 185 * k, 0, -15)
    }
    return
  }
  if (u.state === 'stagger') {
    p.body(-0.1, 8, 6 * Math.sin(t * 2.6))
    p.rot('torso', 25)
    p.rot('head', 30 + 10 * Math.sin(t * 4))
    p.rot('upperarm_L', 15, 0, 15)
    p.rot('upperarm_R', 15, 0, -15)
    return
  }
  p.body(0.04 * Math.abs(s) * amp, 6 * amp)
  p.rot('thigh_L', -26 * s * amp)
  p.rot('thigh_R', 26 * s * amp)
  p.rot('shin_L', Math.max(0, 35 * Math.sin(u.walk * 1.1 + 1.2)) * amp)
  p.rot('shin_R', Math.max(0, 35 * Math.sin(u.walk * 1.1 + 1.2 + Math.PI)) * amp)
  p.rot('upperarm_L', 18 * s * amp - 8, 0, 10)
  p.rot('upperarm_R', -18 * s * amp - 8, 0, -10)
  p.rot('torso', 6 + 4 * amp + 2 * Math.sin(t * 1.8))
}

const MEDUSA_LIMBS = ['upperarm_L', 'upperarm_R', 'tail']

/** Medusa: glides on her snake tail. Rises and spreads her arms for the gaze; strikes low for the bite. */
const poseMedusa: PoseFn = (p, u, t) => {
  if (common(p, u, t, MEDUSA_LIMBS)) return
  const sway = Math.sin(t * 1.6 + u.id)
  p.rot('tail', 0, 14 * Math.sin(u.walk * 0.8 + t))
  const gaze = u.atk.effect === 'petrify'
  if (u.state === 'windup') {
    const k = ease(u.t / u.atk.windup)
    if (gaze) {
      p.body(0.3 * k, -10 * k)
      p.rot('torso', -12 * k)
      p.rot('head', -18 * k + Math.sin(t * 30) * 2 * k)
      p.rot('upperarm_L', -40 * k, 0, 75 * k)
      p.rot('upperarm_R', -40 * k, 0, -75 * k)
    } else {
      p.body(-0.1 * k, -8 * k)
      p.rot('torso', -20 * k)
      p.rot('upperarm_L', -60 * k)
      p.rot('upperarm_R', -60 * k)
    }
    return
  }
  if (u.state === 'strike') {
    p.body(0, 20)
    p.rot('torso', 30)
    p.rot('head', 15)
    p.rot('upperarm_L', -70)
    p.rot('upperarm_R', -70)
    return
  }
  if (u.state === 'stagger') {
    p.body(-0.15, 10, 8 * Math.sin(t * 3))
    p.rot('torso', 25)
    p.rot('head', 30)
    return
  }
  p.body(0.05 * Math.sin(t * 2 + u.id), 4 * sway)
  p.rot('torso', 4 * sway, 6 * sway)
  p.rot('upperarm_L', 10 * Math.sin(t * 1.3), 0, 12)
  p.rot('upperarm_R', -10 * Math.sin(t * 1.3), 0, -12)
}

const CHIMERA_LIMBS = ['leg_FL', 'leg_FR', 'leg_HL', 'leg_HR', 'tail_snake']

/** Chimera: the lion breathes fire, the goat lowers its horns to charge, the snake tail rears and stings. */
const poseChimera: PoseFn = (p, u, t) => {
  if (common(p, u, t, CHIMERA_LIMBS)) return
  const { ph, amp } = trot(p, u, 30, 0.6)
  p.rot('tail_snake', -20 + 10 * Math.sin(t * 2.4), 20 * Math.sin(t * 1.9 + u.id))
  p.rot('head_lion', 4 * Math.sin(t * 2.2), 6 * Math.sin(t * 1.3))
  p.rot('head_goat', 3 * Math.sin(t * 2.6 + 1))
  const name = u.atk.name
  if (u.state === 'windup') {
    const k = ease(u.t / u.atk.windup)
    if (name === 'napas api') {
      p.body(-0.15 * k, -6 * k)
      p.rot('head_lion', -30 * k)
    } else if (name === 'seruduk kambing') {
      p.body(-0.2 * k, 6 * k)
      p.rot('head_goat', 40 * k)
      p.rot('leg_FL', -25 * k)
      p.rot('leg_FR', -25 * k)
    } else {
      p.rot('tail_snake', -80 * k + Math.sin(t * 30) * 3 * k)
    }
    return
  }
  if (u.state === 'strike' || (u.state === 'recover' && u.t < 0.25)) {
    if (name === 'napas api') {
      p.body(0, 8)
      p.rot('head_lion', 20)
    } else if (name === 'seruduk kambing') {
      p.body(0.2 * Math.abs(Math.sin(t * 16)), 10)
      p.rot('head_goat', 45)
      p.rot('leg_FL', -60 * Math.sin(t * 16))
      p.rot('leg_FR', 60 * Math.sin(t * 16))
    } else p.rot('tail_snake', 50)
    return
  }
  if (u.state === 'stagger') {
    p.body(-0.2, 5, 6 * Math.sin(t * 2.6))
    p.rot('head_lion', 35)
    p.rot('head_goat', 30)
    return
  }
  p.body(0.06 * Math.abs(Math.sin(ph * 2)) * amp, 2 * Math.sin(ph * 2) * amp)
}

/** A two-legged body with arms: a raise-and-bring-down blow, a walk, a stagger. Cyclops, Succubus, Incubus. */
function biped(opts: { heavy: number; reach: number; sway: number }): PoseFn {
  const limbs = ['upperarm_L', 'upperarm_R', 'thigh_L', 'thigh_R']
  return (p, u, t) => {
    if (common(p, u, t, limbs)) return
    const s = Math.sin(u.walk * (1.4 - 0.3 * opts.heavy))
    const amp = Math.min(1.4, Math.hypot(u.vel.x, u.vel.z) / Math.max(1, u.speed))
    const throwing = !!u.atk.shot
    if (u.state === 'windup') {
      const k = ease(u.t / (u.atk.windup * u.tempo))
      if (throwing) {
        // one arm back and up, the other forward: a throw or a cast
        p.rot('upperarm_R', -150 * k, 0, -20 * k)
        p.rot('forearm_R', -40 * k)
        p.rot('upperarm_L', -60 * k, 0, 25 * k)
        p.rot('torso', -10 * k, 25 * k)
      } else {
        p.body(-0.05 * k * opts.heavy, -8 * k)
        p.rot('upperarm_L', -160 * k, 0, 15 * k)
        p.rot('upperarm_R', -160 * k, 0, -15 * k)
        p.rot('torso', -12 * k)
      }
      return
    }
    if (u.state === 'strike' || (u.state === 'recover' && u.t < 0.25 && throwing)) {
      if (throwing) {
        p.rot('upperarm_R', -40, 0, -10)
        p.rot('upperarm_L', -40, 0, 20)
        p.rot('torso', 10, -20)
      } else {
        const k = ease(u.t / (u.atk.lungeTime ?? 0.3))
        p.body(0, 16 * k * opts.reach)
        p.rot('torso', 30 * k)
        p.rot('upperarm_L', -160 + 180 * k, 0, 15)
        p.rot('upperarm_R', -160 + 180 * k, 0, -15)
      }
      return
    }
    if (u.state === 'stagger') {
      p.body(-0.08, 8, 7 * Math.sin(t * 3))
      p.rot('torso', 25)
      p.rot('head', 25 + 8 * Math.sin(t * 4))
      p.rot('upperarm_L', 12, 0, 12)
      p.rot('upperarm_R', 12, 0, -12)
      return
    }
    p.body(0.04 * Math.abs(s) * amp, 5 * amp)
    p.rot('thigh_L', -26 * s * amp)
    p.rot('thigh_R', 26 * s * amp)
    p.rot('shin_L', Math.max(0, 35 * Math.sin(u.walk * 1.2 + 1.2)) * amp)
    p.rot('shin_R', Math.max(0, 35 * Math.sin(u.walk * 1.2 + 1.2 + Math.PI)) * amp)
    p.rot('upperarm_L', 18 * s * amp - 8, 0, 8 + opts.sway * Math.sin(t * 1.4))
    p.rot('upperarm_R', -18 * s * amp - 8, 0, -8 - opts.sway * Math.sin(t * 1.4))
    p.rot('torso', 4 + 3 * Math.sin(t * 1.6 + u.id))
  }
}

/** Phoenix: rides on fire, sways and tilts as it circles, dives head first. */
const posePhoenix: PoseFn = (p, u, t) => {
  if (common(p, u, t, ['leg_L', 'leg_R', 'tail'])) return
  const flying = u.flyer && u.alt > 0.8
  p.rot('tail', -10 + 8 * Math.sin(t * 3), 18 * Math.sin(t * 2.2 + u.id))
  if (u.state === 'windup') {
    const k = ease(u.t / (u.atk.windup * u.tempo))
    p.body(0.3 * k, -25 * k, 8 * Math.sin(t * 20) * k)
    p.rot('head', -30 * k)
    return
  }
  if (u.state === 'strike') {
    p.body(0, 65)
    p.rot('head', -20)
    p.rot('leg_L', 50)
    p.rot('leg_R', 50)
    return
  }
  if (flying) {
    p.body(0.25 * Math.sin(t * 5 + u.id), 10, 12 * Math.sin(t * 1.3 + u.id))
    p.rot('leg_L', 40)
    p.rot('leg_R', 40)
    p.rot('head', 6 * Math.sin(t * 2.4))
    return
  }
  p.body(-0.1, 15, 6 * Math.sin(t * 3))
  p.rot('head', 15)
}

/**
 * Hydra: each neck reads its head. A head winding up rears back; a striking or resting-after-strike head
 * bends down toward its circle; a severed head hangs; a swallowed one is gone. The shadow Hydra, without
 * heads of its own, slams with the middle head when it strikes.
 */
const poseHydra: PoseFn = (p, u, t) => {
  if (u.state === 'dead') {
    const k = ease(u.deadT / 1.2)
    p.body(-1.6 * k, 12 * k, 6 * k)
    for (let i = 0; i < 5; i++) for (let s = 0; s < 7; s++) p.rot(`neck${i}_${s}`, 14 * k)
    return
  }
  p.body(0.25 * Math.sin(t * 0.8 + u.id), 2 * Math.sin(t * 0.6))
  p.rot('tail', 0, 15 * Math.sin(t * 0.9))
  for (let i = 0; i < 5; i++) {
    const h = u.parts ? u.parts[i] : undefined
    if (h === null) {
      // swallowed: the whole neck is gone
      p.hide(`neck${i}_0`)
      continue
    }
    let mode: 'rest' | 'rear' | 'down' | 'limp' = 'rest'
    let target: { x: number; z: number } | null = null
    if (h) {
      if (!h.alive || h.state === 'finishing') mode = 'limp'
      else if (h.state === 'windup') mode = 'rear'
      else if (h.state === 'strike' || h.state === 'recover' || h.state === 'stagger') mode = 'down'
      target = h.aimAt
    } else if (i === 2 && (u.state === 'windup' || u.state === 'strike' || u.state === 'recover')) {
      mode = u.state === 'windup' ? 'rear' : 'down'
      target = u.aimAt
    }
    let yaw = 0
    if (target && mode !== 'limp') {
      const want = Math.atan2(target.x - u.pos.x, target.z - u.pos.z)
      yaw = Math.max(-1.1, Math.min(1.1, Math.atan2(Math.sin(want - u.yaw), Math.cos(want - u.yaw)))) / D
    }
    // coming down, the rig steers the turn as well; until then the turn it would start from follows the aim
    if (h && mode === 'down') yaw = h.neckYaw
    else if (h) h.neckYaw = yaw
    const sway = 4 * Math.sin(t * 1.1 + i * 1.7)
    for (let s = 0; s < 7; s++) {
      let x = -2 + sway * 0.3
      if (mode === 'rear') x = -9
      // a head coming down: the rig steers lean and curl until the head lies on its circle
      else if (mode === 'down' && h) x = s === 0 ? h.neckLean : h.neckCurl
      else if (mode === 'limp') x = 22
      p.rot(`neck${i}_${s}`, x, s === 0 ? yaw * 0.6 : yaw * 0.07, 0)
    }
    if (mode === 'limp' && h && !h.alive) p.hide('head' + i)
  }
}

/**
 * Four-legged beasts with a head and a tail (Griffin, Hippogriff, Pegasus, Unicorn, the Dragon): a
 * gallop on the ground, legs tucked under in the air, the head reared back to wind up and thrust out
 * to strike. Fauna standing still lower their heads to graze.
 */
const poseBeast: PoseFn = (p, u, t) => {
  if (common(p, u, t, ['leg_FL', 'leg_FR', 'leg_HL', 'leg_HR', 'tail'])) return
  const flying = u.flyer && u.alt > 0.8
  p.rot('tail', -8 + 8 * Math.sin(t * 2.6), 16 * Math.sin(t * 2 + u.id))
  if (u.state === 'windup') {
    const k = ease(u.t / (u.atk.windup * u.tempo))
    p.body(0.2 * k, -18 * k)
    p.rot('neck', -25 * k)
    p.rot('head', -20 * k)
    if (!flying) {
      p.rot('leg_FL', -30 * k)
      p.rot('leg_FR', -30 * k)
    }
    return
  }
  if (u.state === 'strike') {
    const k = Math.min(1, u.t / (u.atk.lungeTime ?? 0.4))
    p.body(0, 20 * Math.sin(Math.PI * k))
    p.rot('neck', 25)
    p.rot('head', 18)
    p.rot('leg_FL', -55)
    p.rot('leg_FR', -50)
    p.rot('leg_HL', 45)
    p.rot('leg_HR', 40)
    return
  }
  if (u.state === 'stagger') {
    p.body(-0.1, 8, 8 * Math.sin(t * 3))
    p.rot('head', 25 + 8 * Math.sin(t * 4))
    return
  }
  if (flying) {
    p.body(0.3 * Math.sin(t * 2.2 + u.id), 6, 10 * Math.sin(t * 1.1 + u.id))
    p.rot('leg_FL', -50)
    p.rot('leg_FR', -50)
    p.rot('leg_HL', 55)
    p.rot('leg_HR', 55)
    p.rot('head', 4 * Math.sin(t * 2))
    return
  }
  const ph = u.walk * 1.2
  const amp = Math.min(1.4, Math.hypot(u.vel.x, u.vel.z) / Math.max(1, u.speed * 0.6))
  const a = Math.sin(ph)
  p.body(0.05 * Math.abs(Math.sin(ph * 2)) * amp, 3 * Math.sin(ph * 2) * amp)
  p.rot('leg_FL', 34 * a * amp)
  p.rot('leg_HR', 34 * a * amp)
  p.rot('leg_FR', -34 * a * amp)
  p.rot('leg_HL', -34 * a * amp)
  const graze = u.spec.passive && amp < 0.1
  p.rot('neck', graze ? 32 + 4 * Math.sin(t * 1.3 + u.id) : 0)
  p.rot('head', graze ? 25 : 4 * Math.sin(t * 1.6 + u.id))
}

/** A biped whose lower body is one or more serpents (Lilith, Typhon): the coils sway as it moves. */
function serpentine(base: PoseFn, part: string): PoseFn {
  return (p, u, t) => {
    base(p, u, t)
    if (u.state !== 'dead') p.rot(part, 3 * Math.sin(t * 1.4 + u.id), 10 * Math.sin(t * 1.1 + u.id))
  }
}

// ------------------------------------------------------------ Tanah Ganjil (Easy, 28 Nov 2026)

/**
 * Flyers with wings on their backs (Sirena, Cacodaemon): the wings beat while it hovers, fold back as it
 * dives, the arms reach and the legs tuck; on the ground (downed) the wings drag.
 */
const poseWinged: PoseFn = (p, u, t) => {
  if (common(p, u, t, ['upperarm_L', 'upperarm_R', 'thigh_L', 'thigh_R', 'wing_L', 'wing_R'])) return
  const flying = u.flyer && u.alt > 0.8
  p.rot('tail', -10 + 8 * Math.sin(t * 2.6), 18 * Math.sin(t * 2 + u.id))
  if (u.state === 'windup') {
    const k = ease(u.t / (u.atk.windup * u.tempo))
    p.body(0, -22 * k)
    p.rot('wing_L', 0, 0, 30 * k + 8 * Math.sin(t * 30))
    p.rot('wing_R', 0, 0, -30 * k - 8 * Math.sin(t * 30))
    p.rot('upperarm_L', -60 * k, 0, 30 * k)
    p.rot('upperarm_R', -60 * k, 0, -30 * k)
    p.rot('head', -30 * k)
    return
  }
  if (u.state === 'strike') {
    p.body(0, 62)
    p.rot('wing_L', 0, 0, -35)
    p.rot('wing_R', 0, 0, 35)
    p.rot('upperarm_L', -120, 0, 15)
    p.rot('upperarm_R', -120, 0, -15)
    p.rot('thigh_L', -50)
    p.rot('thigh_R', -45)
    return
  }
  if (u.state === 'stagger') {
    p.body(0, 15, 9 * Math.sin(t * 3))
    p.rot('wing_L', 0, 0, 25 + 15 * Math.sin(t * 6))
    p.rot('wing_R', 0, 0, -25 - 15 * Math.sin(t * 6))
    p.rot('head', 30)
    return
  }
  if (flying) {
    const fast = u.state === 'recover' ? 1.6 : 1
    const flap = Math.sin(t * 7.5 * fast + u.id)
    p.body(0.14 * Math.sin(t * 7.5 * fast + u.id + 1.2), 12 + 6 * Math.min(1, Math.hypot(u.vel.x, u.vel.z) / u.speed))
    p.rot('wing_L', 0, 0, 10 + 38 * flap)
    p.rot('wing_R', 0, 0, -10 - 38 * flap)
    p.rot('upperarm_L', -25, 0, 10)
    p.rot('upperarm_R', -25, 0, -10)
    p.rot('thigh_L', 30)
    p.rot('thigh_R', 36)
    p.rot('shin_L', 40)
    p.rot('shin_R', 35)
    return
  }
  const s = Math.sin(u.walk * 1.4)
  const amp = Math.min(1, Math.hypot(u.vel.x, u.vel.z) / Math.max(1, u.speed * 0.35))
  const weak = u.downed > 0 ? 14 * Math.sin(t * 14) : 0
  p.body(-0.05, 12)
  p.rot('wing_L', 0, 0, -25 + weak)
  p.rot('wing_R', 0, 0, 25 - weak)
  p.rot('thigh_L', -26 * s * amp - 8)
  p.rot('thigh_R', 26 * s * amp - 8)
  p.rot('shin_L', 25 + Math.max(0, 30 * Math.sin(u.walk * 1.4 + 1.2)) * amp)
  p.rot('shin_R', 25 + Math.max(0, 30 * Math.sin(u.walk * 1.4 + 1.2 + Math.PI)) * amp)
}

/** Raia: a ray that flies; the fins ripple, the whip tail sways, it noses down to dive. */
const poseRaia: PoseFn = (p, u, t) => {
  if (common(p, u, t, ['wing_L', 'wing_R', 'tail'])) return
  const flying = u.flyer && u.alt > 0.8
  p.rot('tail', 6 * Math.sin(t * 3 + u.id), 22 * Math.sin(t * 2.2 + u.id))
  if (u.state === 'windup') {
    const k = ease(u.t / (u.atk.windup * u.tempo))
    p.body(0.3 * k, -20 * k)
    p.rot('wing_L', 0, 0, 40 * k)
    p.rot('wing_R', 0, 0, -40 * k)
    p.rot('head', -25 * k)
    return
  }
  if (u.state === 'strike') {
    p.body(0, 50)
    p.rot('wing_L', 0, 0, -20)
    p.rot('wing_R', 0, 0, 20)
    p.rot('head', 20)
    return
  }
  const beat = flying ? Math.sin(t * 4.2 + u.id) : u.downed > 0 ? 0.3 * Math.sin(t * 12) : 0
  p.body(flying ? 0.2 * Math.sin(t * 4.2 + u.id + 1) : -0.5, flying ? 6 : 0, flying ? 10 * Math.sin(t * 1.2 + u.id) : 0)
  p.rot('wing_L', 0, 0, 30 * beat)
  p.rot('wing_R', 0, 0, -30 * beat)
  p.rot('head', 6 * Math.sin(t * 2 + u.id))
}

/** Buer: stands on two of its five legs; rolls on them like a wheel when it moves and when it charges. */
const poseBuer: PoseFn = (p, u, t) => {
  if (common(p, u, t, ['leg0', 'leg1', 'leg2', 'leg3', 'leg4'])) return
  const amp = Math.min(1, Math.hypot(u.vel.x, u.vel.z) / Math.max(1, u.speed * 0.4))
  if (u.state === 'windup') {
    const k = ease(u.t / (u.atk.windup * u.tempo))
    if (u.atk.strike === 'line') {
      // rocks back, then starts to turn
      p.rot('hub', -20 * k + 6 * Math.sin(t * 30) * k)
    } else {
      for (let i = 0; i < 5; i++) p.rot('leg' + i, -25 * k)
      p.body(0.25 * k)
    }
    return
  }
  if (u.state === 'strike') {
    if (u.atk.strike === 'line') p.rot('hub', (u.t * 1000) % 360)
    else for (let i = 0; i < 5; i++) p.rot('leg' + i, 30 * Math.sin(u.t * 30 + i * 1.3))
    return
  }
  if (u.state === 'stagger') {
    p.body(-0.1, 0, 10 * Math.sin(t * 3))
    p.rot('hub', 20 * Math.sin(t * 2.4))
    return
  }
  // a wheel of about 1 m turns one radian per metre; walk counts 2.2 per metre
  if (amp > 0.3) p.rot('hub', (u.walk * 26) % 360)
  else for (let i = 0; i < 5; i++) p.rot('leg' + i, 5 * Math.sin(t * 2 + i * 1.7))
}

/** Panotti: a biped whose great ears beat forward for the gust and sway as it walks. */
function eared(base: PoseFn): PoseFn {
  return (p, u, t) => {
    base(p, u, t)
    if (u.state === 'dead') return
    let flap = 6 * Math.sin(t * 1.6 + u.id)
    if (u.state === 'windup' && u.atk.ahead) flap = -60 * ease(u.t / (u.atk.windup * u.tempo))
    else if (u.state === 'strike' && u.atk.ahead) flap = 50
    p.rot('ear_L', flap * 0.4, 0, -flap)
    p.rot('ear_R', flap * 0.4, 0, flap)
  }
}

/** Tetrachiron: the second pair of arms follows the first a beat behind; the wings spread to gust. */
function fourArmed(base: PoseFn): PoseFn {
  return (p, u, t) => {
    base(p, u, t)
    if (u.state === 'dead') return
    let lift = 10 * Math.sin(t * 1.4 + u.id)
    let wing = 4 * Math.sin(t * 1.2)
    if (u.state === 'windup') {
      const k = ease(u.t / (u.atk.windup * u.tempo))
      lift = -140 * k
      wing = u.atk.ring && u.atk.ring > 3 ? 35 * k : 10 * k
    } else if (u.state === 'strike') {
      lift = 30
      wing = -20
    }
    p.rot('upperarm2_L', lift, 0, 10)
    p.rot('upperarm2_R', lift, 0, -10)
    p.rot('wing_L', 0, 0, wing)
    p.rot('wing_R', 0, 0, -wing)
  }
}

/** Asmodeus: the lion-dragon moves like the four-legged beasts; the rider raises the lance and drives it down. */
const poseAsmodeus: PoseFn = (p, u, t) => {
  poseBeast(p, u, t)
  if (u.state === 'dead') return
  p.rot('tail', 0, 25 * Math.sin(t * 1.3 + u.id))
  if (u.state === 'windup') {
    const k = ease(u.t / (u.atk.windup * u.tempo))
    p.rot('upperarm_R', -60 * k, 0, -20 * k)
    p.rot('torso', -12 * k)
  } else if (u.state === 'strike') {
    p.rot('upperarm_R', 30, 0, -10)
    p.rot('torso', 18)
  } else {
    p.rot('torso', 3 * Math.sin(t * 1.5 + u.id))
    p.rot('upperarm_L', 6 * Math.sin(t * 1.2), 0, 6)
  }
}

/**
 * A model in one piece (from an image-to-3D tool, not yet rigged): the body alone moves. It bobs as it
 * walks, rears back to wind up, lunges into the strike, reels when staggered, and falls when it dies.
 */
const poseWhole: PoseFn = (p, u, t) => {
  if (common(p, u, t, [])) return
  const amp = Math.min(1.2, Math.hypot(u.vel.x, u.vel.z) / Math.max(1, u.speed))
  if (u.state === 'windup') {
    const k = ease(u.t / (u.atk.windup * u.tempo))
    p.body(0.08 * k, -14 * k, 3 * Math.sin(t * 30) * k)
    return
  }
  if (u.state === 'strike') {
    const k = Math.min(1, u.t / (u.atk.lungeTime ?? 0.3))
    p.body(0.12 * Math.sin(Math.PI * k), 18 * Math.sin(Math.PI * k))
    return
  }
  if (u.state === 'stagger') {
    p.body(-0.05, 8, 9 * Math.sin(t * 3.2))
    return
  }
  const flying = u.flyer && u.alt > 0.8
  if (flying) {
    p.body(0.2 * Math.sin(t * 3 + u.id), 8, 8 * Math.sin(t * 1.3 + u.id))
    return
  }
  p.body(0.06 * Math.abs(Math.sin(u.walk * 1.4)) * amp, 4 * amp, 3 * Math.sin(u.walk * 0.7) * amp)
}

const POSES: Partial<Record<UnitKind, PoseFn>> = {
  satyr: poseImp,
  cornutus: poseImp,
  blemmye: biped({ heavy: 0.5, reach: 1, sway: 3 }),
  panotti: eared(biped({ heavy: 0.1, reach: 0.7, sway: 4 })),
  silvana: biped({ heavy: 0, reach: 0.9, sway: 9 }),
  leonis: serpentine(biped({ heavy: 0.3, reach: 1, sway: 4 }), 'tail'),
  triceps: biped({ heavy: 0.4, reach: 1, sway: 3 }),
  cracovia: serpentine(biped({ heavy: 0.6, reach: 1, sway: 3 }), 'tail'),
  tetrachiron: fourArmed(biped({ heavy: 0.5, reach: 1, sway: 3 })),
  marinus: poseMedusa,
  sirena: poseHarpy,
  cacodaemon: poseWinged,
  raia: poseRaia,
  buer: poseBuer,
  septiceps: fourArmed(serpentine(biped({ heavy: 1, reach: 1, sway: 2 }), 'tail')),
  asmodeus: poseAsmodeus,
  silenus: biped({ heavy: 0.6, reach: 0.8, sway: 4 }),
  hippocentaurus: poseCentaur,
  aquilon: poseWinged,
  duyung: poseMedusa,
  aries: biped({ heavy: 0.8, reach: 1, sway: 2 }),
  manticore: poseBeast,
  blackdragon: poseBeast,
  aziza: poseWinged,
  kitsune: poseBeast,
  sylph: poseMedusa,
  banshee: poseMedusa,
  griffin: poseBeast,
  hippogriff: poseBeast,
  pegasus: poseBeast,
  unicorn: poseBeast,
  dragon: poseBeast,
  cerberus: poseHound,
  lilith: serpentine(biped({ heavy: 0.2, reach: 0.8, sway: 6 }), 'serpent'),
  typhon: serpentine(biped({ heavy: 1, reach: 1, sway: 3 }), 'serpents'),
  samael: biped({ heavy: 0.3, reach: 1, sway: 4 }),
  atlas: biped({ heavy: 1, reach: 1, sway: 2 }),
  cyclops: biped({ heavy: 1, reach: 1, sway: 2 }),
  succubus: biped({ heavy: 0, reach: 0.6, sway: 8 }),
  incubus: biped({ heavy: 0.3, reach: 0.8, sway: 6 }),
  phoenix: posePhoenix,
  hydra: poseHydra,
  imp: poseImp,
  hellhound: poseHound,
  harpy: poseHarpy,
  centaur: poseCentaur,
  naga: poseNaga,
  minotaur: poseMinotaur,
  medusa: poseMedusa,
  chimera: poseChimera,
}

/**
 * One creature kind for one side, drawn part by part: every mesh primitive of the model is one
 * InstancedMesh, and each unit writes the posed matrix of every part. However many Imps fight, they
 * cost as many draws as one Imp has primitives.
 */
class Rig implements Poser {
  readonly parts: Part[] = []
  private readonly holder = new THREE.Group()
  private readonly named = new Map<string, THREE.Object3D>()
  private readonly rest = new Map<THREE.Object3D, THREE.Euler>()
  private cap: number
  private used = 0
  private readonly pose: PoseFn
  private readonly group: THREE.Group
  private readonly team: Team
  private readonly passive: boolean
  private readonly unitM = new THREE.Matrix4()
  private readonly m = new THREE.Matrix4()
  private readonly q = new THREE.Quaternion()
  private readonly p = new THREE.Vector3()
  private readonly s = new THREE.Vector3()

  constructor(model: THREE.Group, kind: UnitKind, team: Team, group: THREE.Group, cap: number, whole = false, variant?: Record<string, string>) {
    this.group = group
    this.team = team
    this.passive = !!UNITS[kind]?.passive
    this.cap = cap
    this.pose = whole ? poseWhole : (POSES[kind] ?? (() => {}))
    const scene = model.clone(true)
    this.holder.add(scene)
    const mats = new Map<THREE.Material, THREE.MeshStandardMaterial>()
    scene.traverse((o) => {
      if (o.name) this.named.set(o.name, o)
      this.rest.set(o, o.rotation.clone())
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const src = mesh.material as THREE.MeshStandardMaterial
      let mat = mats.get(src)
      if (!mat) {
        mat = team === 'shadow' ? shadowMaterial(src, mesh.geometry) : src.clone()
        const slot = variant && Object.keys(variant).find((k) => src.name.endsWith('.' + k))
        if (team === 'enemy' && slot) {
          mat.vertexColors = false
          mat.color.set(variant![slot])
          if (slot === 'body_veins') mat.emissive.set(0x000000)
          // the blazing Cerberus: its mouths glow
          if (slot === 'mouth' && kind === 'cerberus') {
            mat.emissive.set(variant![slot])
            mat.emissiveIntensity = 1.6
          }
        }
        patchGlow(mat)
        mats.set(src, mat)
      }
      this.parts.push(this.makePart(mesh, mat))
    })
  }

  private makePart(src: THREE.Mesh, mat: THREE.MeshStandardMaterial): Part {
    const geo = new THREE.BufferGeometry()
    const g = src.geometry
    if (g.index) geo.setIndex(g.index)
    for (const name of Object.keys(g.attributes)) geo.setAttribute(name, g.attributes[name])
    const glow = new THREE.InstancedBufferAttribute(new Float32Array(this.cap * 3), 3).setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('aGlow', glow)
    const mesh = new THREE.InstancedMesh(geo, mat, this.cap)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.frustumCulled = false
    // shadow soldiers cast no shadow of their own: it suits them, and it keeps the army out of the shadow pass
    // fauna casts none either: a few grazing beasts are not worth a shadow pass of their own
    mesh.castShadow = this.team === 'enemy' && !this.passive
    mesh.receiveShadow = this.team === 'enemy'
    mesh.count = 0
    mesh.visible = false
    this.group.add(mesh)
    const chain: string[] = []
    for (let o: THREE.Object3D | null = src; o && o !== this.holder; o = o.parent) if (o.name) chain.push(o.name)
    return { chain, src, geo, mat, mesh, glow }
  }

  /** Doubles the room for instances; the shared vertex data stays where it is. */
  private grow(need: number) {
    let cap = this.cap
    while (cap < need) cap *= 2
    this.cap = cap
    for (const part of this.parts) {
      this.group.remove(part.mesh)
      part.mesh.dispose()
      const fresh = this.makePart(part.src, part.mat)
      part.chain = fresh.chain
      part.geo = fresh.geo
      part.mesh = fresh.mesh
      part.glow = fresh.glow
    }
  }

  rot(name: string, x: number, y = 0, z = 0) {
    const o = this.named.get(name)
    if (!o) return
    const r = this.rest.get(o)!
    o.rotation.set(r.x + x * D, r.y + y * D, r.z + z * D)
  }

  body(lift: number, pitch = 0, roll = 0) {
    this.holder.position.y = lift
    this.holder.rotation.set(pitch * D, 0, roll * D)
  }

  private readonly hidden = new Set<string>()
  private readonly zero = new THREE.Matrix4().makeScale(0, 0, 0)
  private readonly hv = new THREE.Vector3()

  hide(name: string) {
    this.hidden.add(name)
  }

  begin() {
    this.used = 0
  }

  add(u: Unit, t: number, glow: THREE.Color | null, sink: number) {
    if (this.used >= this.cap) this.grow(this.used + 1)
    this.p.set(u.pos.x, u.pos.y - sink, u.pos.z)
    this.q.setFromAxisAngle(UP, u.yaw)
    this.s.setScalar(u.scale)
    this.unitM.compose(this.p, this.q, this.s)
    this.posed(u, t)
    // the Hydra: a few steering passes a frame bring each falling head down onto its circle
    if (u.parts) for (let pass = 0; pass < NECK_PASSES && this.steerNecks(u); pass++) this.posed(u, t)
    const i = this.used++
    const flash = u.flash > 0 ? (u.flash / 0.16) * 1.6 : 0
    const gr = (glow ? glow.r : 0) + flash
    const gg = (glow ? glow.g : 0) + flash * 0.85
    const gb = (glow ? glow.b : 0) + flash * 0.75
    const anyHidden = this.hidden.size > 0
    for (const part of this.parts) {
      if (anyHidden && part.chain.some((n) => this.hidden.has(n))) part.mesh.setMatrixAt(i, this.zero)
      else {
        this.m.multiplyMatrices(this.unitM, part.src.matrixWorld)
        part.mesh.setMatrixAt(i, this.m)
      }
      part.glow.setXYZ(i, gr, gg, gb)
    }
    // the Hydra's heads: where they were drawn is where they can be struck
    if (u.parts) {
      u.parts.forEach((h, k) => {
        const node = this.named.get('head' + k)
        if (!h || !node) return
        h.visual.copy(this.hv.setFromMatrixPosition(node.matrixWorld).applyMatrix4(this.unitM))
      })
    }
  }

  private posed(u: Unit, t: number) {
    for (const [o, r] of this.rest) o.rotation.copy(r)
    this.body(0)
    this.hidden.clear()
    this.pose(this, u, t)
    this.holder.updateMatrixWorld(true)
  }

  /**
   * Nudges the neck of every head on its way down: the lean at its root sets how far the head reaches,
   * the curl along it how low it comes. False once every such head lies on its circle.
   */
  private steerNecks(u: Unit): boolean {
    let steering = false
    u.parts!.forEach((h, k) => {
      if (!h || !h.alive || (h.state !== 'strike' && h.state !== 'recover' && h.state !== 'stagger')) return
      const node = this.named.get('head' + k)
      if (!node) return
      const at = this.hv.setFromMatrixPosition(node.matrixWorld).applyMatrix4(this.unitM)
      const reach = Math.hypot(at.x - u.pos.x, at.z - u.pos.z)
      const short = Math.hypot(h.aimAt.x - u.pos.x, h.aimAt.z - u.pos.z) - reach
      const high = at.y - (h.aimAt.y + HEAD_LIES)
      const off = Math.atan2(h.aimAt.x - u.pos.x, h.aimAt.z - u.pos.z) - Math.atan2(at.x - u.pos.x, at.z - u.pos.z)
      const turn = Math.atan2(Math.sin(off), Math.cos(off))
      if (Math.abs(short) + Math.abs(high) + Math.abs(turn) * reach < 0.25) return
      h.neckLean = clamp(h.neckLean + clamp(short * 1.4, -6, 6), -40, 80)
      h.neckCurl = clamp(h.neckCurl + clamp(high * 0.6, -3, 3), -8, 36)
      h.neckYaw = clamp(h.neckYaw + clamp((turn / D) * 0.9, -8, 8), -90, 90)
      steering = true
    })
    return steering
  }

  end() {
    for (const part of this.parts) {
      part.mesh.count = this.used
      part.mesh.visible = this.used > 0
      if (this.used) {
        part.mesh.instanceMatrix.needsUpdate = true
        part.glow.needsUpdate = true
      }
    }
  }

  /** The standing model, posed at rest, for the crowd. */
  standing(): THREE.Group {
    for (const [o, r] of this.rest) o.rotation.copy(r)
    this.body(0)
    this.holder.updateMatrixWorld(true)
    return this.holder
  }
}

/** An animated GLB: the model and its clips by role (idle, walk, attack, hit, die; missing ones fall back to idle). */
export interface SkinSource {
  scene: THREE.Group
  clips: Partial<Record<SkinRole, THREE.AnimationClip>>
}

type SkinRole = 'idle' | 'walk' | 'attack' | 'hit' | 'die'

interface SkinCopy {
  root: THREE.Group
  mixer: THREE.AnimationMixer
  mats: THREE.MeshStandardMaterial[]
  emissive: THREE.Color[]
  role: SkinRole | ''
  frame: number
}

/** Which clip a unit's state plays. */
function skinRole(u: Unit): SkinRole {
  if (u.state === 'dead' || u.state === 'ashes') return 'die'
  if (u.state === 'windup' || u.state === 'strike' || u.state === 'recover') return 'attack'
  if (u.state === 'stagger' || u.state === 'held' || u.state === 'thrown' || u.lifted > 0) return 'hit'
  return Math.hypot(u.vel.x, u.vel.z) > 0.4 ? 'walk' : 'idle'
}

interface CrowdBatch {
  parts: { geometry: THREE.BufferGeometry; material: THREE.Material; mesh: THREE.InstancedMesh }[]
  cap: number
  used: number
}

/** How long a shadow takes to climb out of its pool, and to sink back in. */
export const RISE_TIME = 1.0
export const SINK_TIME = 0.8

/**
 * Draws every creature: enemies and the nearest shadows with animated part rigs, the rest of the army
 * as one standing model per kind and material (the v1 crowd), placed by position, facing and a step bob.
 */
export class Rigs {
  readonly group = new THREE.Group()
  private readonly models: Partial<Record<UnitKind, THREE.Group>>
  /** Decimated versions (about a fifth of the triangles) for the far crowd. */
  private readonly lods: Partial<Record<UnitKind, THREE.Group>>
  private readonly rigs = new Map<string, Rig>()
  private readonly crowd = new Map<UnitKind, CrowdBatch>()
  /** Shadows drawn in full detail; the rest join the crowd. */
  detail = 20
  private readonly ember = new THREE.Color()
  private sortIn = 0
  private readonly m = new THREE.Matrix4()
  private readonly q = new THREE.Quaternion()
  private readonly p = new THREE.Vector3()
  private readonly s = new THREE.Vector3()

  constructor(models: Partial<Record<UnitKind, THREE.Group>>, lods: Partial<Record<UnitKind, THREE.Group>> = {}) {
    this.group.name = 'units'
    this.models = models
    this.lods = lods
  }

  private rig(kind: UnitKind, team: Team): Rig | null {
    const key = kind + team
    let r = this.rigs.get(key)
    if (!r) {
      const model = this.models[kind]
      if (!model) return null
      r = new Rig(model, kind, team, this.group, team === 'enemy' ? 32 : 64)
      this.rigs.set(key, r)
    }
    return r
  }

  /** Builds the rigs and crowd batches now, so the first fight does not stall on shader compiles. */
  prepare(kinds: UnitKind[]) {
    for (const k of kinds) {
      this.rig(k, 'enemy')
      this.rig(k, 'shadow')
      this.batch(k, 1)
    }
  }

  private batch(kind: UnitKind, need: number): CrowdBatch | null {
    let b = this.crowd.get(kind)
    if (!b) {
      const rig = this.rig(kind, 'shadow')
      if (!rig) return null
      // the decimated model when there is one, else the full one standing at rest
      const lod = this.lods[kind]
      const baked = bakeByMaterial(lod ? lod.clone(true) : rig.standing())
      b = { parts: [], cap: 0, used: 0 }
      for (const piece of baked) {
        // plain shadow materials: the crowd has no per-instance glow
        const mat = shadowMaterial(piece.material as THREE.MeshStandardMaterial, piece.geometry)
        b.parts.push({ geometry: piece.geometry, material: mat, mesh: new THREE.InstancedMesh(piece.geometry, mat, 1) })
      }
      this.crowd.set(kind, b)
    }
    if (need > b.cap) {
      let cap = Math.max(64, b.cap)
      while (cap < need) cap *= 2
      for (const part of b.parts) {
        this.group.remove(part.mesh)
        part.mesh.dispose()
        part.mesh = new THREE.InstancedMesh(part.geometry, part.material, cap)
        part.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
        part.mesh.frustumCulled = false
        part.mesh.castShadow = false
        part.mesh.count = 0
        this.group.add(part.mesh)
      }
      b.cap = cap
    }
    return b
  }

  /** How far below its feet a unit is drawn while it rises out of a pool, sinks in, or turns to ash. */
  private sink(u: Unit): number {
    if (u.state === 'rising') {
      const k = Math.min(1, u.t / RISE_TIME)
      return (1 - k) * (1 - k) * u.height * 1.1
    }
    if (u.state === 'sinking') {
      const k = Math.min(1, u.t / SINK_TIME)
      return k * k * u.height * 1.1
    }
    if (u.state === 'diving') return Math.min(1, u.t / 0.4) * u.height * 1.2
    if (u.state === 'ashes') return u.height * 0.75
    if (u.ash) return Math.min(1, (u.deadT - u.ashAt) / 2) * 0.7
    return 0
  }

  update(units: Unit[], t: number, dt: number, cam: THREE.Vector3, glowOf: (u: Unit) => THREE.Color | null) {
    // pick the shadows nearest the camera for full detail, a few times a second
    this.sortIn -= dt
    if (this.sortIn <= 0) {
      this.sortIn = 0.2
      const shadows = units.filter((u) => u.team === 'shadow')
      if (shadows.length <= this.detail) for (const u of shadows) u.detailed = true
      else {
        const d = new Map<Unit, number>()
        for (const u of shadows) d.set(u, u.pos.distanceToSquared(cam))
        shadows.sort((a, b) => d.get(a)! - d.get(b)!)
        shadows.forEach((u, i) => (u.detailed = i < this.detail))
      }
    }
    for (const r of this.rigs.values()) r.begin()
    const counts = new Map<UnitKind, number>()
    for (const u of units) {
      if (u.team === 'shadow' && !u.detailed && u.state !== 'dead') {
        counts.set(u.kind, (counts.get(u.kind) ?? 0) + 1)
        continue
      }
      const glow = u.state === 'ashes' ? this.ember.setRGB(1.6, 0.5, 0.1).multiplyScalar(0.6 + 0.4 * Math.sin(t * 6 + u.id)) : glowOf(u)
      this.rig(u.kind, u.team)?.add(u, t, glow, this.sink(u))
    }
    for (const r of this.rigs.values()) r.end()

    for (const b of this.crowd.values()) b.used = 0
    for (const [kind, n] of counts) this.batch(kind, n)
    for (const u of units) {
      if (u.team !== 'shadow' || u.detailed || u.state === 'dead') continue
      const b = this.crowd.get(u.kind)
      if (!b) continue
      this.p.set(u.pos.x, u.pos.y - this.sink(u), u.pos.z)
      // a small step bob while it moves, so a marching crowd does not look frozen
      const pace = Math.min(1, Math.hypot(u.vel.x, u.vel.z) / Math.max(1, u.speed))
      this.p.y += Math.abs(Math.sin(t * 9 + u.id)) * 0.06 * pace
      this.q.setFromAxisAngle(UP, u.yaw)
      this.s.setScalar(u.scale)
      this.m.compose(this.p, this.q, this.s)
      const i = b.used++
      for (const part of b.parts) part.mesh.setMatrixAt(i, this.m)
    }
    for (const b of this.crowd.values()) {
      for (const part of b.parts) {
        part.mesh.count = b.used
        part.mesh.visible = b.used > 0
        if (b.used) part.mesh.instanceMatrix.needsUpdate = true
      }
    }
  }
}
