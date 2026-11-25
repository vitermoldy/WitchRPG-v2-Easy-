import { LOCKON } from '../game/balance'
import { yawTo, type Vec } from './camera'

export interface Target {
  /** Feet position (world). */
  x: number
  y: number
  z: number
  height: number
  alive: boolean
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/** The point on a target the camera frames: about chest height. */
export const lockPoint = (t: Target): Vec => ({ x: t.x, y: t.y + t.height * 0.62, z: t.z })

/**
