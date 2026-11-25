import { COMBAT, type Swing } from '../game/balance'

export type Defense = 'parry' | 'block' | 'dodge' | 'hit'

/**
 * How a creature's blow on Ilyra resolves at the moment it lands.
