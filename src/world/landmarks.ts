import * as THREE from 'three'
import { CYL, SPHERE, type Obstacles } from '../engine/obstacles'
import { heightMap, LANDMARKS, toWorld, type Landmark } from './map'

/**
 * The places without monsters in the south (owner, 28 Nov 2026): a ruined tower, a pond ringed with
 * flowers, a circle of standing stones on a knoll, a grove of giant glowing mushrooms. Simple shapes,
 * one InstancedMesh per material for all four, with colliders for what she should not walk through.
 */
export class Landmarks {
  readonly group = new THREE.Group()

  constructor(obstacles: Obstacles) {
    this.group.name = 'landmarks'
    const stone: THREE.Matrix4[] = []
    const moss: THREE.Matrix4[] = []
    const petals: { m: THREE.Matrix4; c: THREE.Color }[] = []
    const stems: THREE.Matrix4[] = []
    const caps: { m: THREE.Matrix4; c: THREE.Color }[] = []
    let seed = 7
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 4294967296
    }
    const m4 = (x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0, rx = 0) =>
      new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0)), new THREE.Vector3(sx, sy, sz))
    const at = (l: Landmark, a: number, r: number) => {
      const mx = l.c[0] + Math.cos(a) * r
      const my = l.c[1] + Math.sin(a) * r
      const [x, z] = toWorld(mx, my)
      return { x, z, y: heightMap(mx, my) }
    }
    for (const l of LANDMARKS) {
      if (l.kind === 'tower') {
        // a broken round tower: rings of blocks that thin out as they climb, and rubble around
        const R = 7
        for (let ring = 0; ring < 9; ring++) {
          const n = 14
          for (let k = 0; k < n; k++) {
            if (ring > 2 && rnd() < ring / 11) continue
            const a = (k / n) * Math.PI * 2 + ring * 0.11
            const p = at(l, a, R)
            const b = m4(p.x, p.y + 0.6 + ring * 1.2, p.z, 3.1, 1.2, 1.4, -a)
            stone.push(b)
          }
        }
        obstacles.add({ kind: CYL, ...pos(at(l, 0, 0)), r: R + 1, h: 4, camOnly: false })
        for (let k = 0; k < 40; k++) {
          const p = at(l, rnd() * Math.PI * 2, 10 + rnd() * 18)
          const s = 0.5 + rnd() * 1.1
          stone.push(m4(p.x, p.y + s * 0.3, p.z, s * 1.4, s, s, rnd() * 3, rnd()))
          if (rnd() < 0.5) moss.push(m4(p.x, p.y + s * 0.55, p.z, s * 1.2, s * 0.25, s * 0.9, rnd() * 3))
        }
      } else if (l.kind === 'stones') {
        // a ring of tall standing stones, two of them leaning, a flat altar stone in the middle
        const n = 11
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2
          const p = at(l, a, 16)
          const lean = k % 5 === 2 ? 0.3 : 0
          stone.push(m4(p.x, p.y + 2.6, p.z, 1.6, 5.4, 1.1, -a, lean))
          obstacles.add({ kind: CYL, x: p.x, y: p.y - 1, z: p.z, r: 1.2, h: 7, camOnly: false })
          if (k % 3 === 0) stone.push(m4(p.x, p.y + 5.6, p.z, 2.6, 0.7, 1.2, -a + 0.3))
        }
        const c = at(l, 0, 0)
        stone.push(m4(c.x, c.y + 0.5, c.z, 3.2, 0.8, 2.0))
      } else if (l.kind === 'mere') {
        // flowers all round the pond, in four colours
        const colours = ['#f2c8e0', '#ffd860', '#c8a8ff', '#ffffff'].map((h) => new THREE.Color(h))
        for (let k = 0; k < 900; k++) {
          const a = rnd() * Math.PI * 2
          const p = at(l, a, l.r * (0.8 + rnd() * 0.6))
          if (p.y < 0.2) continue
          const s = 0.25 + rnd() * 0.25
          petals.push({ m: m4(p.x, p.y + 0.25, p.z, s, s * 0.6, s, rnd() * 3), c: colours[Math.floor(rnd() * colours.length)] })
        }
      } else {
        // giant mushrooms that glow faintly from under their caps
        const colours = ['#7ae8d8', '#c88aff', '#ffb070'].map((h) => new THREE.Color(h))
        for (let k = 0; k < 34; k++) {
          const p = at(l, rnd() * Math.PI * 2, rnd() * l.r * 0.85)
          const H = 3 + rnd() * 6
          const w = 0.35 + H * 0.06
          stems.push(m4(p.x, p.y + H / 2, p.z, w, H, w))
          caps.push({ m: m4(p.x, p.y + H, p.z, H * 0.45, H * 0.22, H * 0.45, rnd() * 3), c: colours[k % colours.length] })
          obstacles.add({ kind: CYL, x: p.x, y: p.y - 1, z: p.z, r: w * 0.6, h: H + 1, camOnly: false })
          obstacles.add({ kind: SPHERE, x: p.x, y: p.y + H, z: p.z, r: H * 0.4, h: 0, camOnly: true })
