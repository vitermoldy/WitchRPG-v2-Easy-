import * as THREE from 'three'
import { CHAOS, SPELL } from '../game/balance'
import { hasUpgrade, impactDamage, isUnlocked } from '../game/progression'
import { skillById, type SkillId } from '../game/skills'
import type { Game } from './game'
import { COLOR } from './palette'
import type { Prop } from './props'
import type { Unit } from './units'

interface Bolt {
  pos: THREE.Vector3
  prev: THREE.Vector3
  vel: THREE.Vector3
  life: number
  damage: number
  mesh: THREE.Mesh
  light: THREE.PointLight | null
}

interface Field {
  pos: THREE.Vector3
  radius: number
  t: number
  duration: number
  group: THREE.Object3D
  mats: THREE.ShaderMaterial[]
}

export interface SpellInput {
  /** Left button this frame, and whether she is aiming (right button held). */
  pressed: boolean
  held: boolean
  aiming: boolean
  overload: boolean
  burst: boolean
  snare: boolean
  barrier: boolean
  warp: boolean
}

const PLAIN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const RUNE_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uFade;
  uniform vec3 uColor;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float a = atan(p.y, p.x);
    float ring = smoothstep(0.03, 0.0, abs(r - 0.94)) + smoothstep(0.02, 0.0, abs(r - 0.78)) * 0.7;
    float spokes = smoothstep(0.04, 0.0, abs(sin(a * 6.0 + uTime * 0.8))) * step(0.78, r) * step(r, 0.94);
    float inner = smoothstep(0.02, 0.0, abs(r - 0.45 - 0.03 * sin(a * 3.0 - uTime * 2.0)));
    float fill = (1.0 - smoothstep(0.0, 0.95, r)) * 0.12;
    float v = (ring + spokes * 0.8 + inner * 0.6 + fill) * step(r, 1.0);
    gl_FragColor = vec4(uColor * v * 2.2, v * uFade);
  }
`
/** The wall of the Reality Warp field: bands that run upward and fade toward the top. */
const WARP_FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uFade;
  void main() {
    float bands = 0.5 + 0.5 * sin(vUv.y * 22.0 - uTime * 7.0 + sin(vUv.x * 40.0) * 0.6);
    float k = (1.0 - vUv.y) * (1.0 - vUv.y);
    vec3 col = mix(vec3(0.56, 0.33, 1.0), vec3(1.0, 0.16, 0.24), vUv.y) * 1.6;
    float a = k * (0.25 + 0.5 * bands) * uFade;
    gl_FragColor = vec4(col * a, a);
  }
`
const SHIELD_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalMatrix * normal;
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`
const SHIELD_FRAG = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec2 vUv;
  uniform float uHit;
  uniform float uFade;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.0);
    vec2 g = vUv * vec2(24.0, 12.0);
    float hex = smoothstep(0.08, 0.0, abs(fract(g.x + 0.5 * floor(g.y)) - 0.5) - 0.42) + smoothstep(0.08, 0.0, abs(fract(g.y) - 0.5) - 0.44);
    float v = (f * 0.75 + hex * 0.04 + uHit * 0.35) * uFade;
    gl_FragColor = vec4(vec3(1.0, 0.16, 0.22) * v * 1.2, v * 0.4);
  }
`

const boltGeo = new THREE.SphereGeometry(0.11, 10, 8)
const boltMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(COLOR.chaos).multiplyScalar(4) })

/** Held this long, the left button turns from a bolt into Telekinesis. */
const GRIP_HOLD = 0.25

/**
 * Chaos, the left hand: Hex Bolt and Telekinesis while aiming, Chaos Burst, Hex Snare, Hex Barrier and
 * Reality Warp on their keys, the Chaos meter, Crimson Overload and its Backlash. Same rules and
 * numbers as v1; the aim comes from the shoulder camera instead of the eyes.
 */
