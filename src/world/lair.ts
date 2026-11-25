import * as THREE from 'three'
import { HYDRA, MOVE, UNITS, type AttackSpec } from '../game/balance'
import type { Game } from '../engine/game'
import { COLOR } from '../engine/palette'
import { ringOf, type DamageKind, type Unit } from '../engine/units'
import { heightAt, LAKE, SPOTS, toWorld, WATER_LEVEL } from './map'

export type LairState = 'calm' | 'fight' | 'won'

/**
 * How much of a blow on the Hydra lands. Phase 1: everything. Phase 2: its slimy skin lets bolts and
 * blasts do 10% and thrown things (boulders, bodies, the staff) 150%. Phase 3: nothing, except inside
 * Reality Warp, where its open heart takes 150%. The army's blows always do 15% of their damage: the
 * Hydra is her fight.
