import * as THREE from 'three'
import { HYDRA, MOVE, UNITS, type AttackSpec } from '../game/balance'
import type { Game } from '../engine/game'
import { COLOR } from '../engine/palette'
import { ringOf, type DamageKind, type Unit } from '../engine/units'
import { heightAt, LAKE, SPOTS, toWorld, WATER_LEVEL } from './map'

