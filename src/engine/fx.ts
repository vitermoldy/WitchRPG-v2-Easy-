import * as THREE from 'three'

type Vec = { x: number; y: number; z: number }

export interface Emit {
  pos: Vec
  count: number
  color: THREE.ColorRepresentation
  /** Multiplies the colour; above 1 it feeds the bloom pass. */
  intensity?: number
  life: number
  lifeJitter?: number
  size: number
  sizeEnd?: number
  /** Random velocity magnitude in every direction. */
  speed?: number
  /** Base velocity added to every particle. */
  vel?: Vec
  /** Random offset around pos. */
  jitter?: number
  gravity?: number
  drag?: number
  alpha?: number
