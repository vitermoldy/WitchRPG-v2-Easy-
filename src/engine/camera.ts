import { CAMERA, LOCKON } from '../game/balance'
import type { Obstacles } from './obstacles'

/**
 * The single over-the-shoulder camera. It never cuts: normal, aim and lock-on are blends of one rig.
 * It never passes through a tree, rock or the ground: the way from her head to the wanted spot is
