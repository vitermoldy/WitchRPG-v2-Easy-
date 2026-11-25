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
