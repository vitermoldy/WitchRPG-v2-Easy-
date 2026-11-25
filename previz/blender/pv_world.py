"""The forest valley: terrain, five zones with their own fog, water, instanced forest and set pieces.
X is east, Y is north, metres. The playable map is 1000 x 1000 m inside a ring of mountains."""
import math

import bmesh
import bpy
import numpy as np
from mathutils import Vector

import pv_common as C

# zone: name, tier, centre, radius, fog colour, fog density at the ground, fog height scale, ground colour
ZONES = [
    dict(key="pembuka", name="Hutan Pembuka", tier="I", lv="1-3", c=(0, -280), r=230, fog="#cddbea", dens=0.014, hs=10, ground="#2a3322"),
    dict(key="tebing", name="Tebing Berangin", tier="II", lv="4-6", c=(320, -40), r=190, fog="#e9c79c", dens=0.006, hs=30, ground="#5b5141"),
    dict(key="rawa", name="Rawa Berkabut", tier="III", lv="7-9", c=(-300, 40), r=200, fog="#a9c491", dens=0.03, hs=9, ground="#283224"),
    dict(key="kuil", name="Reruntuhan Kuil", tier="IV", lv="10-12", c=(40, 330), r=170, fog="#8f9096", dens=0.02, hs=14, ground="#373a33"),
    dict(key="bara", name="Lembah Bara", tier="V", lv="13-15", c=(330, 330), r=165, fog="#d8622c", dens=0.018, hs=28, ground="#1d1917"),
]
LAKE = dict(c=(-330, 300), r=95)
# Danau Hitam belongs to the swamp but keeps its own low fog over the black water
LAKE_FOG = dict(key="danau", name="Danau Hitam", c=LAKE["c"], r=120, fog="#a3b996", dens=0.012, hs=5, glow=0.15)
_U = (0.673, -0.740)
HYDRA_POS = (LAKE["c"][0] + _U[0] * 82, LAKE["c"][1] + _U[1] * 82)
ALTAR = (-10, -395)
TEMPLE = (40, 318)
PATHS = [
    [(-10, -395), (-25, -330), (0, -230), (20, -120), (30, 0), (45, 120), (40, 250)],
    [(20, -120), (-90, -80), (-190, -20), (-260, 90), (-290, 200)],
    [(30, 0), (140, -20), (230, -40)],
    [(45, 120), (180, 200), (280, 290)],
]
SPOTS = {
    "hero": (-34, -335),
    "minotaur": (40, 282),
    "hydra": (-330 + 0.673 * 100, 300 - 0.740 * 100),
    "army": (128, -258),
}
CLEARINGS = [(SPOTS["hero"], 22), (SPOTS["army"], 16), (ALTAR, 16), (TEMPLE, 30), (SPOTS["minotaur"], 18), (SPOTS["hydra"], 20)]

# ---------------------------------------------------------------- noise and height

_rng = np.random.default_rng(20261124)
_LAT = _rng.random((256, 256)) * 2 - 1


def vnoise(x, y):
    xi = np.floor(x).astype(np.int64)
    yi = np.floor(y).astype(np.int64)
    fx, fy = x - xi, y - yi
    u = fx * fx * (3 - 2 * fx)
    v = fy * fy * (3 - 2 * fy)
    x0, y0 = xi & 255, yi & 255
    x1, y1 = (x0 + 1) & 255, (y0 + 1) & 255
    a, b, c, d = _LAT[x0, y0], _LAT[x1, y0], _LAT[x0, y1], _LAT[x1, y1]
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v


def fbm(x, y, octaves=4, seed=0.0):
    s, amp, f, norm = 0.0, 1.0, 1.0, 0.0
    for k in range(octaves):
        s = s + amp * vnoise(x * f + 37.1 * k + seed, y * f - 11.7 * k + seed)
        norm += amp
        amp *= 0.5
        f *= 2.0
    return s / norm


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def _dist(x, y, c):
    return np.hypot(x - c[0], y - c[1])


def height(x, y):
    x = np.asarray(x, dtype=np.float64)
    y = np.asarray(y, dtype=np.float64)
    h = 3.0 + 4.0 * fbm(x / 160, y / 160) + 1.3 * fbm(x / 45, y / 45, 3, 5.0)
    # Tebing Berangin: a raised plateau with a broken cliff edge
    t = ZONES[1]
    edge = t["r"] * 0.8 + 18 * fbm(x / 40, y / 40, 3, 9.0)
    plateau = smooth(edge + 14, edge - 6, _dist(x, y, t["c"]))
    h = h + plateau * (36 + 6 * fbm(x / 60, y / 60, 3, 2.0))
    # Reruntuhan Kuil: a gentle rise with a flat temple court
    k = ZONES[3]
    h = h + 12 * smooth(k["r"] * 1.1, k["r"] * 0.5, _dist(x, y, k["c"]))
    court = smooth(36, 26, _dist(x, y, TEMPLE))
    h = h * (1 - court) + court * (3.0 + 12 + 0.2)
    # Rawa Berkabut: flattened to the water line, with pools
    r = ZONES[2]
    swamp = smooth(r["r"] * 1.15, r["r"] * 0.75, _dist(x, y, r["c"]))
    swamp_h = 0.35 + 0.9 * fbm(x / 28, y / 28, 3, 3.0)
    h = h * (1 - swamp) + swamp * swamp_h
    # Danau Hitam
    lake = smooth(LAKE["r"] * 1.05, LAKE["r"] * 0.85, _dist(x, y, LAKE["c"]))
    h = h * (1 - lake) + lake * (-7.0)
    # Lembah Bara: a burnt bowl with a rim
    b = ZONES[4]
    db = _dist(x, y, b["c"])
    h = h - 7 * smooth(b["r"] * 0.9, b["r"] * 0.2, db) + 6 * smooth(b["r"] * 0.7, b["r"] * 1.0, db) * smooth(b["r"] * 1.4, b["r"] * 1.0, db)
    # mountain ring closing the valley
    ring = smooth(440, 600, np.maximum(np.abs(x), np.abs(y)) + 30 * fbm(x / 120, y / 120, 3, 4.0))
    h = h + ring * (110 + 70 * fbm(x / 90, y / 90, 4, 8.0))
    return h


