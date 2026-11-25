"""Shot scenes of the previz: hero camera, valley, lineup, Minotaur fight, Hydra, rising army, creature board."""
import math
import os

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Vector

import pv_common as C
import pv_creatures as K
import pv_world as Wd
from pv_common import HEX, V

# Camera numbers. vfov is the vertical field of view, the way Three.js PerspectiveCamera.fov counts it.
CAM = {
    "prompt": dict(dist=3.4, shoulder=0.85, height=1.65, vfov=68.0, pitch=-8.0),
    "normal": dict(dist=3.4, shoulder=0.8, height=1.6, vfov=50.0, pitch=-6.0),
    "aim": dict(dist=2.0, shoulder=0.65, height=1.6, vfov=40.0, pitch=-4.0),
}
CAM_FINAL_OVER = {}

_ACTORS = None


def actors_coll():
    global _ACTORS
    if _ACTORS is None or _ACTORS.name not in bpy.data.collections:
        _ACTORS = C.collection("Aktor", bpy.data.scenes["Pustaka"].collection)
    return _ACTORS


def actor(name, key, pose=None, kind=None, lights=True):
    coll = C.collection(name, actors_coll())
    r = K.build(key, coll, kind=kind, pose=pose, lights=lights) if key == "ilyra" else K.build(key, coll, kind=kind, pose=pose)
    K.ground_rig(r)
    return r


def yaw_to(f):
    return math.degrees(math.atan2(f[0], -f[1]))


def place(r, coll, x, y, face, dz=0.0, scale=1.0, tilt=0.0, name=None):
    z = Wd.ground_z(x, y) + dz
    return C.instance(r.coll, coll, loc=(x, y, z), rot=(tilt, 0, yaw_to(face)), scale=scale, name=name)


def frame_of(p, f):
    """Point helper in a frame: forward f, right = f x up."""
    f = Vector((f[0], f[1], 0)).normalized()
    right = f.cross(Vector((0, 0, 1)))
    return lambda fw, rt: Vector((p[0], p[1], 0)) + f * fw + right * rt


def shot_scene(name, dunia, world, sun_travel, sun_color="#fff1dc", sun_energy=4.0, res=(1920, 1080), vol_end=500.0, exposure=0.0, samples=64, look="AgX - Punchy", vol_tile="4"):
    sc = C.new_scene(name)
    sc.collection.children.link(dunia)
    sc.world = world
    s = C.sun(sc, f"matahari.{name}", (0, 0, 0), sun_color, sun_energy, angle=1.2)
    s.rotation_euler = Vector(sun_travel).normalized().to_track_quat("-Z", "Y").to_euler()
    C.render_settings(sc, res=res, samples=samples, vol_end=vol_end, vol_tile=vol_tile, vol_samples=64, exposure=exposure, look=look)
    local = C.collection(f"{name}.lokal", sc.collection)
    return sc, local


def sun_dir(f, left_deg, elev_deg):
    """Direction towards the sun: the facing f turned left by left_deg, raised by elev_deg."""
    a = math.atan2(f[1], f[0]) + math.radians(left_deg)
    e = math.radians(elev_deg)
    return Vector((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e)))


def place_game_camera(sc, P, f, mode="normal", name="kamera", **over):
    c = dict(CAM[mode])
    c.update(over)
    z = Wd.ground_z(P[0], P[1])
    loc, look = C.game_camera((P[0], P[1], z), f, c["dist"], c["shoulder"], c["height"], c["pitch"])
    cam = C.camera(sc, name, loc, look_at=loc + look, lens_vfov=c["vfov"], clip=(0.05, 3000))
    return cam


def lock_on(cam, target, third=(1 / 3, 1 / 3)):
    """Turn the camera so the target sits on the upper-right third point of the frame."""
    cd = cam.data
    sc_aspect = 16 / 9
    tv = math.tan(cd.angle_y / 2)
    th = tv * sc_aspect
    d = (V(target) - cam.location)
    yaw_t = math.atan2(d.y, d.x)
    pitch_t = math.atan2(d.z, math.hypot(d.x, d.y))
    ah = math.atan(third[0] * th)
    av = math.atan(third[1] * tv)
    yaw_c = yaw_t + ah
    pitch_c = pitch_t - av
    look = Vector((math.cos(yaw_c) * math.cos(pitch_c), math.sin(yaw_c) * math.cos(pitch_c), math.sin(pitch_c)))
    cam.rotation_euler = look.to_track_quat("-Z", "Y").to_euler()


