"""Shared helpers for the WitchRPG v2 previz: palette, materials, mesh primitives, named-part rigs,
cameras and render settings. Coordinates are metres, Z up, creatures face -Y (glTF +Z forward)."""
import math

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

ROOT = r"C:\MyRepo\WitchRPG-v2"
PREVIZ = ROOT + r"\previz"
ASSETS = ROOT + r"\assets"
FONT_PATH = r"C:\Windows\Fonts\bahnschrift.ttf"

# Colours from v1 (src/engine/palette.ts) plus the v2 zone fogs.
HEX = {
    "chaos": "#ff2a3d",
    "chaos_hot": "#ff7a5c",
    "umbra": "#8f55ff",
    "umbra_hot": "#c7a6ff",
    "umbra_deep": "#2c1052",
    "rift": "#ffa53d",
    "bone": "#efe6df",
    "ash": "#5d5557",
    "skin": "#d9cdc7",
    "cloth": "#161013",
}


def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgb(h, a=1.0):
    h = h.lstrip("#")
    return (srgb_to_lin(int(h[0:2], 16) / 255), srgb_to_lin(int(h[2:4], 16) / 255), srgb_to_lin(int(h[4:6], 16) / 255), a)


# ---------------------------------------------------------------- materials

_MATS = {}


def _new_mat(name):
    m = bpy.data.materials.get(name)
    if m:
        bpy.data.materials.remove(m)
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m


def mat_flat(name, color, rough=0.8, metal=0.0, emit=None, emit_strength=0.0):
    if name in _MATS:
        return _MATS[name]
    m = _new_mat(name)
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = rgb(color)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = rgb(emit)
        b.inputs["Emission Strength"].default_value = emit_strength
    m.diffuse_color = rgb(color)
    _MATS[name] = m
    return m


