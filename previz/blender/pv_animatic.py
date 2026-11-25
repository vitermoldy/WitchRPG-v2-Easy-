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