def ground_z(x, y):
    return float(height(np.array([x]), np.array([y]))[0])


def zone_weights(x, y):
    W = []
    for z in ZONES:
        d = _dist(x, y, z["c"]) / z["r"]
        W.append(np.exp(-3.0 * d * d))
    W = np.array(W)
    return W / np.maximum(W.sum(axis=0), 1e-9)


def path_dist(x, y):
    best = np.full(np.shape(x), 1e9)
    for line in PATHS:
        for a, b in zip(line, line[1:]):
            ax, ay = a
            bx, by = b
            dx, dy = bx - ax, by - ay
            L2 = dx * dx + dy * dy
            t = np.clip(((x - ax) * dx + (y - ay) * dy) / L2, 0, 1)
            best = np.minimum(best, np.hypot(x - (ax + t * dx), y - (ay + t * dy)))
    return best


# ---------------------------------------------------------------- terrain and water

def _hex(h):
    return np.array(C.rgb(h)[:3])


def build_terrain(coll, size=1300.0, step=2.5):
    n = int(size / step) + 1
    xs = np.linspace(-size / 2, size / 2, n)
    X, Y = np.meshgrid(xs, xs, indexing="xy")
    Z = height(X, Y)
    gx = np.gradient(Z, step, axis=1)
    gy = np.gradient(Z, step, axis=0)
    slope = np.hypot(gx, gy)
    W = zone_weights(X, Y)
    col = np.zeros(X.shape + (3,))
    for i, z in enumerate(ZONES):
        col += W[i][..., None] * _hex(z["ground"])[None, None, :]
    rock = smooth(0.45, 0.9, slope)[..., None]
    col = col * (1 - rock) + rock * _hex("#4a4642")
    mud = smooth(0.9, 0.2, Z)[..., None] * smooth(-3, 0, Z)[..., None]
    col = col * (1 - 0.6 * mud) + 0.6 * mud * _hex("#1a1d14")
    snow = smooth(150, 190, Z)[..., None]
    col = col * (1 - snow) + snow * _hex("#c9ced6")
    pd = path_dist(X, Y)
    pth = smooth(3.2, 1.2, pd)[..., None] * (1 - smooth(0.3, 0.6, slope))[..., None]
    col = col * (1 - 0.7 * pth) + 0.7 * pth * _hex("#4a3b2c")
    vari = (0.82 + 0.3 * (fbm(X / 6, Y / 6, 3, 12.0) * 0.5 + 0.5))[..., None]
    col = np.clip(col * vari, 0, 1)
    me = bpy.data.meshes.new("terrain")
    verts = np.stack([X.ravel(), Y.ravel(), Z.ravel()], axis=1).astype(np.float32)
    me.vertices.add(len(verts))
    me.vertices.foreach_set("co", verts.ravel())
    ii, jj = np.meshgrid(np.arange(n - 1), np.arange(n - 1), indexing="xy")
    a = (jj * n + ii).ravel()
    quads = np.stack([a, a + 1, a + n + 1, a + n], axis=1).astype(np.int32)
    me.loops.add(len(quads) * 4)
    me.loops.foreach_set("vertex_index", quads.ravel())
    me.polygons.add(len(quads))
    me.polygons.foreach_set("loop_start", (np.arange(len(quads)) * 4).astype(np.int32))
    me.polygons.foreach_set("loop_total", np.full(len(quads), 4, np.int32))
    me.update(calc_edges=True)
    me.validate()
    ca = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    rgba = np.concatenate([col.reshape(-1, 3), np.ones((n * n, 1))], axis=1).astype(np.float32)
    ca.data.foreach_set("color", rgba.ravel())
    ba = me.attributes.new("bara", "FLOAT", "POINT")
    ba.data.foreach_set("value", W[4].ravel().astype(np.float32))
    me.shade_smooth()
    me.materials.append(terrain_material())
    ob = bpy.data.objects.new("terrain", me)
    coll.objects.link(ob)
    return ob


def terrain_material():
    m = bpy.data.materials.get("terrain") or bpy.data.materials.new("terrain")
    m.use_nodes = True
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    b = N["Principled BSDF"]
    att = N.new("ShaderNodeAttribute")
    att.attribute_name = "Col"
    b.inputs["Roughness"].default_value = 0.95
    L.new(att.outputs["Color"], b.inputs["Base Color"])
    # embers glowing in the burnt valley floor
    bara = N.new("ShaderNodeAttribute")
    bara.attribute_name = "bara"
    tc = N.new("ShaderNodeTexCoord")
    noi = N.new("ShaderNodeTexNoise")
    noi.inputs["Scale"].default_value = 0.6
    noi.inputs["Detail"].default_value = 4.0
    L.new(tc.outputs["Object"], noi.inputs["Vector"])
    mr = N.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = 0.66