def cam_label(cam, body, size=0.035, corner=(-0.95, 0.88)):
    """Text pinned to the camera's view, top-left by default (sizes are a share of frame height)."""
    d = 0.4
    hh = d * math.tan(cam.data.angle_y / 2)
    hw = hh * 16 / 9
    ob = C.text(cam.users_collection[0], body, (0, 0, 0), size=size * 2 * hh, color="#f4efe9", strength=1.2, rot=(0, 0, 0), name=f"label.{cam.name}")
    ob.parent = cam
    ob.location = (corner[0] * hw, corner[1] * hh, -d)
    return ob


def disc(coll, name, centre, radius, mat, z_off=0.03, seg=40):
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, segments=seg, radius=radius)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    ob.location = (centre[0], centre[1], Wd.ground_z(centre[0], centre[1]) + z_off)
    coll.objects.link(ob)
    return ob


def mat_ring(name, color, strength, inner=0.82, alpha=0.9, fill=0.08):
    """Glowing ring with a faint fill, drawn on a disc with radial UVs from object coordinates."""
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    m.surface_render_method = "BLENDED"
    nt = m.node_tree
    nt.nodes.clear()
    N, L = nt.nodes, nt.links
    out = N.new("ShaderNodeOutputMaterial")
    tc = N.new("ShaderNodeTexCoord")
    ln = N.new("ShaderNodeVectorMath")
    ln.operation = "LENGTH"
    L.new(tc.outputs["Generated"], ln.inputs[0])
    sub = N.new("ShaderNodeVectorMath")
    sub.operation = "SUBTRACT"
    sub.inputs[1].default_value = (0.5, 0.5, 0.5)
    L.new(tc.outputs["Generated"], sub.inputs[0])
    sep = N.new("ShaderNodeSeparateXYZ")
    L.new(sub.outputs[0], sep.inputs[0])
    cx = N.new("ShaderNodeCombineXYZ")
    L.new(sep.outputs["X"], cx.inputs["X"])
    L.new(sep.outputs["Y"], cx.inputs["Y"])
    ln2 = N.new("ShaderNodeVectorMath")
    ln2.operation = "LENGTH"
    L.new(cx.outputs[0], ln2.inputs[0])
    rr = N.new("ShaderNodeMath")
    rr.operation = "MULTIPLY"
    rr.inputs[1].default_value = 2.0
    L.new(ln2.outputs["Value"], rr.inputs[0])
    ramp = N.new("ShaderNodeValToRGB")
    cr = ramp.color_ramp
    cr.elements[0].position = 0.0
    cr.elements[0].color = (fill, fill, fill, 1)
    cr.elements[1].position = inner
    cr.elements[1].color = (fill * 1.5, fill * 1.5, fill * 1.5, 1)
    e = cr.elements.new(min(0.99, inner + (1 - inner) * 0.55))
    e.color = (1, 1, 1, 1)
    e2 = cr.elements.new(0.999)
    e2.color = (0, 0, 0, 1)
    L.new(rr.outputs[0], ramp.inputs["Fac"])
    em = N.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = C.rgb(color)
    sm = N.new("ShaderNodeMath")
    sm.operation = "MULTIPLY"
    sm.inputs[1].default_value = strength
    L.new(ramp.outputs["Color"], sm.inputs[0])
    L.new(sm.outputs[0], em.inputs["Strength"])
    tr = N.new("ShaderNodeBsdfTransparent")
    mix = N.new("ShaderNodeMixShader")
    al = N.new("ShaderNodeMath")
    al.operation = "MULTIPLY"
    al.inputs[1].default_value = alpha
    L.new(ramp.outputs["Color"], al.inputs[0])
    L.new(al.outputs[0], mix.inputs["Fac"])
    L.new(tr.outputs[0], mix.inputs[1])
    L.new(em.outputs[0], mix.inputs[2])
    L.new(mix.outputs[0], out.inputs["Surface"])
    return m


# ---------------------------------------------------------------- 01 hero and camera variants

