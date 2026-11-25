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
  private seen = new Uint32Array(0)

  private key(ix: number, iz: number) {
    return (ix + 2048) * 4096 + (iz + 2048)
  }

  add(s: Shape) {
    const id = this.shapes.length
    this.shapes.push(s)
    const x0 = Math.floor((s.x - s.r) / CELL)
    const x1 = Math.floor((s.x + s.r) / CELL)
    const z0 = Math.floor((s.z - s.r) / CELL)
    const z1 = Math.floor((s.z + s.r) / CELL)
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const k = this.key(ix, iz)
        let list = this.grid.get(k)
        if (!list) this.grid.set(k, (list = []))
        list.push(id)
      }
    }
    return id
  }

  /** Calls fn once for every shape whose cell touches the box around (x, z) of half-size `reach`. */
  near(x: number, z: number, reach: number, fn: (s: Shape) => void) {
    if (this.seen.length < this.shapes.length) this.seen = new Uint32Array(this.shapes.length * 2)
    const st = ++this.stamp
    const x0 = Math.floor((x - reach) / CELL)
    const x1 = Math.floor((x + reach) / CELL)
    const z0 = Math.floor((z - reach) / CELL)
    const z1 = Math.floor((z + reach) / CELL)
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const list = this.grid.get(this.key(ix, iz))
        if (!list) continue
        for (const id of list) {
          if (this.seen[id] === st) continue
          this.seen[id] = st
          fn(this.shapes[id])
        }
      }
    }
  }

  /**
   * Pushes an upright capsule (feet at pos.y, given radius and height) out of every trunk and rock it
   * overlaps, along the ground plane. Returns true when it moved.
   */
  pushOut(pos: { x: number; y: number; z: number }, radius: number, height: number): boolean {
    let moved = false
    // every shape is listed in each cell its footprint touches, so the capsule's own box is enough
    for (let pass = 0; pass < 2; pass++) {
      this.near(pos.x, pos.z, radius + 0.01, (s) => {
        if (s.camOnly) return
        let rr: number
        if (s.kind === CYL) {
          if (pos.y > s.y + s.h || pos.y + height < s.y) return
          rr = s.r
        } else {
          // the sphere's slice at the capsule point closest to its centre
          const yc = Math.min(pos.y + height, Math.max(pos.y, s.y))
          const dy = s.y - yc
          if (Math.abs(dy) >= s.r) return
          rr = Math.sqrt(s.r * s.r - dy * dy)
        }
        const dx = pos.x - s.x
        const dz = pos.z - s.z
        const min = rr + radius
        const d2 = dx * dx + dz * dz
        if (d2 >= min * min) return
        const d = Math.sqrt(d2) || 1e-4
        const push = min - d
        pos.x += (dx / d) * push
        pos.z += (dz / d) * push
        moved = true
      })
    }
    return moved
  }