def mat_emit(name, color, strength=8.0):
    if name in _MATS:
        return _MATS[name]
    m = _new_mat(name)
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = rgb(color)
    e.inputs["Strength"].default_value = strength
    nt.links.new(e.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    m.diffuse_color = rgb(color)
    _MATS[name] = m
    return m


def mat_cracked(name, color, crack, strength=5.0, scale=2.2, rough=0.75, coverage=0.5, width=0.035):
    """Dark body with glowing cracks: Voronoi edges masked by noise so the cracks come in patches."""
    if name in _MATS:
        return _MATS[name]
    m = _new_mat(name)
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    b = N["Principled BSDF"]
    b.inputs["Base Color"].default_value = rgb(color)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Emission Color"].default_value = rgb(crack)
    # a soft sheen lets rim light trace dark silhouettes against dark forest
    b.inputs["Sheen Weight"].default_value = 0.6
    b.inputs["Sheen Roughness"].default_value = 0.35
    b.inputs["Sheen Tint"].default_value = (0.75, 0.72, 0.8, 1.0)
    tc = N.new("ShaderNodeTexCoord")
    vor = N.new("ShaderNodeTexVoronoi")
    vor.feature = "DISTANCE_TO_EDGE"
    vor.inputs["Scale"].default_value = scale
    L.new(tc.outputs["Object"], vor.inputs["Vector"])
    edge = N.new("ShaderNodeMapRange")
    edge.inputs["From Min"].default_value = 0.0
    edge.inputs["From Max"].default_value = width
    edge.inputs["To Min"].default_value = 1.0
    edge.inputs["To Max"].default_value = 0.0
    L.new(vor.outputs["Distance"], edge.inputs["Value"])
    noi = N.new("ShaderNodeTexNoise")
    noi.inputs["Scale"].default_value = 0.9
    noi.inputs["Detail"].default_value = 2.0
    L.new(tc.outputs["Object"], noi.inputs["Vector"])
    mask = N.new("ShaderNodeMapRange")
    mask.inputs["From Min"].default_value = 1.0 - coverage
    mask.inputs["From Max"].default_value = 1.0 - coverage + 0.12
    L.new(noi.outputs["Fac"], mask.inputs["Value"])
    mul = N.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    L.new(edge.outputs["Result"], mul.inputs[0])
    L.new(mask.outputs["Result"], mul.inputs[1])
    mul2 = N.new("ShaderNodeMath")
    mul2.operation = "MULTIPLY"
    mul2.inputs[1].default_value = strength
    L.new(mul.outputs[0], mul2.inputs[0])
    L.new(mul2.outputs[0], b.inputs["Emission Strength"])
    m.diffuse_color = rgb(color)
    _MATS[name] = m
    return m


def mat_tone(name, top, bottom=None, rough=0.7, metal=0.0, emit=None, emit_strength=0.0, vary=0.12):
    """Flat colour that shifts from `top` (facing up) to `bottom` (facing down), with a little noise
    so large areas do not look like plastic. Gives backs and bellies, manes and muzzles their own tone."""
    if name in _MATS:
        return _MATS[name]
    m = _new_mat(name)
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    b = N["Principled BSDF"]
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Sheen Weight"].default_value = 0.25
    geo = N.new("ShaderNodeNewGeometry")
    sep = N.new("ShaderNodeSeparateXYZ")
    L.new(geo.outputs["Normal"], sep.inputs[0])
    mr = N.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = -0.45
    mr.inputs["From Max"].default_value = 0.35
    L.new(sep.outputs["Z"], mr.inputs["Value"])
    mix = N.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["A"].default_value = rgb(bottom or top)
    mix.inputs["B"].default_value = rgb(top)
    L.new(mr.outputs["Result"], mix.inputs["Factor"])
    tc = N.new("ShaderNodeTexCoord")
    noi = N.new("ShaderNodeTexNoise")
    noi.inputs["Scale"].default_value = 4.0
    L.new(tc.outputs["Object"], noi.inputs["Vector"])
    vr = N.new("ShaderNodeMapRange")
    vr.inputs["To Min"].default_value = 1.0 - vary
    vr.inputs["To Max"].default_value = 1.0 + vary * 0.5
    L.new(noi.outputs["Fac"], vr.inputs["Value"])
    hsv = N.new("ShaderNodeHueSaturation")
    L.new(mix.outputs["Result"], hsv.inputs["Color"])
    L.new(vr.outputs["Result"], hsv.inputs["Value"])
    L.new(hsv.outputs["Color"], b.inputs["Base Color"])
    if emit:
        b.inputs["Emission Color"].default_value = rgb(emit)
        b.inputs["Emission Strength"].default_value = emit_strength
    m.diffuse_color = rgb(top)
    _MATS[name] = m
    return m


def mat_globe(name, ocean="#2a6aa8", land="#4f8a3a"):
    """Blue-green world sphere (Atlas): land and sea from noise."""
    if name in _MATS:
        return _MATS[name]
    m = _new_mat(name)
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    b = N["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.45
    tc = N.new("ShaderNodeTexCoord")
    noi = N.new("ShaderNodeTexNoise")
    noi.inputs["Scale"].default_value = 0.9
    noi.inputs["Detail"].default_value = 5.0
    L.new(tc.outputs["Object"], noi.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB")
    cr = ramp.color_ramp
    cr.interpolation = "CONSTANT"
    cr.elements[0].color = rgb(ocean)
    cr.elements[1].position = 0.52
    cr.elements[1].color = rgb(land)
    L.new(noi.outputs["Fac"], ramp.inputs["Fac"])
    L.new(ramp.outputs["Color"], b.inputs["Base Color"])
    _MATS[name] = m
    return m


# Slots every builder may ask for. A creature's colour spec fills them; unknown extra keys in a spec
# (snake, goat, collar, ...) become materials too.
SLOT_DEFAULTS = {
    "body": "#8a7a6a", "body2": None, "skin": None, "hair": None, "horn": "#ddd2bc", "metal": "#b9bcc4",
    "gold": "#d2a442", "cloth": "#5a4632", "wood": "#6a4628", "membrane": None, "accent": None,
}


class Pal(dict):
    """Material set; a slot nobody coloured falls back to the body material."""

    def __missing__(self, k):
        return dict.__getitem__(self, "body")


def palette_ref(key, spec):
    """Materials for one creature from its colour spec. Values are a hex colour, or (top, bottom)."""
    spec = dict(spec)
    veins = spec.pop("veins", None)
    eye = spec.pop("eye", HEX["rift"])
    glow = spec.pop("glow", HEX["rift"])
    emissive = spec.pop("emissive", {})
    pal = Pal()

    def tone(slot, v):
        top, bottom = (v if isinstance(v, tuple) else (v, None))
        rough = 0.35 if slot in ("metal", "gold") else 0.75
        metal = 0.85 if slot in ("metal", "gold") else 0.0
        e = emissive.get(slot)
        return mat_tone(f"{key}.{slot}", top, bottom, rough=rough, metal=metal, emit=e[0] if e else None, emit_strength=e[1] if e else 0.0)

    vals = {}
    for slot, default in SLOT_DEFAULTS.items():
        vals[slot] = spec.get(slot, default)
    vals["body2"] = vals["body2"] or vals["body"]
    vals["skin"] = vals["skin"] or vals["body"]
    vals["hair"] = vals["hair"] or vals["body2"]
    vals["membrane"] = vals["membrane"] or vals["body2"]
    vals["accent"] = vals["accent"] or vals["membrane"]
    for slot, v in list(vals.items()) + [(k, v) for k, v in spec.items() if k not in vals]:
        pal[slot] = tone(slot, v)
    if veins:
        top = vals["body"][0] if isinstance(vals["body"], tuple) else vals["body"]
        pal["body"] = mat_cracked(f"{key}.body_veins", top, veins, 6.0, scale=2.4, coverage=0.6)
    pal["eye"] = mat_emit(f"{key}.eye", eye, 22.0)
    pal["glow"] = mat_emit(f"{key}.glow", glow, 7.0)
    return pal


def palette(kind, body="#1f1a1c", body2=None, horn="#4a3f38", tag=""):
    """Violet material set for raised shadows: same models as the creatures, Umbra colours."""
    sh = Pal({
        "body": mat_cracked("body_shadow", "#140b22", HEX["umbra"], 6.0, coverage=0.55),
        "body2": mat_cracked("body2_shadow", "#1b0f2e", HEX["umbra"], 4.0, coverage=0.4),
        "horn": mat_flat("horn_shadow", "#2a1846", 0.5),
        "eye": mat_emit("eye_umbra", HEX["umbra_hot"], 30.0),
        "glow": mat_emit("glow_umbra", HEX["umbra"], 8.0),
        "metal": mat_flat("metal_shadow", "#231536", 0.4, 0.6),
        "cloth": mat_flat("cloth_shadow", "#150c22", 0.9),
        "wood": mat_flat("wood_shadow", "#1d1030", 0.85),
        "membrane": mat_cracked("membrane_shadow", "#2a1846", HEX["umbra"], 3.0, coverage=0.35),
    })
    for k in ("skin", "hair", "gold", "accent", "snake", "goat", "collar", "globe"):
        sh[k] = sh["body2"] if k in ("hair", "accent", "snake") else sh["body"] if k in ("skin", "goat", "globe") else sh["metal"]
    return sh


# ---------------------------------------------------------------- geometry

def V(p):
    return Vector(p) if not isinstance(p, Vector) else p.copy()


def rot_to(d):
    """Rotation matrix taking +Z onto direction d."""
    return d.normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()


def _faces_of(verts):
    fs = set()
    for v in verts:
        for f in v.link_faces:
            fs.add(f)
    return fs


def catmull(pts, n):
    P = [V(p) for p in pts]
    if len(P) == 2:
        return [P[0].lerp(P[1], i / n) for i in range(n + 1)], [i / n for i in range(n + 1)]
    ext = [P[0] + (P[0] - P[1])] + P + [P[-1] + (P[-1] - P[-2])]
    out, ts = [], []
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
            ts.append((i - 1) + t)
    out.append(P[-1])
    ts.append(len(P) - 1)
    return out, ts


class Part:
    """Geometry of one named part, built in creature space and stored relative to its pivot."""

    def __init__(self, rig, name, pivot, parent):
        self.rig, self.name, self.pivot, self.parent = rig, name, V(pivot), parent
        self.bm = bmesh.new()
        self.mats = []
        self.flat = False

    def _mi(self, mat):
        m = self.rig.pal[mat] if isinstance(mat, str) else mat
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)

    def _tag(self, verts, mat, smooth=True):
        mi = self._mi(mat)
        for f in _faces_of(verts):
            f.material_index = mi
            f.smooth = smooth and not self.flat

    def _M(self, c):
        return Matrix.Translation(V(c) - self.pivot)

    def ell(self, c, r, rot=(0, 0, 0), mat="body", seg=12, rings=8, smooth=True):
        if isinstance(r, (int, float)):
            r = (r, r, r)
        R = Euler([math.radians(a) for a in rot]).to_matrix().to_4x4()
        M = self._M(c) @ R @ Matrix.Diagonal((r[0], r[1], r[2], 1))
        g = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=rings, radius=1.0, matrix=M)
        self._tag(g["verts"], mat, smooth)
        return self

    def limb(self, a, b, ra, rb=None, mat="body", seg=10, joints=True):
        a, b = V(a), V(b)
        rb = ra if rb is None else rb
        d = b - a
        if d.length < 1e-5:
            return self
        M = self._M((a + b) / 2) @ rot_to(d)
        g = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=seg, radius1=ra, radius2=rb, depth=d.length, matrix=M)
        self._tag(g["verts"], mat)
        if joints:
            self.ell(a, ra, mat=mat, seg=seg, rings=6)
            self.ell(b, rb, mat=mat, seg=seg, rings=6)
        return self

    def cone(self, base, tip, r, mat="horn", seg=8, r2=0.0, smooth=True):
        a, b = V(base), V(tip)
        d = b - a
        M = self._M((a + b) / 2) @ rot_to(d)
        g = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=True, segments=seg, radius1=r, radius2=r2, depth=d.length, matrix=M)
        self._tag(g["verts"], mat, smooth)
        return self

    def box(self, c, size, rot=(0, 0, 0), mat="body", smooth=False):
        R = Euler([math.radians(a) for a in rot]).to_matrix().to_4x4()
        M = self._M(c) @ R @ Matrix.Diagonal((size[0], size[1], size[2], 1))
        g = bmesh.ops.create_cube(self.bm, size=1.0, matrix=M)
        self._tag(g["verts"], mat, smooth)
        return self

    def tube(self, pts, radii, mat="body", seg=8, n=5, cap=True, squash=1.0, smooth=True):
        """Smooth sweep through control points; radius per control point (0 makes a point)."""
        P, ts = catmull(pts, n)
        if isinstance(radii, (int, float)):
            radii = [radii] * len(pts)
        R = []
        for t in ts:
            i = min(int(t), len(radii) - 2)
            f = t - i
            R.append(radii[i] * (1 - f) + radii[i + 1] * f)
        T = []
        for i in range(len(P)):
            a = P[max(i - 1, 0)]
            b = P[min(i + 1, len(P) - 1)]
            T.append((b - a).normalized())
        up = Vector((0, 0, 1)) if abs(T[0].z) < 0.95 else Vector((1, 0, 0))
        Nn = (up - T[0] * up.dot(T[0])).normalized()
        rings = []
        allv = []
        off = self.pivot
        for i, p in enumerate(P):
            Nn = (Nn - T[i] * Nn.dot(T[i]))
            if Nn.length < 1e-6:
                Nn = T[i].orthogonal()
            Nn.normalize()
            B = T[i].cross(Nn)
            if R[i] < 1e-4:
                v = self.bm.verts.new(p - off)
                rings.append([v])
                allv.append(v)
                continue
            ring = []
            for k in range(seg):
                a = 2 * math.pi * k / seg
                q = p + R[i] * (math.cos(a) * Nn + math.sin(a) * B * squash)
                ring.append(self.bm.verts.new(q - off))
            rings.append(ring)
            allv += ring
        for A, Bv in zip(rings, rings[1:]):
            if len(A) == 1 and len(Bv) == 1:
                continue
            if len(A) == 1:
                for k in range(seg):
                    self.bm.faces.new((A[0], Bv[(k + 1) % seg], Bv[k]))
            elif len(Bv) == 1:
                for k in range(seg):
                    self.bm.faces.new((A[k], A[(k + 1) % seg], Bv[0]))
            else:
                for k in range(seg):
                    self.bm.faces.new((A[k], A[(k + 1) % seg], Bv[(k + 1) % seg], Bv[k]))
        if cap:
            if len(rings[0]) > 2:
                self.bm.faces.new(list(reversed(rings[0])))
            if len(rings[-1]) > 2:
                self.bm.faces.new(rings[-1])
        self._tag(allv, mat, smooth)
        return self

    def poly(self, pts, mat="membrane", smooth=False):
        vs = [self.bm.verts.new(V(p) - self.pivot) for p in pts]
        f = self.bm.faces.new(vs)
        bmesh.ops.triangulate(self.bm, faces=[f], quad_method="BEAUTY", ngon_method="EAR_CLIP")
        self._tag(vs, mat, smooth)
        return self

    def torus(self, c, R, r, normal=(0, 0, 1), mat="metal", seg=20, rseg=6):
        n = V(normal).normalized()
        M = rot_to(n)
        pts = [V(c) + M.to_3x3() @ Vector((math.cos(2 * math.pi * k / seg) * R, math.sin(2 * math.pi * k / seg) * R, 0)) for k in range(seg + 1)]
        # closed sweep: overlap the first segment so the seam closes visually
        self.tube(pts, r, mat=mat, seg=rseg, n=2, cap=False)
        return self

    def rock(self, c, r, seed=0, mat="horn", sub=1):
        import random

        rnd = random.Random(seed)
        g = bmesh.ops.create_icosphere(self.bm, subdivisions=sub, radius=1.0, matrix=self._M(c) @ Matrix.Diagonal((r[0], r[1], r[2], 1)))
        for v in g["verts"]:
            v.co = (v.co - (V(c) - self.pivot)) * (0.8 + 0.35 * rnd.random()) + (V(c) - self.pivot)
        self._tag(g["verts"], mat, smooth=False)
        return self


