import * as THREE from 'three'
import { heightMap, PLAY_HALF, toMap, zoneAt } from './map'

const CELL = 8
/** Zones that stay sealed until the Hydra has fallen (PROMPT: "Terbuka setelah Hydra kalah"). */
const SEALED = new Set(['kuil', 'bara'])

