import * as THREE from 'three'
import { HYDRA, SPELL } from '../game/balance'
import { impactDamage } from '../game/progression'
import type { Game } from './game'
import { COLOR } from './palette'

export interface Prop {
  readonly pos: THREE.Vector3
  readonly vel: THREE.Vector3
  readonly mass: number
  readonly radius: number
  held: boolean
  /** Thrown by Telekinesis: it hurts the first creature it meets. */
  thrown: boolean
  flight: number
  spin: number
}

const CAP = 16

/**
 * Boulders she can lift with Telekinesis and throw (the Hydra's islands keep a few). A thrown boulder
 * hurts the first creature it meets by its weight and speed, as a thrown body does, and counts as a
 * thrown thing (it goes through the Minotaur's shield and does 150% to the Hydra's slimy skin).
 */
export class Props {
  readonly list: Prop[] = []
  readonly mesh: THREE.InstancedMesh
  private readonly g: Game
  private readonly m = new THREE.Matrix4()
  private readonly q = new THREE.Quaternion()
  private readonly e = new THREE.Euler()
  private readonly s = new THREE.Vector3()
  private readonly c = new THREE.Vector3()

  constructor(g: Game) {
    this.g = g
    const geo = new THREE.DodecahedronGeometry(1, 0)
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x5a5450, roughness: 0.95, flatShading: true }), CAP)
    this.mesh.castShadow = true
    this.mesh.frustumCulled = false
    this.mesh.count = 0
  }

  add(x: number, z: number, radius = 0.75): Prop | null {
    if (this.list.length >= CAP) return null
    const p: Prop = { pos: new THREE.Vector3(x, this.g.height(x, z) + radius, z), vel: new THREE.Vector3(), mass: HYDRA.rockMass, radius, held: false, thrown: false, flight: 0, spin: Math.random() * 6 }
    this.list.push(p)
    return p
  }

  clear() {
    this.list.length = 0
    this.mesh.count = 0
  }

  /** The boulder closest to the middle of the view, within reach and a narrow cone. */
  pick(from: THREE.Vector3, dir: THREE.Vector3, range: number, cone: number): Prop | null {
    let best: Prop | null = null
    let ba = cone
    for (const p of this.list) {
      if (p.held) continue
      const to = this.c.subVectors(p.pos, from)
      if (to.length() > range) continue
      const a = dir.angleTo(to)
      if (a < ba) {
