import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { ELITE, FAUNA, HYDRA, SPELL, UNITS, WORLD_BOSSES } from '../src/game/balance'
import { riteBlock, riteChance, addShadow, newProfile, impactDamage } from '../src/game/progression'
import { Obstacles } from '../src/engine/obstacles'
import { UnitSystem, type Foe, type UnitHost } from '../src/engine/units'
import { hydraShare } from '../src/world/lair'
import { toWorld } from '../src/world/map'
import { Seal } from '../src/world/seal'

function world() {
  const foe: Foe = { pos: new THREE.Vector3(), radius: 0.38, alive: true }
  const fx: string[] = []
  const host: UnitHost = {