class Rig:
    """A creature made of named parts parented in a hierarchy, each with its own pivot."""

    def __init__(self, key, pal, coll):
        self.key, self.pal, self.coll = key, pal, coll
        self.parts = {}
        self.order = []
        self.root = bpy.data.objects.new(f"{key}", None)
        self.root.empty_display_size = 0.3
        coll.objects.link(self.root)
        self.objs = {}

    def P(self, name, pivot=(0, 0, 0), parent=None):
        if name not in self.parts:
            self.parts[name] = Part(self, name, pivot, parent)
            self.order.append(name)
        return self.parts[name]

    def finalize(self):
        for name in self.order:
            p = self.parts[name]
            if not p.bm.verts:
                p.bm.free()
                continue
            bmesh.ops.recalc_face_normals(p.bm, faces=p.bm.faces[:])
            me = bpy.data.meshes.new(f"{self.key}.{name}")
            p.bm.to_mesh(me)
            p.bm.free()
            for m in p.mats:
                me.materials.append(m)
            ob = bpy.data.objects.new(f"{self.key}.{name}", me)
            self.coll.objects.link(ob)
            par = self.objs.get(p.parent) if p.parent else None
            parent_pivot = self.parts[p.parent].pivot if par else Vector()
            ob.parent = par or self.root
            ob.location = p.pivot - parent_pivot
            self.objs[name] = ob
        return self

    def rot(self, name, deg):
        ob = self.objs.get(name)
        if ob:
            ob.rotation_euler = Euler([math.radians(a) for a in deg])
        return ob


# ---------------------------------------------------------------- scene helpers

def collection(name, parent):
    """New collection linked under `parent` (a collection or a scene's master collection)."""
    c = bpy.data.collections.get(name)
    if c is None:
        c = bpy.data.collections.new(name)
        parent.children.link(c)
    return c


def new_scene(name):
