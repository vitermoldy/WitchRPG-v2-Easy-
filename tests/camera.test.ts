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