export class Spells {
  private readonly g: Game
  readonly bolts: Bolt[] = []
  private readonly snares: Field[] = []
  private readonly warps: Field[] = []
  boltCd = 0
  burstCd = 0
  snareCd = 0
  barrierCd = 0
  warpCd = 0
  grabbed: Unit[] = []
  chaos = 0
  overloadT = 0
  backlashT = 0
  barrierT = 0
  barrierAbsorb = 0
  private barrierHit = 0
  private holdT = 0
  private readonly shield: THREE.Mesh
  private readonly tendril: THREE.Line
  private readonly tendrilPts: THREE.Vector3[] = []
  private tendrilLight: THREE.PointLight | null = null
  private readonly tmp = new THREE.Vector3()
  private readonly ray = new THREE.Ray()
  private readonly sphere = new THREE.Sphere()

  constructor(g: Game) {
    this.g = g
    this.shield = new THREE.Mesh(
      new THREE.SphereGeometry(1.25, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: { uHit: { value: 0 }, uFade: { value: 0 } },
        vertexShader: SHIELD_VERT,
        fragmentShader: SHIELD_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    )
    this.shield.visible = false
    this.shield.renderOrder = 12
    g.scene.add(this.shield)
    for (let i = 0; i < 16; i++) this.tendrilPts.push(new THREE.Vector3())
    this.tendril = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(this.tendrilPts),
      new THREE.LineBasicMaterial({ color: new THREE.Color(COLOR.chaos).multiplyScalar(3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    )
    this.tendril.frustumCulled = false
    this.tendril.visible = false
    g.scene.add(this.tendril)
  }

  reset() {
    for (const b of this.bolts) this.killBolt(b)
    this.bolts.length = 0
    for (const f of [...this.snares, ...this.warps]) this.g.scene.remove(f.group)
    this.snares.length = 0
    this.warps.length = 0
    this.drop(false)
    this.boltCd = this.burstCd = this.snareCd = this.barrierCd = this.warpCd = 0
    this.overloadT = this.backlashT = this.barrierT = 0
    this.shield.visible = false
  }

  get overloaded() {
    return this.overloadT > 0
  }

  get damageMult() {
    return this.g.derived.damageMult * (this.overloaded ? CHAOS.overloadDamage : 1)
  }

  /** A boulder held by Telekinesis (when no creature was in the aim). */
  heldProp: Prop | null = null

  get gripping() {
    return this.grabbed.length > 0 || !!this.heldProp
  }

  private unlocked(id: SkillId) {
    return isUnlocked(this.g.profile, id)
  }

  private upgraded(id: SkillId) {
    return hasUpgrade(this.g.profile, id)
  }

  /** Spends mana unless Overload makes skills free. */
  private pay(cost: number): boolean {
    if (this.overloaded || cost <= 0) return true
    const p = this.g.player
    if (p.mana < cost) {
      this.g.hud.flashMana()
      return false
    }
    p.mana -= cost
    return true
  }

  addChaos(amount: number) {
    if (this.overloaded) return
    const before = this.chaos
    this.chaos = Math.min(CHAOS.max, this.chaos + amount)
    if (before < CHAOS.max && this.chaos >= CHAOS.max) this.g.hud.message('Meter Chaos penuh. Tekan G untuk Crimson Overload.', 'chaos')
  }

  update(dt: number, canAct: boolean, inp: SpellInput) {
    const g = this.g
    this.boltCd = Math.max(0, this.boltCd - dt)
    this.burstCd = Math.max(0, this.burstCd - dt)
    this.snareCd = Math.max(0, this.snareCd - dt)
    this.barrierCd = Math.max(0, this.barrierCd - dt)
    this.warpCd = Math.max(0, this.warpCd - dt)

    // Overload, then Backlash
    if (this.overloadT > 0) {
      this.overloadT -= dt
      if (this.overloadT <= 0) {
        this.overloadT = 0
        this.backlashT = CHAOS.backlashTime
        const loss = Math.round(g.player.hp * CHAOS.backlashHpLoss)
        g.player.hp = Math.max(1, g.player.hp - loss)
        g.hud.message(`Backlash: ${loss} HP hilang dan mana berhenti pulih selama 3 detik.`, 'chaos')
        g.hud.hurtFlash(0.5)
        g.sfx.overload(false)
      }
    }
    this.backlashT = Math.max(0, this.backlashT - dt)

    if (canAct) {
      if (inp.overload && this.chaos >= CHAOS.max && !this.overloaded) this.startOverload()
      if (inp.aiming && inp.pressed && this.boltCd <= 0 && !this.gripping) this.fireBolt()
      if (inp.aiming && inp.held) this.holdT += dt
      else this.holdT = 0
      if (this.holdT >= GRIP_HOLD && !this.gripping && this.holdT - dt < GRIP_HOLD) this.tryGrip()
      if (inp.burst) this.cast('burst', inp.aiming)
      if (inp.snare) this.cast('snare', inp.aiming)
      if (inp.barrier) this.cast('barrier', inp.aiming)
      if (inp.warp) this.cast('warp', inp.aiming)
    }
    if (this.gripping) {
      if (!canAct || !inp.held || !inp.aiming) this.drop(canAct && inp.aiming)
      else this.holdGrip(dt)
    }
    this.updateBolts(dt)
    this.updateSnares(dt)
    this.updateBarrier(dt)
    this.updateWarps(dt)
  }

  private startOverload() {
    const g = this.g
    this.overloadT = CHAOS.overloadTime
    this.chaos = 0
    g.addTrauma(0.45)
    g.sfx.overload(true)
    g.hud.message('Crimson Overload: damage +50% dan semua skill tanpa mana selama 12 detik.', 'chaos')
    g.lights.flash(g.ilyra.hand('L'), COLOR.chaos, 30, 18, 0.6)
  }

  private fireBolt() {
    const g = this.g
    this.boltCd = SPELL.bolt.cooldown
    const from = g.ilyra.hand('L')
    const target = g.aim(80).point
    const base = target.clone().sub(from).normalize()
    const spread = this.upgraded('hexBolt')
    const dirs = spread ? [-1, 0, 1].map((k) => base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), k * SPELL.bolt.spreadAngle)) : [base]
    const dmg = (spread ? SPELL.bolt.spreadDamage : SPELL.bolt.damage) * this.damageMult
    for (const d of dirs) {
      const mesh = new THREE.Mesh(boltGeo, boltMat)
      mesh.position.copy(from)
      g.scene.add(mesh)
      this.bolts.push({ pos: from.clone(), prev: from.clone(), vel: d.multiplyScalar(SPELL.bolt.speed), life: SPELL.bolt.life, damage: dmg, mesh, light: g.lights.acquire(COLOR.chaos, 6, 7) })
    }
    g.fight.cast()
    g.addTrauma(0.03)
    g.sfx.bolt()
    g.glow.emit({ pos: from, count: 8, color: COLOR.chaosHot, intensity: 3, life: 0.2, size: 0.12, speed: 2.5, jitter: 0.03 })
  }

  private killBolt(b: Bolt) {
    this.g.scene.remove(b.mesh)
    this.g.lights.release(b.light)
    b.light = null
  }

  private updateBolts(dt: number) {
    const g = this.g
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]
      b.prev.copy(b.pos)
      b.pos.addScaledVector(b.vel, dt)
      b.life -= dt
      b.mesh.position.copy(b.pos)
      b.light?.position.copy(b.pos)
      g.glow.emit({ pos: b.pos, count: 2, color: COLOR.chaos, intensity: 2.6, life: 0.22, size: 0.16, sizeEnd: 0.02, speed: 0.4, jitter: 0.04 })
      // sweep the segment so a fast bolt never passes through a thin body
      const len = b.pos.distanceTo(b.prev)
      const dir = this.tmp.subVectors(b.pos, b.prev).divideScalar(len || 1).clone()
      let best = g.obstacles.sweep(b.prev.x, b.prev.y, b.prev.z, b.pos.x, b.pos.y, b.pos.z, 0.05) * len
      let hitUnit: Unit | null = null
      this.ray.set(b.prev, dir)
      for (const u of g.units.units) {
        if (u.team !== 'enemy' || !u.targetable) continue
        u.center(this.sphere.center)
        this.sphere.radius = Math.max(u.radius, u.height * 0.42) + SPELL.bolt.radius
        if (!this.ray.intersectSphere(this.sphere, this.tmp)) continue
        const d = this.tmp.distanceTo(b.prev)
        if (d <= len && d < best) {
          best = d
          hitUnit = u
        }
      }
      const ground = g.ground.height(b.pos.x, b.pos.z)
      const hitGround = b.pos.y < ground
      if (best < len || hitUnit || hitGround || b.life <= 0) {
        const at = b.prev.clone().addScaledVector(dir, Math.min(best, len))
        if (hitUnit) {
          g.hurtUnit(hitUnit, b.damage, b.prev, SPELL.bolt.stun, 0.6, 'player', 'bolt')
          g.units.down(hitUnit, SPELL.bolt.down)
          g.sfx.hit()
        }
        g.glow.emit({ pos: at, count: hitUnit ? 18 : 10, color: COLOR.chaosHot, intensity: 3, life: 0.35, size: 0.2, sizeEnd: 0.02, speed: 4, jitter: 0.05, gravity: 3 })
        g.lights.flash(at, COLOR.chaos, 8, 6, 0.18)
        this.killBolt(b)
        this.bolts.splice(i, 1)
      }
    }
  }

  private grippable(u: Unit) {
    return u.targetable && u.team === 'enemy' && u.mass <= SPELL.grip.maxMass && u.state !== 'held'
  }

  private tryGrip() {
    const g = this.g
    if (!this.unlocked('grip')) return
    if (!this.overloaded && g.player.mana < 1) {
      g.hud.flashMana()
      return
    }
    const hit = g.aim(SPELL.grip.range)
    let first: Unit | null = hit.unit && this.grippable(hit.unit) ? hit.unit : null
    if (!first) {
      // a little aim help: the body closest to the aim line inside a narrow cone
      const o = g.camera.position
      const f = g.camera.getWorldDirection(new THREE.Vector3())
      let bestA: number = SPELL.grip.aimCone * 2
      for (const u of g.units.units) {
        if (!this.grippable(u)) continue
        const to = u.center().sub(o)
        if (to.length() > SPELL.grip.range + 4) continue
        const a = f.angleTo(to)
        if (a < bestA) {
          bestA = a
          first = u
        }
      }
    }
    if (!first) {
      // no creature: the boulder closest to the aim line
      const prop = g.props.pick(g.camera.position, g.camera.getWorldDirection(new THREE.Vector3()), SPELL.grip.range + 6, SPELL.grip.aimCone * 3)
      if (!prop) return
      prop.held = true
      prop.thrown = false
      prop.vel.set(0, 0, 0)
      this.heldProp = prop
      g.sfx.gripStart()
      this.tendril.visible = true
      this.tendrilLight = g.lights.acquire(COLOR.chaos, 5, 8)
      return
    }
    this.grabbed = [first]
    if (this.upgraded('grip')) {
      let second: Unit | null = null
      let sd = 4
      for (const u of g.units.units) {
        if (u === first || !this.grippable(u)) continue
        const d = u.pos.distanceTo(first.pos)
        if (d < sd) {
          sd = d
          second = u
        }
      }
      if (second) this.grabbed.push(second)
    }
    for (const u of this.grabbed) {
      g.telegraphs.clear(u)
      u.token = false
      u.set('held')
      u.vel.set(0, 0, 0)
      // a Harpy pulled out of the air stays down for a while after the throw
      if (u.spec.fly) u.downed = Math.max(u.downed, 3)
    }
    g.sfx.gripStart()
    this.tendril.visible = true
    this.tendrilLight = g.lights.acquire(COLOR.chaos, 5, 8)
  }

  private holdGrip(dt: number) {
    const g = this.g
    if (!this.overloaded) {
      g.player.mana -= SPELL.grip.manaPerSec * dt
      if (g.player.mana <= 0) {
        g.player.mana = 0
        g.hud.message('Mana habis, cengkeraman lepas.', 'chaos')
        this.drop(false)
        return
      }
    }
    // held in front of her, a little left of the aim line, at chest height or above the ground
    const p = g.player.pos
    const f = g.camera.getWorldDirection(new THREE.Vector3())
    const right = new THREE.Vector3(-f.z, 0, f.x).normalize()
    if (this.heldProp) {
      const prop = this.heldProp
      const goal = new THREE.Vector3(p.x, p.y + 1.6, p.z).addScaledVector(f, 5.4).addScaledVector(right, -0.4)
      goal.y = Math.max(goal.y, g.ground.height(goal.x, goal.z) + 1)
      prop.pos.lerp(goal, Math.min(1, dt * 6))
      prop.spin += dt * 2
      this.drawTendril(prop.pos)
      g.glow.emit({ pos: prop.pos, count: 2, color: COLOR.chaos, intensity: 2.4, life: 0.4, size: 0.22, sizeEnd: 0.04, speed: 1.2, jitter: 0.6 })
      return
    }
    this.grabbed = this.grabbed.filter((u) => u.alive && u.state === 'held')
    if (!this.grabbed.length) {
      this.drop(false)
      return
    }
    this.grabbed.forEach((u, i) => {
      const heavy = u.mass > 200
      const dist = 4.6 + (heavy ? 1.5 : 0)
      const goal = new THREE.Vector3(p.x, p.y + 1.5, p.z).addScaledVector(f, dist).addScaledVector(right, i === 0 ? -0.4 : 1.2)
      goal.y = Math.max(goal.y, g.ground.height(goal.x, goal.z) + 0.6)
      const c = u.center()
      const nc = c.clone().lerp(goal, Math.min(1, dt * (heavy ? 5 : 9)))
      u.pos.add(nc.sub(c))
      u.yaw += dt * 2
    })
    this.drawTendril(this.grabbed[0].center())
    for (const u of this.grabbed) g.glow.emit({ pos: u.center(), count: 2, color: COLOR.chaos, intensity: 2.4, life: 0.4, size: 0.22, sizeEnd: 0.04, speed: 1.2, jitter: 0.5 })
  }

  /** The red tendril from her left palm to what she holds. */
  private drawTendril(to: THREE.Vector3) {
    const g = this.g
    const from = g.ilyra.hand('L')
    const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 0.5, 0))
    for (let i = 0; i < this.tendrilPts.length; i++) {
      const s = i / (this.tendrilPts.length - 1)
      const a = from.clone().lerp(mid, s)
      const pt = a.lerp(mid.clone().lerp(to, s), s)
      pt.x += Math.sin(g.t * 23 + i * 1.7) * 0.06 * Math.sin(s * Math.PI)
      pt.y += Math.cos(g.t * 19 + i * 1.3) * 0.06 * Math.sin(s * Math.PI)
      this.tendrilPts[i].copy(pt)
    }
    this.tendril.geometry.setFromPoints(this.tendrilPts)
    this.tendrilLight?.position.copy(to)
  }

  /** Lets go: thrown at the aim point when `throwIt`, else dropped where it hangs. */
  private drop(throwIt: boolean) {
    const g = this.g
    if (!this.grabbed.length && !this.heldProp) return
    const aimAt = throwIt ? g.aim(80).point : null
    if (this.heldProp) {
      const prop = this.heldProp
      prop.held = false
      if (aimAt) {
        prop.vel.copy(aimAt).sub(prop.pos).normalize().multiplyScalar(SPELL.grip.throwSpeed)
        prop.thrown = true
        prop.flight = SPELL.grip.flight
      }
      this.heldProp = null
    }
    for (const u of this.grabbed) {
      if (!u.alive) continue
      const speed = u.mass >= 300 ? SPELL.grip.heavyThrowSpeed : u.mass > 200 ? SPELL.grip.throwSpeed * 0.6 : SPELL.grip.throwSpeed
      const v = aimAt ? aimAt.clone().sub(u.center()).normalize().multiplyScalar(speed) : new THREE.Vector3()
      g.units.toss(u, v, throwIt, throwIt ? SPELL.grip.flight : 0)
    }
    this.grabbed = []
    this.holdT = 0
    this.tendril.visible = false
    g.lights.release(this.tendrilLight)
    this.tendrilLight = null
    g.sfx.gripStop(throwIt)
    if (throwIt) {
      g.fight.cast()
      g.addTrauma(0.12)
    }
  }

  /** A thrown body hit something: it and what it hit are hurt by its weight and speed. */
  impact(u: Unit, other: Unit | null, speed: number) {
    const g = this.g
    const dmg = impactDamage(u.mass, speed, SPELL.impact.coefficient, SPELL.impact.exponent) * this.damageMult
    g.hurtUnit(u, dmg, u.pos, 12, 0, 'player', 'impact')
    if (other) g.hurtUnit(other, dmg, u.pos, 12, 5, 'player', 'impact')
    g.sfx.impact(Math.min(1.5, speed / 20))
    g.glow.emit({ pos: u.center(), count: 16, color: COLOR.chaosHot, intensity: 2.6, life: 0.4, size: 0.16, speed: 4, gravity: 5 })
    g.smoke.emit({ pos: u.pos, count: 5, color: 0x2a2420, life: 0.8, size: 0.6, sizeEnd: 1.3, speed: 1.4, alpha: 0.5 })
  }

  /** Where a skill lands: the aim point while aiming, else the locked creature, else a little ahead of her. */
  private target(range: number, aiming: boolean): THREE.Vector3 {
    const g = this.g
    let at: THREE.Vector3
    const locked = g.lockon.current as Unit | null
    if (aiming) {
      const hit = g.aim(range)
      at = hit.unit ? hit.unit.pos.clone() : hit.point.clone()
    } else if (locked && locked.alive) at = locked.pos.clone()
    else {
      const p = g.player
      at = new THREE.Vector3(p.pos.x - Math.sin(p.facing) * 7, 0, p.pos.z - Math.cos(p.facing) * 7)
    }
    at.y = g.ground.height(at.x, at.z)
    return at
  }

  private cast(id: 'burst' | 'snare' | 'barrier' | 'warp', aiming: boolean) {
    const g = this.g
    if (!this.unlocked(id)) {
      const def = skillById(id)
      g.hud.message(`${def.name} terbuka di Lv ${def.unlock}.`, 'info')
      return
    }
    const cd = { burst: this.burstCd, snare: this.snareCd, barrier: this.barrierCd, warp: this.warpCd }[id]
    if (cd > 0) return
    if (!this.pay(SPELL[id].mana)) return
    g.fight.cast()
    if (id === 'burst') this.burst(this.target(SPELL.burst.range, aiming))
    else if (id === 'snare') this.snare(this.target(SPELL.snare.range, aiming))
    else if (id === 'warp') this.warp(this.target(SPELL.warp.range, aiming))
    else this.raiseBarrier()
  }

  private rune(color: number): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uFade: { value: 0 }, uColor: { value: new THREE.Color(color) } },
      vertexShader: PLAIN_VERT,
      fragmentShader: RUNE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }

  private burst(at: THREE.Vector3) {
    const s = SPELL.burst
    this.burstCd = s.cooldown
    const r = s.radius + (this.upgraded('burst') ? s.radiusUpgrade : 0)
    this.explode(at, r, s.damage * this.damageMult, s.push, s.lift)
    this.g.sfx.burst()
  }

  /** Shared by Chaos Burst and the barrier blast: hurts, shoves and tosses every creature inside. */
  explode(at: THREE.Vector3, r: number, damage: number, push: number, lift: number) {
    const g = this.g
    for (const u of [...g.units.units]) {
