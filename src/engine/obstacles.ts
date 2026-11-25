/**
 * Static obstacles of the forest: tree trunks and crowns as vertical cylinders, rocks as spheres.
 * A grid index keeps each query to the shapes near one spot, so 15,000 trees cost the same as fifty.
 * World coordinates (three.js: y up, north is -z).
 */
export const CYL = 0
export const SPHERE = 1

export interface Shape {
  kind: typeof CYL | typeof SPHERE
  x: number
  /** Cylinder: bottom. Sphere: centre. */
  y: number
  z: number
  r: number
  /** Cylinder height; unused for spheres. */
  h: number
  /** Crowns block the camera but not her feet. */
  camOnly: boolean
}

const CELL = 8

export class Obstacles {
  readonly shapes: Shape[] = []
  private readonly grid = new Map<number, number[]>()
  private stamp = 1
