import * as THREE from 'three'
import { CYL, SPHERE, type Obstacles } from '../engine/obstacles'
import { heightMap, LANDMARKS, toWorld, type Landmark } from './map'

/**
 * The places without monsters in the south (owner, 28 Nov 2026): a ruined tower, a pond ringed with
