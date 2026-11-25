"""Block-outs of Ilyra and every creature of the v2 roster, built from simple shapes as named parts.
Colours, anatomy and signature props follow the owner's reference sheets in assets/ (owner request,
24 Nov 2026); the shapes themselves are modelled from primitives, never traced."""
import math

from mathutils import Matrix, Vector

import pv_common as C
from pv_common import HEX, V


def X(p, s):
    return (p[0] * s, p[1], p[2])


def add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def lerp(a, b, t):
    return Vector(tuple(a[i] + (b[i] - a[i]) * t for i in range(3)))


def _rx(v, deg):
    return Matrix.Rotation(math.radians(deg), 3, "X") @ Vector(v)


def _rz(v, deg):
    return Matrix.Rotation(math.radians(deg), 3, "Z") @ Vector(v)


SIDES = ((1, "L"), (-1, "R"))
UP = Vector((0, 0, 1))


def _dir_rot(d):
    """Euler (degrees) that turns an ellipsoid's long Z axis along direction d."""
    e = Vector(d).to_track_quat("Z", "Y").to_euler()
    return (math.degrees(e.x), math.degrees(e.y), math.degrees(e.z))


# ---------------------------------------------------------------- generators

def humanoid(r, H, bulk=1.0, legs="human", female=False, off=(0, 0, 0), arm_pose=None, leg_pose=None, neck_scale=1.0,
             body_mat="body", pelvis_mat=None, leg_mat=None, shin_mat=None, foot_mat=None):
    """Biped from the waist pivot. arm_pose[side] = (abduct, forward, elbow) in degrees, built posed.
    leg_pose[side] = (hip forward, knee). Left is +X; the creature faces -Y."""
    arm_pose = arm_pose or {}
    leg_pose = leg_pose or {}
    pelvis_mat = pelvis_mat or body_mat
    leg_mat = leg_mat or body_mat
    shin_mat = shin_mat or leg_mat
    sw = H * 0.125 * bulk * (0.84 if female else 1.0)
    hw = H * 0.06 * (1 + 0.25 * (bulk - 1)) * (1.12 if female else 1.0)
    hh = H * 0.13
    z = dict(head=H - hh * 0.5, neck=H - hh * 1.0, sh=H * 0.815, chest=H * 0.715, waist=H * 0.6, hip=H * 0.51, knee=H * 0.28, ankle=H * 0.045)
    o = V(off)

    def P(x, y, zz):
        return (x + o.x, y + o.y, zz + o.z)

    J = {"H": H, "sw": sw, "hw": hw, "hh": hh, "z": z, "off": off}
    pel = r.P("pelvis", P(0, 0, z["hip"]))
    tor = r.P("torso", P(0, 0, z["waist"]), "pelvis")
    pel.ell(P(0, 0.0, z["hip"] + 0.02 * H), (hw * 1.6, H * 0.068 * bulk, H * 0.075), mat=pelvis_mat)
    tor.ell(P(0, 0.005 * H, z["chest"]), (sw * 0.95, H * 0.078 * bulk, H * 0.118), mat=body_mat)
    tor.ell(P(0, 0, z["waist"] + 0.02 * H), (sw * 0.7, H * 0.064 * bulk, H * 0.09), mat=body_mat)
    tor.limb(P(0, 0.005 * H, z["sh"]), P(0, -0.012 * H, z["neck"] + 0.035 * H * neck_scale), H * 0.034 * bulk, H * 0.028 * bulk, mat=body_mat)
    if bulk > 1.2:
        # pectorals and a broad back for the brutes
        for s in (1, -1):
            tor.ell(P(s * sw * 0.42, -H * 0.05 * bulk, z["chest"] + H * 0.03), (sw * 0.42, H * 0.04 * bulk, H * 0.06), mat=body_mat)
    J["neck"] = P(0, -0.012 * H, z["neck"])
    J["head_c"] = P(0, -0.02 * H, z["head"] + (neck_scale - 1) * 0.03 * H)
    J["chest"] = P(0, 0, z["chest"])
    J["back"] = P(0, H * 0.07 * bulk, z["chest"] + 0.03 * H)
    J["hip"] = P(0, 0, z["hip"])
    J["waist"] = P(0, 0, z["waist"])
    r.P("head", J["neck"], "torso")
    for s, side in SIDES:
        ab, fw, el = arm_pose.get(side, (12, 4, 12))
        S = V(P(s * sw, 0.004 * H, z["sh"]))
        d1 = Vector((s * math.sin(math.radians(ab)), 0, -math.cos(math.radians(ab))))
        d1 = _rx(d1, -fw)
        d2 = _rx(d1, -el)
        E = S + d1 * (0.19 * H)
        W = E + d2 * (0.16 * H)
        T = W + d2 * (0.085 * H)
        J["sh_" + side], J["el_" + side], J["wr_" + side], J["tip_" + side] = S, E, W, T
        J["hand_dir_" + side] = d2
        J["arm_dir_" + side] = d1
        ua = r.P("upperarm_" + side, S, "torso")
        ua.ell(S, H * 0.042 * bulk, mat=body_mat)
        ua.limb(S, E, H * 0.031 * bulk, H * 0.025 * bulk, mat=body_mat)
        fa = r.P("forearm_" + side, E, "upperarm_" + side)
        fa.limb(E, W, H * 0.025 * bulk, H * 0.018 * bulk, mat=body_mat)
        hd = r.P("hand_" + side, W, "forearm_" + side)
        hd.ell((W + T) / 2, (H * 0.022 * bulk, H * 0.016 * bulk, H * 0.045), rot=_dir_rot(d2), mat=body_mat)
    if legs is None:
        return J
    for s, side in SIDES:
        hf, kn = leg_pose.get(side, (0, 0))
        Hj = V(P(s * hw, 0, z["hip"]))
        th = r.P("thigh_" + side, Hj, "pelvis")
        if legs == "human":
            d1 = _rx(Vector((s * 0.03, 0, -1)), -hf)
            d2 = _rx(d1, kn)
            K = Hj + d1.normalized() * (z["hip"] - z["knee"])
            A = K + d2.normalized() * (z["knee"] - z["ankle"])
            th.limb(Hj, K, H * 0.048 * bulk, H * 0.034 * bulk, mat=leg_mat)
            sh = r.P("shin_" + side, K, "thigh_" + side)
            sh.limb(K, A, H * 0.034 * bulk, H * 0.021 * bulk, mat=shin_mat)
            ft = r.P("foot_" + side, A, "shin_" + side)
            ft.ell(add(A, (0, -0.04 * H, -0.015 * H)), (H * 0.026 * bulk, H * 0.065, H * 0.022), mat=foot_mat or shin_mat)
        else:
            # digitigrade: knee forward, hock back, standing on toes
            d1 = _rx(Vector((s * 0.04, -0.35, -1)).normalized(), -hf)
            K = Hj + d1 * (H * 0.2)
            Hk = K + _rx(Vector((0, 0.42, -1)).normalized(), kn * 0.5) * (H * 0.2)
            A = Hk + _rx(Vector((0, -0.12, -1)).normalized(), kn * 0.2) * (H * 0.13)
            th.limb(Hj, K, H * 0.05 * bulk, H * 0.034 * bulk, mat=leg_mat)
