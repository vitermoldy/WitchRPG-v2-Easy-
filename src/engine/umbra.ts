import * as THREE from 'three'
import { EASY, RANKS, RITE, UNITS } from '../game/balance'
import { addShadow, hasUpgrade, isUnlocked, riteBlock, riteChance, type ShadowRecord } from '../game/progression'
import type { Game } from './game'
import { COLOR } from './palette'
import type { Unit } from './units'

/** A creature's rank for the Rite: an elite Cyclops counts as a Jenderal. */
/** Easy: every body rises. The v1 formula (riteChance) is kept, locked by its tests, and never wins. */
export const riteOdds = (...args: Parameters<typeof riteChance>) => Math.max(EASY.riteChance, riteChance(...args))

export const rankOf = (u: Unit) => (u.elite && u.spec.eliteRank ? u.spec.eliteRank : u.spec.rank)

export type WheelChoice = 'follow' | 'attack' | 'hold' | 'swap'

export interface UmbraInput {
  riteHeld: boolean
  ritePressed: boolean
