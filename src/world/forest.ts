import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CYL, Obstacles, SPHERE } from '../engine/obstacles'
import { heightMap, inClearing, lakeDist, LAKE, pathDist, smooth, ZONES, zoneWeights } from './map'

/**
 * The forest, scattered like the previz (pv_world.py build_forest): a jittered 4 m grid, each spot
 * taking its zone's tree mix and density. All trees and rocks are one BatchedMesh, so the whole
 * forest is one draw call and every tree is frustum-culled on its own.
 */
type Kind = 'pine' | 'pine_tall' | 'pine_warm' | 'birch' | 'swamp' | 'dead' | 'burnt' | 'rock' | 'rock_big'

/** Shape of each kind at scale 1, for the colliders: trunk radius and height, crown base, radius and top. */
const SHAPE: Record<Kind, { trunk: number; h: number; crown: [number, number, number] | null }> = {
  pine: { trunk: 0.3, h: 13, crown: [3.6, 2.4, 13.5] },
  pine_tall: { trunk: 0.32, h: 20, crown: [5.6, 2.6, 20.5] },
  pine_warm: { trunk: 0.3, h: 11, crown: [3.1, 2.7, 11.5] },
  birch: { trunk: 0.2, h: 11, crown: [6.4, 2.2, 11.5] },
  swamp: { trunk: 0.45, h: 9, crown: [6.2, 2.8, 10.6] },
  dead: { trunk: 0.35, h: 8, crown: null },
  burnt: { trunk: 0.35, h: 8, crown: null },
  rock: { trunk: 1.2, h: 0, crown: null },
  rock_big: { trunk: 4.2, h: 0, crown: null },
}

const MIX: Record<string, [Partial<Record<Kind, number>>, number]> = {
  pembuka: [{ pine: 0.45, pine_tall: 0.2, birch: 0.35 }, 2.4],
  tebing: [{ pine_warm: 0.7, pine: 0.3 }, 0.32],
  rawa: [{ swamp: 0.55, dead: 0.3, pine: 0.15 }, 0.95],
  kuil: [{ pine: 0.5, pine_tall: 0.35, birch: 0.15 }, 1.3],
  bara: [{ burnt: 0.85, dead: 0.15 }, 0.85],
}

// ------------------------------------------------------------ geometry

const C = (h: string) => new THREE.Color(h)
const PAL = {
  bark: C('#2a211c'), needle: C('#1a2d22'), needle2: C('#2a3524'), birch: C('#cfcac0'), leaf: C('#56703a'),
  moss: C('#3a4a2c'), swampwood: C('#26241d'), dead: C('#4a4540'), burnt: C('#1a1310'), rock: C('#55524e'), rock2: C('#6e6252'),
}

/** Non-indexed, flat-shaded, vertex-coloured; every part of the BatchedMesh must share this layout. */
function part(geo: THREE.BufferGeometry, color: THREE.Color, m?: THREE.Matrix4): THREE.BufferGeometry {
  let g = geo.index ? geo.toNonIndexed() : geo
  if (m) g.applyMatrix4(m)
  g.deleteAttribute('uv')
  g.computeVertexNormals()
  const n = g.attributes.position.count
  const col = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) col.set([color.r, color.g, color.b], i * 3)
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}

const M = new THREE.Matrix4()
const at = (x: number, y: number, z: number, rx = 0, rz = 0) =>
  M.clone().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), new THREE.Vector3(1, 1, 1))

function pine(h: number, tiers: number, rad: number, needle: THREE.Color): THREE.BufferGeometry {
  const parts = [part(new THREE.CylinderGeometry(0.06, 0.3, h, 6, 1, true), PAL.bark, at(0, h / 2, 0))]
  for (let i = 0; i < tiers; i++) {
    const z0 = h * 0.28 + i * ((h * 0.66) / tiers)
    const r = rad * (1 - i / (tiers + 0.6))
    const ch = h * 0.3
    parts.push(part(new THREE.ConeGeometry(r, ch, 8, 1), needle, at(0.1 * Math.sin(i * 2.1), z0 + ch / 2, 0.1 * Math.cos(i * 1.7))))
  }
  return mergeGeometries(parts)
}

