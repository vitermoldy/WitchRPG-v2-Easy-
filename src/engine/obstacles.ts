/**
 * Static obstacles of the forest: tree trunks and crowns as vertical cylinders, rocks as spheres.
 * A grid index keeps each query to the shapes near one spot, so 15,000 trees cost the same as fifty.
 * World coordinates (three.js: y up, north is -z).
 */
export const CYL = 0
