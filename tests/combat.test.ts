import { describe, expect, it } from 'vitest'
import { COMBAT, RITE } from '../src/game/balance'
import { Combo, inSwing, resolveDefense, StunMeter, type ComboEvent } from '../src/engine/combat'
