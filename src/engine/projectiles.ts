import * as THREE from 'three'
import { SPELL, type AttackSpec } from '../game/balance'
import type { Game } from './game'
import { COLOR } from './palette'
import { ringOf, type Unit } from './units'

interface Shot {
  pos: THREE.Vector3
  prev: THREE.Vector3
  vel: THREE.Vector3
  gravity: number
  radius: number
  source: Unit
  atk: AttackSpec
  /** Where a glob lands (the centre of its amber circle). */
  aim: THREE.Vector3
  life: number
  mesh: THREE.Mesh
  /** Turned back by Reality Warp: it now flies at the creature that shot it. */
  reflected: boolean
}

const globGeo = new THREE.IcosahedronGeometry(1, 1)
const arrowGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.1, 5)
arrowGeo.rotateX(Math.PI / 2)
const amber = new THREE.MeshBasicMaterial({ color: new THREE.Color(COLOR.rift).multiplyScalar(2.6) })
const red = new THREE.MeshBasicMaterial({ color: new THREE.Color(COLOR.chaos).multiplyScalar(3) })

/**
 * Creature projectiles: Centaur arrows fly along the flashing line (only a roll avoids them), Naga globs
 * arc onto the amber circle (block or parry them, or step out). Shadows in the way are hit as well.
 * Inside a Reality Warp field they turn back on whoever shot them, as in v1.
 */
export class Projectiles {
  readonly group = new THREE.Group()
  private readonly shots: Shot[] = []
  private readonly g: Game
  private readonly seg = new THREE.Vector3()
  private readonly c = new THREE.Vector3()

  constructor(g: Game) {
    this.g = g
    this.group.name = 'shots'
  }

  get count() {
    return this.shots.length
  }

  clear() {
    for (const s of this.shots) this.group.remove(s.mesh)
    this.shots.length = 0
  }

  fire(u: Unit, atk: AttackSpec) {
    const spec = atk.shot
    if (!spec) return
    const from = u.center().addScaledVector(u.lungeDir, u.radius * 0.8)
    from.y = u.pos.y + u.height * 0.72
    let vel: THREE.Vector3
    const aim = u.aimAt.clone()
    if (atk.strike === 'ring') {
      aim.y = this.g.height(aim.x, aim.z)
      const flat = Math.hypot(aim.x - from.x, aim.z - from.z)
      const t = Math.max(0.3, flat / spec.speed)
      vel = new THREE.Vector3((aim.x - from.x) / t, (aim.y - from.y) / t + 0.5 * spec.gravity * t, (aim.z - from.z) / t)
    } else {
      // along the telegraphed line, aimed at her chest where she stood when it drew
      const to = new THREE.Vector3(u.aimAt.x, u.aimAt.y + 1.1, u.aimAt.z)
      const flat = Math.hypot(to.x - from.x, to.z - from.z)
      const t = Math.max(0.1, flat / spec.speed)
      vel = new THREE.Vector3(u.lungeDir.x * spec.speed, (to.y - from.y) / t + 0.5 * spec.gravity * t, u.lungeDir.z * spec.speed)
    }
    const mesh = new THREE.Mesh(atk.strike === 'ring' ? globGeo : arrowGeo, amber)
    if (atk.strike === 'ring') mesh.scale.setScalar(spec.radius)
