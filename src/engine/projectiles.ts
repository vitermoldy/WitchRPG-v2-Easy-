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
    mesh.position.copy(from)
    this.group.add(mesh)
    this.shots.push({ pos: from.clone(), prev: from.clone(), vel, gravity: spec.gravity, radius: spec.radius, source: u, atk, aim, life: 4, mesh, reflected: false })
    this.g.sfx.bolt()
  }

  update(dt: number) {
    const g = this.g
    const p = g.player
    for (let i = this.shots.length - 1; i >= 0; i--) {
      // a blow that fells her clears every shot (her fall) while this loop still runs
      const s = this.shots[i]
      if (!s) continue
      s.prev.copy(s.pos)
      if (!s.reflected) s.vel.y -= s.gravity * dt
      s.pos.addScaledVector(s.vel, dt)
      s.life -= dt
      s.mesh.position.copy(s.pos)
      if (s.atk.strike === 'line') s.mesh.lookAt(this.c.copy(s.pos).add(s.vel))
      if (Math.random() < 0.6) g.glow.emit({ pos: s.pos, count: 1, color: s.reflected ? COLOR.chaos : COLOR.rift, intensity: 2.2, life: 0.3, size: s.radius * 1.2 + 0.06, sizeEnd: 0.02, speed: 0.3 })

      // Reality Warp turns it back on the creature that shot it
      if (!s.reflected && g.spells.inWarp(s.pos)) {
        s.reflected = true
        s.mesh.material = red
        const speed = Math.max(16, s.vel.length())
        s.vel.copy(s.source.center().sub(s.pos).normalize().multiplyScalar(speed))
        s.life = 3
        g.clearTelegraph(s.source)
        g.glow.emit({ pos: s.pos, count: 14, color: COLOR.chaosHot, intensity: 3, life: 0.4, size: 0.2, speed: 3 })
        continue
      }
      if (s.reflected) {
        if (s.source.targetable && s.source.center(this.c).distanceTo(s.pos) < s.source.radius + 0.6) {
          g.hurtUnit(s.source, s.source.damage * (s.atk.damage ?? 1) * SPELL.warp.reflectDamage, s.pos, 12, 2, 'player', 'impact')
          this.end(i, true)
        } else if (s.life <= 0) this.end(i, false)
        continue
      }

      if (s.atk.strike === 'line') {
        // an arrow: her capsule, then shadows, then trees and the ground
        let hit = false
        if (p.alive) {
          const y = Math.min(Math.max(s.pos.y, p.pos.y + 0.2), p.pos.y + 1.7)
          if (Math.hypot(s.pos.x - p.pos.x, s.pos.y - y, s.pos.z - p.pos.z) < s.radius + 0.45) {
            g.strikePlayer(s.source, s.atk)
            hit = true
          }
        }
        if (!hit) {
          for (const u of g.units.units) {
            if (u.team !== 'shadow' || !u.targetable) continue
            if (u.center(this.c).distanceTo(s.pos) < s.radius + Math.max(u.radius, u.height * 0.42)) {
              g.strikeUnit(s.source, u, s.atk)
              hit = true
              break
            }
          }
        }
        const len = this.seg.copy(s.pos).sub(s.prev).length()
        const wall = len > 1e-5 ? g.obstacles.sweep(s.prev.x, s.prev.y, s.prev.z, s.pos.x, s.pos.y, s.pos.z, 0.02) : 1
        if (hit || wall < 1 || s.pos.y < g.height(s.pos.x, s.pos.z) || s.life <= 0) this.end(i, true)
        continue
      }

      // a glob: it bursts on its circle and hurts whoever stands inside
      if (s.pos.y <= g.height(s.pos.x, s.pos.z) || (s.vel.y < 0 && s.pos.y <= s.aim.y) || s.life <= 0) {
        const r = ringOf(s.atk)
        // a glob bursts on the ground: high in the air she is out of it
        const low = p.pos.y - g.height(p.pos.x, p.pos.z) < 2.5
        if (p.alive && low && Math.hypot(p.pos.x - s.aim.x, p.pos.z - s.aim.z) < r + 0.4) g.strikePlayer(s.source, s.atk)
        for (const u of g.units.units) {
          if (u.team !== 'shadow' || !u.targetable) continue
          if (Math.hypot(u.pos.x - s.aim.x, u.pos.z - s.aim.z) < r + u.radius) g.strikeUnit(s.source, u, s.atk)
        }
        g.smoke.emit({ pos: s.aim, count: 8, color: 0x3a3a20, life: 0.9, size: 0.7, sizeEnd: 1.5, speed: 1.4, alpha: 0.55 })
        this.end(i, true)
      }
    }
  }

  private end(i: number, burst: boolean) {
    const s = this.shots[i]
    if (!s) return
    if (burst) this.g.glow.emit({ pos: s.pos, count: 16, color: s.reflected ? COLOR.chaosHot : COLOR.rift, intensity: 2.4, life: 0.4, size: 0.2, sizeEnd: 0.03, speed: 3, gravity: 6 })
    if (!s.reflected) this.g.clearTelegraph(s.source)
    this.group.remove(s.mesh)
    this.shots.splice(i, 1)
  }
}
