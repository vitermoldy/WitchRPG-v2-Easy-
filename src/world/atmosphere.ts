import * as THREE from 'three'
import { toMap, WATER_LEVEL, WATER_RECT, ZONES, zoneWeights } from './map'

/** Top of the sky per zone: clear blue over the first three, grey over the ruins, smoke over the burning valley. */
const ZENITH: Record<string, string> = { pembuka: '#47689a', tebing: '#47689a', rawa: '#4f6a82', kuil: '#565e6c', bara: '#3e1d17' }

/** Towards the morning sun: low in the east-south-east, like the previz hero shot. */
export const SUN_DIR = new THREE.Vector3(0.78, 0.42, 0.46).normalize()

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
