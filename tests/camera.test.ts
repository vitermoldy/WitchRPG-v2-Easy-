import { describe, expect, it } from 'vitest'
import { CAMERA } from '../src/game/balance'
import { CameraRig, clearFraction, forward, rad, rightOf, wanted, type Vec } from '../src/engine/camera'
import { CYL, Obstacles, SPHERE } from '../src/engine/obstacles'

const flat = () => 0
const pivot: Vec = { x: 0, y: 1.6, z: 0 }

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('over-the-shoulder camera', () => {
  it('sits 3.4 m behind and 0.8 m to the right of her head with nothing in the way', () => {
    const rig = new CameraRig()
    rig.pitch = 0
    const pose = rig.update(1, pivot, false, null, null, flat)
    // yaw 0 looks north (-z): behind is +z, right is +x
    expect(pose.pos.z).toBeCloseTo(CAMERA.normal.dist, 5)
    expect(pose.pos.x).toBeCloseTo(CAMERA.normal.shoulder, 5)
    expect(pose.pos.y).toBeCloseTo(pivot.y, 5)
    expect(pose.fov).toBeCloseTo(CAMERA.normal.fov, 5)
  })

  it('blends to the closer, narrower aim view while the right button is held', () => {
    const rig = new CameraRig()
    rig.pitch = 0
    let pose = rig.update(1 / 60, pivot, true, null, null, flat)
    for (let i = 0; i < 120; i++) pose = rig.update(1 / 60, pivot, true, null, null, flat)
    expect(pose.pos.z).toBeCloseTo(CAMERA.aim.dist, 2)
    expect(pose.pos.x).toBeCloseTo(CAMERA.aim.shoulder, 2)
    expect(pose.fov).toBeCloseTo(CAMERA.aim.fov, 1)
  })

  it('moves to her eyes with a wider view in first person, and back over her shoulder', () => {
    const rig = new CameraRig()
    rig.pitch = 0
    rig.firstPerson = true
    let pose = rig.update(1 / 60, pivot, false, null, null, flat)
    for (let i = 0; i < 120; i++) pose = rig.update(1 / 60, pivot, false, null, null, flat)
    expect(rig.fp).toBe(1)
    // a little in front of her head (north is -z), no shoulder offset
    expect(pose.pos.z).toBeCloseTo(-CAMERA.first.ahead, 5)
    expect(pose.pos.x).toBeCloseTo(0, 5)
    expect(pose.fov).toBeCloseTo(CAMERA.first.fov, 5)
    for (let i = 0; i < 120; i++) pose = rig.update(1 / 60, pivot, true, null, null, flat)
    expect(pose.fov).toBeCloseTo(CAMERA.first.aimFov, 1)
    rig.firstPerson = false
    for (let i = 0; i < 240; i++) pose = rig.update(1 / 60, pivot, false, null, null, flat)
    expect(rig.fp).toBe(0)
    expect(pose.pos.z).toBeCloseTo(CAMERA.normal.dist, 2)
  })

  it('stops in front of a trunk standing between her and the camera', () => {
    const obs = new Obstacles()
    obs.add({ kind: CYL, x: 0.4, y: 0, z: 2, r: 0.3, h: 12, camOnly: false })
    const rig = new CameraRig()
    rig.pitch = 0
    const pose = rig.update(1 / 60, pivot, false, null, obs, flat)
    expect(pose.pos.z).toBeLessThan(2)
    expect(obs.clearance(pose.pos.x, pose.pos.y, pose.pos.z)).toBeGreaterThanOrEqual(CAMERA.radius - 1e-6)
  })

  it('stays above a hill behind her', () => {
    const hill = (_x: number, z: number) => (z > 1 ? (z - 1) * 1.2 : 0)
    const rig = new CameraRig()
    rig.pitch = rad(10)
    const pose = rig.update(1 / 60, pivot, false, null, null, hill)
    expect(pose.pos.y).toBeGreaterThan(hill(pose.pos.x, pose.pos.z) + CAMERA.radius)
  })

  it('snaps in at once, then eases back out instead of jumping', () => {
    const obs = new Obstacles()
    const rig = new CameraRig()
    rig.pitch = 0
    obs.add({ kind: CYL, x: 0.4, y: 0, z: 1.5, r: 0.3, h: 12, camOnly: false })
    rig.update(1 / 60, pivot, false, null, obs, flat)
    const blocked = rig.frac
    const empty = new Obstacles()
    rig.update(1 / 60, pivot, false, null, empty, flat)
    expect(rig.frac).toBeGreaterThan(blocked)
    expect(rig.frac).toBeLessThan(0.9)
    for (let i = 0; i < 180; i++) rig.update(1 / 60, pivot, false, null, empty, flat)
    expect(rig.frac).toBeCloseTo(1, 3)
  })

  it('never ends inside a trunk, crown, rock or the ground (5,000 random forests)', () => {
    const r = rng(7)
    let worst = Infinity
    for (let n = 0; n < 5000; n++) {
      const obs = new Obstacles()
      for (let k = 0; k < 14; k++) {
        const x = (r() - 0.5) * 14
        const z = (r() - 0.5) * 14
        if (Math.hypot(x, z) < 0.9) continue
        if (r() < 0.75) {
          const s = 0.7 + r() * 0.7
          obs.add({ kind: CYL, x, y: 0, z, r: 0.3 * s, h: 14 * s, camOnly: false })
          obs.add({ kind: CYL, x, y: 3.5 * s, z, r: 2.4 * s, h: 9 * s, camOnly: true })
        } else {
          obs.add({ kind: SPHERE, x, y: r() * 0.6, z, r: 0.5 + r() * 2.5, h: 0, camOnly: false })
        }
      }
      const tilt = (r() - 0.5) * 0.8
      const ground = (x: number, z: number) => tilt * z + 0.6 * Math.sin(x * 0.7) * Math.cos(z * 0.5)
      const feet = { x: 0, y: ground(0, 0), z: 0 }
      obs.pushOut(feet, 0.38, 1.7)
      const head = { x: feet.x, y: ground(feet.x, feet.z) + 1.6, z: feet.z }
      if (obs.clearance(head.x, head.y, head.z) < CAMERA.radius) continue
      const rig = new CameraRig()
      rig.yaw = r() * Math.PI * 2
      rig.pitch = rad(CAMERA.pitchMin + r() * (CAMERA.pitchMax - CAMERA.pitchMin))
      const pose = rig.update(1 / 60, head, r() < 0.3, null, obs, ground)
      worst = Math.min(worst, obs.clearance(pose.pos.x, pose.pos.y, pose.pos.z))
      expect(pose.pos.y).toBeGreaterThan(ground(pose.pos.x, pose.pos.z) + CAMERA.near)
    }
    expect(worst).toBeGreaterThanOrEqual(CAMERA.radius - 1e-6)
  })

  it('frames a locked target on the upper-right third of the screen', () => {
    const rig = new CameraRig()
    const target = { point: { x: 0, y: 1.2, z: -8 }, height: 1.3 }
    let pose = rig.update(1 / 60, pivot, false, target, null, flat)
    for (let i = 0; i < 240; i++) pose = rig.update(1 / 60, pivot, false, target, null, flat)
    // project the target into the camera's view
    const f = pose.dir
    const right = rightOf(rig.yaw)
    const up = { x: -f.x * f.y, y: 1 - f.y * f.y, z: -f.z * f.y }
    const ul = Math.hypot(up.x, up.y, up.z)
    const d = { x: target.point.x - pose.pos.x, y: target.point.y - pose.pos.y, z: target.point.z - pose.pos.z }
    const depth = d.x * f.x + d.y * f.y + d.z * f.z
    const tv = Math.tan(rad(pose.fov) / 2)
    const sx = (d.x * right.x + d.z * right.z) / depth / (tv * 16 / 9)
    const sy = (d.x * up.x + d.y * up.y + d.z * up.z) / ul / depth / tv
    expect(sx).toBeGreaterThan(0.2)
    expect(sx).toBeLessThan(0.45)
    expect(sy).toBeGreaterThan(0.15)
    expect(sy).toBeLessThan(0.45)
  })

  it('wanted spot and clear fraction agree when the path is empty', () => {
    const w = wanted(pivot, 0.3, -0.1, CAMERA.normal)
    expect(clearFraction(pivot, w, null, flat)).toBe(1)
    const f = forward(0.3, -0.1)
    expect(Math.hypot(f.x, f.y, f.z)).toBeCloseTo(1, 6)
  })
})
