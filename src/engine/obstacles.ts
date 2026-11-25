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

  /**
   * Sweeps a sphere of radius `cr` from a to b. Returns the fraction of the way it travels before
   * touching a shape (1 when the path is clear, 0 when it starts inside one).
   */
  sweep(ax: number, ay: number, az: number, bx: number, by: number, bz: number, cr: number): number {
    const dx = bx - ax
    const dy = by - ay
    const dz = bz - az
    const len = Math.hypot(dx, dz)
    const mx = (ax + bx) / 2
    const mz = (az + bz) / 2
    let best = 1
    this.near(mx, mz, len / 2 + cr + 0.01, (s) => {
      const t = s.kind === CYL ? segCylinder(ax, ay, az, dx, dy, dz, s, cr) : segSphere(ax, ay, az, dx, dy, dz, s, cr)
      if (t < best) best = t
    })
    return Math.max(0, best)
  }

  /** Distance from a point to the nearest shape surface (negative inside one), looking within `reach`. */
  clearance(x: number, y: number, z: number, reach = 12): number {
    let best = reach
    this.near(x, z, reach, (s) => {
      let d: number
      if (s.kind === CYL) {
        // signed distances outside the side and outside the caps; both negative means inside
        const rad = Math.hypot(x - s.x, z - s.z) - s.r
        const top = s.y + s.h
        const vert = y < s.y ? s.y - y : y > top ? y - top : -Math.min(y - s.y, top - y)
        d = rad > 0 && vert > 0 ? Math.hypot(rad, vert) : Math.max(rad, vert)
      } else {
        d = Math.hypot(x - s.x, y - s.y, z - s.z) - s.r
      }
      if (d < best) best = d
    })
    return best
  }
}

/** First moment the segment is inside the cylinder: the overlap of its time inside the circle and inside the height band. */
function segCylinder(ax: number, ay: number, az: number, dx: number, dy: number, dz: number, s: Shape, cr: number): number {
  const R = s.r + cr
  const y0 = s.y - cr
  const y1 = s.y + s.h + cr
  const ox = ax - s.x
  const oz = az - s.z
  // time inside the circle (in the ground plane)
  let c0: number
  let c1: number
  const a = dx * dx + dz * dz
  const c = ox * ox + oz * oz - R * R
  if (a < 1e-12) {
    if (c > 0) return 1
    c0 = -Infinity
    c1 = Infinity
  } else {
    const b = 2 * (ox * dx + oz * dz)
    const disc = b * b - 4 * a * c
    if (disc < 0) return 1
    const sq = Math.sqrt(disc)
    c0 = (-b - sq) / (2 * a)
    c1 = (-b + sq) / (2 * a)
  }
  // time inside the height band
  let h0: number
  let h1: number
  if (Math.abs(dy) < 1e-12) {
    if (ay < y0 || ay > y1) return 1
    h0 = -Infinity
    h1 = Infinity
  } else {
    const ta = (y0 - ay) / dy
    const tb = (y1 - ay) / dy
    h0 = Math.min(ta, tb)
    h1 = Math.max(ta, tb)
  }
  const enter = Math.max(c0, h0)
  const exit = Math.min(c1, h1)
  if (enter > exit || exit < 0 || enter > 1) return 1
  return Math.max(0, enter)
}

function segSphere(ax: number, ay: number, az: number, dx: number, dy: number, dz: number, s: Shape, cr: number): number {
  const R = s.r + cr
  const ox = ax - s.x
  const oy = ay - s.y
  const oz = az - s.z
  const c = ox * ox + oy * oy + oz * oz - R * R
  if (c <= 0) return 0
  const a = dx * dx + dy * dy + dz * dz
  if (a < 1e-9) return 1
  const b = 2 * (ox * dx + oy * dy + oz * dz)
  const disc = b * b - 4 * a * c
  if (disc < 0) return 1
  const t = (-b - Math.sqrt(disc)) / (2 * a)
  return t >= 0 && t <= 1 ? t : 1
}