def hero_layout():
    P = Wd.SPOTS["hero"]
    f = Vector((0.86, 0.5, 0)).normalized()
    return P, f


def build_hero(dunia, name="01-hero-bahu", mode="normal", cam_over=None, res=(1920, 1080), samples=64):
    P, f = hero_layout()
    sd = sun_dir(f, 50, 22)
    world = C.sky_world("langit_pagi", "#47689a", "#f0d8b8", "#2a2a26", 0.55, sun_dir=sd, sun_glow="#ffe2b0", glow_power=24)
    sc, local = shot_scene(name, dunia, world, -sd, "#ffe9cc", 7.0, res=res, vol_end=300, samples=samples, exposure=0.1)
    il = actor("aktor.ilyra.hero", "ilyra", "idle")
    place(il, local, P[0], P[1], f)
    imp = actor("aktor.imp", "imp")
    fr = frame_of(P, f)
    spots = [(6.5, -2.4, 0, 0), (8.2, 1.6, 0, 0), (9.6, -0.6, 0.9, -22), (11.0, 3.6, 0, 0), (12.2, -4.0, 0, 0), (13.8, 0.9, 0, 0), (9.2, 5.2, 0, 0), (15.5, -2.2, 0, 0)]
    rng = np.random.default_rng(2)
    for i, (fw, rt, dz, tilt) in enumerate(spots):
        p = fr(fw, rt)
        face = (Vector((P[0], P[1], 0)) - p).normalized()
        face = Vector((face.x + rng.normal(0, 0.15), face.y + rng.normal(0, 0.15), 0)).normalized()
        place(imp, local, p.x, p.y, face, dz=dz, tilt=tilt, scale=rng.uniform(0.92, 1.08), name=f"imp.{i}")
    shaft_fog(local, P, 70, Wd.ground_z(P[0], P[1]))
    c = dict(cam_over or {})
    cam = place_game_camera(sc, P, f, mode, name=f"kamera.{name}", **c)
    return sc, cam


def shaft_fog(coll, centre, size, z0, density=0.018):
    """Unlit local haze around a clearing: the canopy shadows cut it into shafts of light."""
    name = "kabut_berkas"
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        nt = m.node_tree
        nt.nodes.clear()
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        vol = nt.nodes.new("ShaderNodeVolumePrincipled")
        vol.inputs["Color"].default_value = C.rgb("#f2ede4")
        vol.inputs["Density"].default_value = density
        vol.inputs["Anisotropy"].default_value = 0.7
        nt.links.new(vol.outputs[0], out.inputs["Volume"])
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    ob.scale = (size, size, 26)
    ob.location = (centre[0], centre[1], z0 + 12)
    ob.display_type = "WIRE"
    coll.objects.link(ob)
    return ob


VARIANTS = [
    ("A", "Angka awal prompt: vFOV 68, jarak 3,4 m, tinggi 1,65 m", "prompt", {}),
    ("B", "FOV 68 dibaca horizontal: vFOV 41,6", "prompt", {"vfov": 41.6}),
    ("C", "Angka akhir: vFOV 50, jarak 3,4 m, bahu 0,8 m, tinggi 1,6 m", "normal", {}),
    ("D", "Mode bidik: vFOV 40, jarak 2,0 m, bahu 0,65 m", "aim", {}),
]


def build_variants(dunia):
    out = []
    for key, label, mode, over in VARIANTS:
        sc, cam = build_hero(dunia, name=f"00-varian-{key}", mode=mode, cam_over=over, res=(960, 540), samples=32)
        cam_label(cam, f"{key}  {label}", size=0.045)
        out.append(sc)
    return out


# ---------------------------------------------------------------- 02 valley

def build_valley(dunia):
    sd = Vector((0.75, -0.42, 0.5)).normalized()
    world = C.sky_world("langit_lembah", "#3d659c", "#e6e2da", "#30302c", 1.1, sun_dir=sd, sun_glow="#fff0d0", glow_power=30)
    sc, local = shot_scene("02-lembah-hutan", dunia, world, -sd, "#fff0dc", 4.2, vol_end=2200, vol_tile="8", exposure=0.1)
    loc = Vector((260, -720, 470))
    target = Vector((-80, 140, 0))
