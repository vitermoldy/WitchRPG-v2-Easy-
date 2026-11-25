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
