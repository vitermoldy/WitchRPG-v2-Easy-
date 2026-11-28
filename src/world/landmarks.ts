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
