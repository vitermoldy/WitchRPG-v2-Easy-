import fs from 'node:fs'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { UNITS, V2_KINDS } from '../src/game/balance'
import { clipRoles } from '../src/engine/rigs'

