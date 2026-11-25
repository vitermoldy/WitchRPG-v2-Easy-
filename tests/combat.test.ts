import { describe, expect, it } from 'vitest'
import { COMBAT, RITE } from '../src/game/balance'
import { Combo, inSwing, resolveDefense, StunMeter, type ComboEvent } from '../src/engine/combat'
import { riteChance } from '../src/game/progression'

const W = COMBAT.parry.window

