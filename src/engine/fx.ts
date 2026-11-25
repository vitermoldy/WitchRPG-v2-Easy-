import * as THREE from 'three'

type Vec = { x: number; y: number; z: number }

export interface Emit {
  pos: Vec
  count: number