function birch(): THREE.BufferGeometry {
  const parts = [part(new THREE.CylinderGeometry(0.07, 0.2, 11, 6, 1, true), PAL.birch, at(0.1, 5.5, 0.05))]
  for (const [x, y, z, r] of [[0, 9.3, 0, 2.0], [1.2, 8.0, 0.4, 1.5], [-1.0, 8.4, 0.8, 1.6], [0.3, 7.6, -1.1, 1.4], [0.2, 10.8, 0.2, 1.3]]) {
    const g = new THREE.IcosahedronGeometry(r, 0)
    g.scale(1, 0.85, 1)
    parts.push(part(g, PAL.leaf, at(x, y, z)))
  }
  return mergeGeometries(parts)
}

function swampTree(): THREE.BufferGeometry {
  const parts = [part(new THREE.CylinderGeometry(0.15, 0.45, 8, 6, 1, true), PAL.swampwood, at(0, 5, 0, 0.05, 0.04))]
  for (let k = 0; k < 6; k++) {
    const a = (2 * Math.PI * k) / 6 + 0.4
    const root = new THREE.CylinderGeometry(0.08, 0.2, 3.4, 5, 1, true)
    const m = new THREE.Matrix4().makeRotationY(-a).multiply(new THREE.Matrix4().makeTranslation(1.4, 1.1, 0)).multiply(new THREE.Matrix4().makeRotationZ(0.9))
    parts.push(part(root, PAL.swampwood, m))
  }
  for (const [x, y, z, r] of [[0.3, 9.0, 0.2, 2.6], [1.6, 7.6, 0.5, 1.8], [-1.4, 7.9, 0.7, 1.9]]) {
    const g = new THREE.IcosahedronGeometry(r, 0)
    g.scale(1, 0.6, 1)
    parts.push(part(g, PAL.moss, at(x, y, z)))
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1
      parts.push(part(new THREE.ConeGeometry(0.12, 2.4, 4), PAL.moss, at(x + Math.cos(a) * r * 0.7, y - r * 0.3 - 1.2, z + Math.sin(a) * r * 0.7, Math.PI)))
    }
  }
  return mergeGeometries(parts)
}

function snag(color: THREE.Color): THREE.BufferGeometry {
  const parts = [part(new THREE.CylinderGeometry(0.05, 0.35, 8, 6, 1, true), color, at(0, 4, 0, 0.03, 0.02))]
  for (const [a, y, l] of [[0.4, 3.6, 2.4], [2.6, 4.8, 2.0], [4.4, 5.8, 1.7], [1.5, 6.6, 1.2]]) {
    const m = new THREE.Matrix4().makeRotationY(-a).multiply(new THREE.Matrix4().makeTranslation(l * 0.45, y + 0.5, 0)).multiply(new THREE.Matrix4().makeRotationZ(-1.0))
    parts.push(part(new THREE.CylinderGeometry(0.02, 0.09, l, 4, 1, true), color, m))
  }
  return mergeGeometries(parts)
}

function rock(seed: number, r: [number, number, number], color: THREE.Color): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 0)
  const p = g.attributes.position
  let s = seed
  for (let i = 0; i < p.count; i++) {
    s = (s * 16807) % 2147483647
    const k = 0.8 + 0.35 * (s / 2147483647)
    p.setXYZ(i, p.getX(i) * r[0] * k, p.getY(i) * r[2] * k + r[2] * 0.35, p.getZ(i) * r[1] * k)
  }
  return part(g, color)
}

function geometries(): Record<Kind, THREE.BufferGeometry> {
  return {
    pine: pine(13, 6, 3.0, PAL.needle),
    pine_tall: pine(20, 8, 3.2, PAL.needle),
    pine_warm: pine(11, 5, 3.4, PAL.needle2),
    birch: birch(),
    swamp: swampTree(),
    dead: snag(PAL.dead),
    burnt: snag(PAL.burnt),
    rock: rock(1, [1.4, 1.1, 0.9], PAL.rock),
    rock_big: rock(2, [4.5, 3.6, 5.0], PAL.rock2),
  }
}

// ------------------------------------------------------------ scatter

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
