"""Animatic, 26 s at 24 fps: fly over the valley, drop to Ilyra's shoulder, walk the shore of
Danau Hitam, lock on to a swamp naga, and the Hydra rises. Every frame is keyed from Python."""
import math

import bpy
import numpy as np
from mathutils import Quaternion, Vector

import pv_common as C
import pv_creatures as K
import pv_shots as S
import pv_world as Wd
from pv_common import HEX, V

FPS = 24
T_FLY, T_DROP, T_WALK, T_NAGA, T_END = 7.0, 10.5, 16.0, 19.0, 26.0
FRAMES = int(T_END * FPS)


def ease(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def seg(t, a, b):
    return ease((t - a) / (b - a))


def look_quat(d):
    return Vector(d).normalized().to_track_quat("-Z", "Y")


def lock_quat(cam_loc, target, vfov, third=(1 / 3, 1 / 3)):
    tv = math.tan(math.radians(vfov) / 2)
    th = tv * 16 / 9
    d = V(target) - V(cam_loc)
    yaw = math.atan2(d.y, d.x) + math.atan(third[0] * th)
    pitch = math.atan2(d.z, math.hypot(d.x, d.y)) - math.atan(third[1] * tv)
    return look_quat((math.cos(yaw) * math.cos(pitch), math.sin(yaw) * math.cos(pitch), math.sin(pitch)))


def build(dunia, res=(1280, 720), samples=24):
    Sp = Vector((*Wd.SPOTS["hydra"], 0))
    H = Vector((*Wd.HYDRA_POS, 0))
    f = (H - Sp).normalized()
    left = Vector((0, 0, 1)).cross(f)
    A = Sp - f * 9.0
    sd = S.sun_dir(f, 12, 3.5)
    world = C.sky_world("langit_senja_anim", "#241f45", "#ff9a5c", "#1a1418", 1.0, sun_dir=sd, sun_glow="#ffb46a", glow_power=10)
    sc, local = S.shot_scene("animatic", dunia, world, -sd, "#ff9a5a", 3.2, res=res, vol_end=2200, samples=samples, exposure=0.2, vol_tile="8")
    sc.frame_start, sc.frame_end = 1, FRAMES
    sc.render.fps = FPS

    il = S.actor("aktor.ilyra.walk", "ilyra", "walk")
    il_i = C.instance(il.coll, local, name="ilyra.anim")
    naga = S.actor("aktor.naga.anim", "naga")
    Np = Sp + f * 9.0 + left * 6.5
    naga_i = C.instance(naga.coll, local, loc=(Np.x, Np.y, -3.4), rot_z=S.yaw_to((Sp - Np).normalized()), name="naga.anim")
    hy = S.actor("aktor.hydra.anim", "hydra")
    hy_i = C.instance(hy.coll, local, loc=(H.x, H.y, -17.0), rot_z=S.yaw_to(-f), name="hydra.anim")
    foam = C.collection("animatic.busa", local)
    S.foam_rings(foam, hy, type("I", (), {"matrix_basis": hy_i.matrix_basis.copy(), "location": Vector((H.x, H.y, 0))})())
    foam_obs = list(foam.objects)
