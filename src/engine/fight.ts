import * as THREE from 'three'
import { COMBAT, type Swing } from '../game/balance'
import { yawTo } from './camera'
import { Combo, inSwing, type ComboEvent, type SwingState } from './combat'
import type { Game } from './game'
import type { IlyraPose } from './models'
import { COLOR } from './palette'
import type { Unit } from './units'

export interface FightInput {
  attackPressed: boolean
  attackHeld: boolean
  blockHeld: boolean
  blockPressed: boolean
  execute: boolean
  throwStaff: boolean
  /** Steering this frame in world space (for which way a swing goes), zero when none is held. */
  dirX: number
  dirZ: number
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
const Y = new THREE.Vector3(0, 1, 0)

/** Throw time of the staff: when in the throw it leaves her hand, and how long the throw plays. */
const THROW_TIME = 0.36
const THROW_RELEASE = 0.15
const CATCH_TIME = 0.25

/**
 * The staff thrown with H: it flies straight at the aim point, sticks in whatever it meets, and comes
 * back on the second H, hitting every creature on its way home.
 */
class Staff {
  state: 'hand' | 'flying' | 'stuck' | 'returning' = 'hand'
  readonly pos = new THREE.Vector3()
  readonly prev = new THREE.Vector3()
  readonly vel = new THREE.Vector3()
  private readonly g: Game
  private obj: THREE.Object3D | null = null
  private travelled = 0
  private t = 0
  private spin = 0
  private readonly hit = new Set<Unit>()
  private readonly dir = new THREE.Vector3()
  private readonly tmp = new THREE.Vector3()
  private readonly q = new THREE.Quaternion()
  private readonly q2 = new THREE.Quaternion()
  private readonly ray = new THREE.Ray()
  private readonly sphere = new THREE.Sphere()

  constructor(g: Game) {
    this.g = g
  }

  private ensure() {
    if (this.obj) return this.obj
    this.obj = this.g.ilyra.staffCopy() ?? new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.7), new THREE.MeshStandardMaterial({ color: 0x2a1a14 }))
    this.obj.visible = false
    this.g.scene.add(this.obj)
    return this.obj
  }

  launch(from: THREE.Vector3, to: THREE.Vector3) {
    this.ensure().visible = true
    this.state = 'flying'
    this.pos.copy(from)
    this.prev.copy(from)
    this.vel.subVectors(to, from).normalize().multiplyScalar(COMBAT.staff.throwSpeed)
    this.travelled = 0
