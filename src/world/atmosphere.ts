import * as THREE from 'three'
import { toMap, WATER_LEVEL, WATER_RECT, ZONES, zoneWeights } from './map'

/** Top of the sky per zone: clear blue over the first three, grey over the ruins, smoke over the burning valley. */
const ZENITH: Record<string, string> = { pembuka: '#47689a', tebing: '#47689a', rawa: '#4f6a82', kuil: '#565e6c', bara: '#3e1d17' }

/** Towards the morning sun: low in the east-south-east, like the previz hero shot. */
export const SUN_DIR = new THREE.Vector3(0.78, 0.42, 0.46).normalize()

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w;
}`

const SKY_FRAG = /* glsl */ `
uniform vec3 zenith;
uniform vec3 horizon;
uniform vec3 ground;
uniform vec3 fogColor;
uniform vec3 sunDir;
uniform vec3 sunColor;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 c = mix(horizon, zenith, smoothstep(0.02, 0.55, h));
  c = mix(c, ground, smoothstep(0.0, -0.25, h));
  // the band at the horizon takes the fog colour, so far hills melt into the sky
  c = mix(c, fogColor, (1.0 - smoothstep(0.0, 0.22, abs(h))) * 0.85);
  float s = max(dot(d, sunDir), 0.0);
  c += sunColor * (pow(s, 600.0) * 6.0 + pow(s, 12.0) * 0.25);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`

/**
 * Fog, sky and ambient light. Each zone has its own fog colour and sight distance; at any spot they
 * blend by the zone weights, and the blend eases over time so walking between zones never pops.
