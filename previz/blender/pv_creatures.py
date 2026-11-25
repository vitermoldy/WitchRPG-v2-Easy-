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
            sh = r.P("shin_" + side, K, "thigh_" + side)
            sh.limb(K, Hk, H * 0.032 * bulk, H * 0.022 * bulk, mat=shin_mat)
            sh.limb(Hk, A, H * 0.022 * bulk, H * 0.018 * bulk, mat=shin_mat)
            ft = r.P("foot_" + side, A, "shin_" + side)
            if legs == "bird":
                for a in (-25, 0, 25):
                    tip = V(A) + _rz(Vector((0, -H * 0.09, -A.z + 0.01)), a)
                    ft.cone(A, tip, H * 0.012, mat=foot_mat or "horn")
                ft.cone(A, V(A) + Vector((0, H * 0.06, -A.z + 0.01)), H * 0.01, mat=foot_mat or "horn")
            else:
                ft.limb(A, V((A.x, A.y - 0.01 * H, 0.0)), H * 0.022, H * 0.026, mat=foot_mat or "horn", joints=False)
        J["ankle_" + side] = A
        J["knee_" + side] = K
    return J


def quad(r, H, L, W, D, leg_r, front="paw", hind="paw", body_mat="body", foot_mat="horn"):
    """Four-legged body. H: shoulder height, L: body length, W: width, D: chest depth."""
    Q = {}
    body = r.P("body", (0, 0, H * 0.8))
    chest = (0, -L * 0.27, H - D * 0.5)
    rump = (0, L * 0.3, H * 0.97 - D * 0.45)
    body.ell(chest, (W * 0.5, L * 0.3, D * 0.56), mat=body_mat)
    body.ell((0, 0.02 * L, H - D * 0.56), (W * 0.44, L * 0.34, D * 0.47), mat=body_mat)
    body.ell(rump, (W * 0.48, L * 0.26, D * 0.5), mat=body_mat)
    Q.update(chest=chest, rump=rump, back=(0, 0, H), withers=(0, -L * 0.3, H))
    for s, side in SIDES:
        FS = (s * W * 0.3, -L * 0.36, H - D * 0.55)
        FE = (s * W * 0.33, -L * 0.33, H * 0.5)
        FW = (s * W * 0.33, -L * 0.37, H * 0.15)
        FF = (s * W * 0.33, -L * 0.4, 0.0)
        HS = (s * W * 0.3, L * 0.36, H * 0.95 - D * 0.55)
        HK = (s * W * 0.35, L * 0.28, H * 0.5)
        HH = (s * W * 0.33, L * 0.43, H * 0.26)
        HF = (s * W * 0.33, L * 0.4, 0.0)
        lf = r.P("leg_F" + side, FS, "body")
        lf.limb(FS, FE, leg_r * 1.7, leg_r * 1.1, mat=body_mat)
        lf.limb(FE, FW, leg_r * 1.1, leg_r * 0.8, mat=body_mat)
        _foot(lf, FW, FF, leg_r, front, body_mat, foot_mat)
        lh = r.P("leg_H" + side, HS, "body")
        lh.limb(HS, HK, leg_r * 1.9, leg_r * 1.2, mat=body_mat)
        lh.limb(HK, HH, leg_r * 1.15, leg_r * 0.85, mat=body_mat)
        lh.limb(HH, (HF[0], HF[1], H * 0.08), leg_r * 0.85, leg_r * 0.75, mat=body_mat)
        _foot(lh, (HF[0], HF[1], H * 0.08), HF, leg_r, hind, body_mat, foot_mat)
    Q["neck_base"] = (0, -L * 0.47, H - D * 0.22)
    Q["tail_base"] = (0, L * 0.53, H * 0.93 - D * 0.3)
    Q["H"], Q["L"], Q["W"], Q["D"] = H, L, W, D
    return Q


def _foot(part, wrist, ground, r, kind, mat="body", foot_mat="horn"):
    w, g = V(wrist), V(ground)
    if kind == "hoof":
        part.limb(w, g + Vector((0, 0, r * 0.9)), r * 0.8, r * 0.75, mat=mat)
        part.limb(g + Vector((0, 0, r * 0.9)), g, r * 0.95, r * 1.05, mat=foot_mat, joints=False)
    elif kind == "talon":
        part.limb(w, g + Vector((0, -r, r)), r * 0.7, r * 0.55, mat="beakleg" if "beakleg" in part.rig.pal else mat)
        for a in (-30, 0, 30):
            tip = g + _rz(Vector((0, -r * 3.2, 0.02)), a)
            part.cone(g + Vector((0, -r, r)), tip, r * 0.35, mat="claw" if "claw" in part.rig.pal else "horn", seg=6)
    else:
        part.limb(w, g + Vector((0, -r * 0.6, r * 0.8)), r * 0.8, r * 0.85, mat=mat)
        part.ell(g + Vector((0, -r * 0.9, r * 0.6)), (r * 1.15, r * 1.5, r * 0.7), mat=mat)
        for a in (-25, 0, 25):
            part.cone(g + _rz(Vector((0, -r * 1.8, r * 0.4)), a), g + _rz(Vector((0, -r * 2.7, 0.0)), a), r * 0.22, mat="claw" if "claw" in part.rig.pal else "horn", seg=5)


def wing_frame(root, s, raise_deg, sweep_deg, tilt=60):
    """u: out along the leading edge; v: down the chord. tilt 0 lays the chord back (flight), 90 hangs it down,
    so display wings (tilt about 60) face the camera from the front and from behind."""
    ra, sw = math.radians(raise_deg), math.radians(sweep_deg)
    U = Vector((s * math.cos(ra) * math.cos(sw), math.sin(sw) * math.cos(ra), math.sin(ra)))
    V0 = Vector((0, math.cos(math.radians(tilt)), -math.sin(math.radians(tilt))))
    Vv = (V0 - U * V0.dot(U)).normalized()
    R = V(root)
    return lambda u, v: R + U * u + Vv * v


def bat_wing(part, root, s, span, chord, raise_deg=30, sweep_deg=15, bone="horn", tilt=62, arm="body"):
    f = wing_frame(root, s, raise_deg, sweep_deg, tilt)
    S, Cc = span, chord
    pts = {
        "root": (0, 0), "elbow": (0.33, -0.06), "wrist": (0.55, -0.03), "t1": (1.0, 0.04), "s1": (0.7, 0.2),
        "t2": (0.9, 0.6), "s2": (0.6, 0.45), "t3": (0.62, 0.96), "s3": (0.3, 0.55), "body": (0.02, 0.8),
    }
    P = {k: f(u * S, v * Cc) for k, (u, v) in pts.items()}
    # explicit fans keep the scallops between the fingers (an n-gon here triangulated as its hull)
    fans = [("wrist", "t1", "s1"), ("wrist", "s1", "t2"), ("wrist", "t2", "s2"), ("wrist", "s2", "t3"), ("wrist", "t3", "s3"),
            ("root", "elbow", "wrist"), ("root", "wrist", "s3"), ("root", "s3", "body")]
    for a, b, c in fans:
        part.poly([P[a], P[b], P[c]], mat="membrane")
    part.tube([P["root"], P["elbow"], P["wrist"]], [S * 0.035, S * 0.028, S * 0.02], mat=arm, seg=6, n=3)
    for t in ("t1", "t2", "t3"):
        part.tube([P["wrist"], (P["wrist"] + P[t]) / 2, P[t]], [S * 0.014, S * 0.01, 0.0], mat=bone, seg=5, n=2)
    part.cone(P["wrist"], P["wrist"] + (P["wrist"] - P["elbow"]).normalized() * S * 0.1 + Vector((0, 0, S * 0.05)), S * 0.015, mat="horn", seg=5)
    return P


def feather_wing(part, root, s, span, chord, raise_deg=30, sweep_deg=15, feathers=9, mat="membrane", tilt=55, tip_mat=None, arm="body2"):
    """Arm with a covert panel, primaries fanning from the hand and secondaries along the forearm.
    u runs out along the span and v down the chord, both in metres. tip_mat colours the primaries."""
    f = wing_frame(root, s, raise_deg, sweep_deg, tilt)
    S, Cc = span, chord
    R0, E, Wr, Ht = Vector((0, 0)), Vector((0.32 * S, -0.05 * Cc)), Vector((0.6 * S, -0.03 * Cc)), Vector((0.8 * S, 0.0))
    part.tube([f(*R0), f(*E), f(*Wr), f(*Ht)], [S * 0.045, S * 0.035, S * 0.025, S * 0.012], mat=arm, seg=6, n=3)
    part.poly([f(*R0), f(*E), f(*Wr), f(*Ht), f(0.72 * S, 0.3 * Cc), f(0.35 * S, 0.45 * Cc), f(0.0, 0.42 * Cc)], mat=arm)

    def feather(base, ang, length, width, m):
        d = Vector((math.cos(math.radians(ang)), math.sin(math.radians(ang))))
        n = Vector((-d.y, d.x))
        tip = base + d * length
        pts = [base - n * width * 0.5, base + d * length * 0.55 - n * width, tip, base + d * length * 0.55 + n * width, base + n * width * 0.5]
        part.poly([f(p.x, p.y) for p in pts], mat=m)

    np_ = max(4, feathers // 2)
    for i in range(np_):
        t = i / (np_ - 1)
        base = Ht.lerp(Wr, t)
        feather(base, 8 + 62 * t, (0.42 - 0.12 * t) * S, 0.075 * S, tip_mat or mat)
    ns = max(4, feathers - np_ + 2)
    for i in range(ns):
        t = (i + 0.5) / ns
        base = Wr.lerp(R0, t)
        feather(base, 72 + 22 * t, (0.95 - 0.25 * t) * Cc, 0.06 * S, mat)
    return f


def dog_head(part, at, fwd=(0, -1, 0), s=1.0, jaw_open=25, ears=True, mane=False, teeth=True, mat="body", mane_mat="body2"):
    a, F = V(at), Vector(fwd).normalized()
    side = F.cross(UP).normalized()
    part.ell(a, (0.17 * s, 0.2 * s, 0.16 * s), mat=mat)
    sn0, sn1 = a + F * 0.12 * s + UP * 0.01 * s, a + F * 0.38 * s - UP * 0.03 * s
    part.limb(sn0, sn1, 0.1 * s, 0.065 * s, mat=mat)
    part.ell(sn1 + F * 0.04 * s + UP * 0.02 * s, 0.03 * s, mat="nose" if "nose" in part.rig.pal else "horn", seg=8, rings=5)
    jd = (F * math.cos(math.radians(jaw_open)) - UP * math.sin(math.radians(jaw_open)))
    j0 = a + F * 0.06 * s - UP * 0.08 * s
    part.limb(j0, j0 + jd * 0.3 * s, 0.07 * s, 0.045 * s, mat=mat)
    if "mouth" in part.rig.pal:
        part.ell((sn0 + j0 + jd * 0.2 * s) / 2 + F * 0.08 * s - UP * 0.03 * s, (0.06 * s, 0.12 * s, 0.03 * s), rot=_dir_rot(F), mat="mouth", seg=8, rings=5)
    if teeth:
        for k in (-1, 1):
            part.cone(sn1 - UP * 0.04 * s + side * 0.04 * s * k, sn1 - UP * 0.13 * s + side * 0.04 * s * k, 0.016 * s, mat="horn", seg=5)
            part.cone(j0 + jd * 0.25 * s + side * 0.035 * s * k, j0 + jd * 0.25 * s + side * 0.035 * s * k + UP * 0.07 * s, 0.013 * s, mat="horn", seg=5)
    for k in (-1, 1):
        part.ell(a + F * 0.14 * s + UP * 0.07 * s + side * 0.075 * s * k, (0.028 * s, 0.03 * s, 0.022 * s), mat="eye", seg=8, rings=5)
        if ears:
            part.cone(a + UP * 0.1 * s + side * 0.09 * s * k - F * 0.04 * s, a + UP * 0.33 * s + side * 0.14 * s * k, 0.06 * s, mat=mat, seg=6)
    if mane:
        for i in range(16):
            ang = 2 * math.pi * i / 16
            d = (side * math.cos(ang) + UP * math.sin(ang))
            base = a - F * 0.08 * s + d * 0.15 * s
            part.cone(base, base + d * 0.36 * s - F * 0.22 * s, 0.11 * s, mat=mane_mat, seg=6)
        part.ell(a - F * 0.2 * s - UP * 0.05 * s, (0.3 * s, 0.25 * s, 0.32 * s), mat=mane_mat, seg=10, rings=7)


def eagle_head(part, at, fwd=(0, -1, 0), s=1.0, mat="body2"):
    a, F = V(at), Vector(fwd).normalized()
    side = F.cross(UP).normalized()
    part.ell(a, (0.15 * s, 0.2 * s, 0.16 * s), mat=mat)
    b0 = a + F * 0.14 * s
    part.cone(b0, b0 + F * 0.22 * s - UP * 0.06 * s, 0.07 * s, mat="horn", seg=8)
    part.cone(b0 + F * 0.16 * s - UP * 0.04 * s, b0 + F * 0.2 * s - UP * 0.14 * s, 0.035 * s, mat="horn", seg=6)
    for k in (-1, 1):
        part.ell(a + F * 0.08 * s + UP * 0.05 * s + side * 0.1 * s * k, 0.028 * s, mat="eye", seg=8, rings=5)
        part.ell(a + F * 0.04 * s + UP * 0.09 * s + side * 0.09 * s * k, (0.05 * s, 0.05 * s, 0.02 * s), mat=mat, seg=6, rings=4)
    for i in range(4):
        base = a - F * 0.08 * s + UP * (0.08 - 0.04 * i) * s
        part.cone(base, base - F * (0.32 - 0.04 * i) * s + UP * 0.1 * s, 0.05 * s, mat=mat, seg=5)


def horse_head(part, at, fwd=(0, -1, -0.6), s=1.0, mat="body"):
    a, F = V(at), Vector(fwd).normalized()
    side = Vector((1, 0, 0))
    part.ell(a, (0.13 * s, 0.17 * s, 0.15 * s), mat=mat)
    part.limb(a + F * 0.08 * s, a + F * 0.5 * s, 0.12 * s, 0.085 * s, mat=mat)
    part.ell(a + F * 0.52 * s, (0.09 * s, 0.07 * s, 0.07 * s), mat="nose" if "nose" in part.rig.pal else mat, seg=8, rings=6)
    for k in (-1, 1):
        part.cone(a + UP * 0.1 * s + side * 0.07 * s * k, a + UP * 0.27 * s + side * 0.09 * s * k + F * -0.05 * s, 0.04 * s, mat=mat, seg=6)
        part.ell(a + F * 0.1 * s + side * 0.11 * s * k + UP * 0.04 * s, 0.025 * s, mat="eye", seg=8, rings=5)


def dragon_head(part, at, fwd=(0, -1, 0), s=1.0, jaw_open=30, horns=True, crest=False, mat="body"):
    a, F = V(at), Vector(fwd).normalized()
    side = F.cross(UP).normalized()
    part.ell(a, (0.22 * s, 0.26 * s, 0.2 * s), mat=mat)
    part.limb(a + F * 0.15 * s + UP * 0.03 * s, a + F * 0.62 * s, 0.15 * s, 0.08 * s, mat=mat)
    jd = F * math.cos(math.radians(jaw_open)) - UP * math.sin(math.radians(jaw_open))
    j0 = a + F * 0.08 * s - UP * 0.12 * s
    part.limb(j0, j0 + jd * 0.5 * s, 0.1 * s, 0.05 * s, mat=mat)
    if "mouth" in part.rig.pal:
        part.ell(a + F * 0.35 * s - UP * 0.1 * s, (0.08 * s, 0.22 * s, 0.03 * s), rot=_dir_rot(F), mat="mouth", seg=8, rings=5)
    for k in (-1, 1):
        part.ell(a + F * 0.2 * s + UP * 0.1 * s + side * 0.13 * s * k, (0.035 * s, 0.05 * s, 0.025 * s), mat="eye", seg=8, rings=5)
        part.cone(a + F * 0.26 * s + UP * 0.15 * s + side * 0.12 * s * k, a + UP * 0.22 * s + side * 0.16 * s * k, 0.05 * s, mat=mat, seg=5)
        for i in range(3):
            tb = a + F * (0.55 - 0.12 * i) * s - UP * 0.05 * s + side * 0.07 * s * k
            part.cone(tb, tb - UP * 0.11 * s, 0.018 * s, mat="horn", seg=4)
        if horns:
            part.tube([a + UP * 0.12 * s + side * 0.1 * s * k, a - F * 0.3 * s + UP * 0.28 * s + side * 0.2 * s * k, a - F * 0.62 * s + UP * 0.3 * s + side * 0.18 * s * k], [0.06 * s, 0.035 * s, 0.0], mat="horn", seg=6, n=3)
        if crest:
            for i in range(3):
                base = a - F * (0.05 + 0.1 * i) * s + side * 0.16 * s * k
                tip = base + side * (0.55 - 0.1 * i) * s * k - F * 0.25 * s + UP * (0.25 - 0.12 * i) * s
                tip2 = base - F * 0.18 * s + UP * 0.05 * s
                part.poly([base, tip, tip2], mat="membrane")
                part.tube([base, tip], [0.025 * s, 0.0], mat="accent", seg=4, n=1)


def snake_head(part, at, fwd, s=1.0, jaw=35, mat="body"):
    a, F = V(at), Vector(fwd).normalized()
    up = UP if abs(F.z) < 0.9 else Vector((0, 1, 0))
    side = F.cross(up).normalized()
    up = side.cross(F).normalized()
    part.ell(a + F * 0.1 * s, (0.13 * s, 0.13 * s, 0.13 * s), mat=mat)
    part.limb(a + F * 0.1 * s, a + F * 0.3 * s + up * 0.03 * s, 0.11 * s, 0.06 * s, mat=mat)
    jd = F * math.cos(math.radians(jaw)) - up * math.sin(math.radians(jaw))
    part.limb(a + F * 0.08 * s - up * 0.06 * s, a + F * 0.08 * s - up * 0.06 * s + jd * 0.24 * s, 0.07 * s, 0.035 * s, mat=mat)
    for k in (-1, 1):
        part.ell(a + F * 0.18 * s + up * 0.07 * s + side * 0.08 * s * k, 0.025 * s, mat="eye", seg=8, rings=5)
        part.cone(a + F * 0.26 * s + side * 0.04 * s * k, a + F * 0.27 * s + side * 0.04 * s * k - up * 0.11 * s, 0.014 * s, mat="horn", seg=4)


def spikes(part, pts, h, r, mat="horn", tilt=(0, 0.4, 1)):
    d = Vector(tilt).normalized()
    for i, p in enumerate(pts):
        k = 0.6 + 0.4 * math.sin(i * 1.7) ** 2
        part.cone(p, V(p) + d * h * k, r * k, mat=mat, seg=5)


def tail_tube(part, pts, r0, r1=0.0, mat="body", seg=7):
    n = len(pts)
    part.tube(pts, [r0 + (r1 - r0) * i / (n - 1) for i in range(n)], mat=mat, seg=seg, n=4)


def face(part, hc, H, eyes=True, nose=True, mat="skin"):
    """Brow, nose and glowing eyes on a humanoid head of body height H."""
    k = H / 1.8
    if nose:
        part.cone(hc + Vector((0, -0.085 * k, 0.0)), hc + Vector((0, -0.12 * k, -0.025 * k)), 0.018 * k, mat=mat, seg=5)
    part.ell(hc + Vector((0, -0.07 * k, 0.04 * k)), (0.075 * k, 0.025 * k, 0.018 * k), mat=mat, seg=8, rings=4)
    if eyes:
        for s in (1, -1):
            part.ell(hc + Vector((0.034 * s * k, -0.085 * k, 0.018 * k)), (0.018 * k, 0.01 * k, 0.011 * k), mat="eye", seg=8, rings=5)


def beard(part, chin, length, r, mat="hair"):
    c = V(chin)
    part.cone(c + Vector((0, 0, 0.02)), c + Vector((0, -length * 0.25, -length)), r, mat=mat, seg=8)


def long_hair(part, hc, H, length, width, mat="hair"):
    k = H / 1.8
    c = V(hc)
    part.ell(c + Vector((0, 0.015 * k, 0.03 * k)), (0.1 * k, 0.11 * k, 0.11 * k), mat=mat, seg=10, rings=7)
    part.tube([c + Vector((0, 0.06 * k, 0.06 * k)), c + Vector((0, 0.13 * k, -0.08 * k)), c + Vector((0, 0.15 * k, -length * 0.55)), c + Vector((0, 0.12 * k, -length))],
              [width * 0.9, width, width * 0.8, 0.0], mat=mat, seg=8, n=3, squash=0.55)


def axe(part, W, d, length=1.2, blade=0.55):
    """Double-bitted axe held at W along direction d."""
    d = Vector(d).normalized()
    top, bot = W + d * length * 0.72, W - d * length * 0.28
    part.limb(bot, top, 0.032, 0.032, mat="wood", seg=8, joints=False)
    part.cone(top, top + d * 0.18, 0.035, mat="metal", seg=6)
    # the bits open sideways (along X) so the blades face the camera from the front
    ref = Vector((1, 0, 0))
    side = (ref - d * ref.dot(d)).normalized()
    c = top - d * 0.18
    for k in (-1, 1):
        pts = [c + side * 0.04 * k + d * blade * 0.36, c + side * blade * 0.75 * k + d * blade * 0.62, c + side * blade * 0.92 * k,
               c + side * blade * 0.75 * k - d * blade * 0.62, c + side * 0.04 * k - d * blade * 0.36]
        part.poly(pts, mat="metal")
    part.torus(c, 0.05, 0.02, normal=d, mat="metal", seg=10, rseg=4)


# ---------------------------------------------------------------- Ilyra

def b_ilyra(r, pose="idle"):
    """Ilyra, 1.7 m: dark hooded robe and cloak, staff in the right hand, Chaos left, Umbra right."""
    poses = {
        "idle": {"L": (22, 18, 35), "R": (14, 22, 45)},
        "cast": {"L": (35, 70, 10), "R": (14, 22, 45)},
        "raise": {"L": (22, 18, 35), "R": (60, 60, 15)},
        "swing": {"L": (40, 35, 40), "R": (70, -35, 25)},
        "walk": {"L": (16, 8, 25), "R": (14, 22, 45)},
    }
    J = humanoid(r, 1.7, bulk=0.92, female=True, arm_pose=poses.get(pose, poses["idle"]), body_mat="cloth")
    z = J["z"]
    tor, pel, head = r.parts["torso"], r.parts["pelvis"], r.parts["head"]
    hc = V(J["head_c"])
    head.ell(hc + Vector((0, -0.01, -0.01)), (0.075, 0.085, 0.1), mat="skin")
    head.ell(hc + Vector((0, 0.015, 0.01)), (0.105, 0.115, 0.125), mat="cloth")
    head.tube([hc + Vector((0, 0.06, 0.09)), hc + Vector((0, 0.14, 0.02)), hc + Vector((0, 0.17, -0.12))], [0.07, 0.04, 0.0], mat="cloth", seg=8, n=3)
    head.ell(hc + Vector((0, -0.055, 0.0)), (0.07, 0.03, 0.08), mat="hood_in")
    for k in (-1, 1):
        head.tube([hc + Vector((0.06 * k, -0.05, -0.02)), hc + Vector((0.075 * k, -0.04, -0.14)), hc + Vector((0.07 * k, -0.02, -0.26))], [0.025, 0.02, 0.0], mat="hair", seg=6, n=3)
    tor.ell((0, 0.01, z["sh"] - 0.02), (0.2, 0.13, 0.08), mat="cloth")
    pel.tube([(0, 0, z["waist"]), (0, 0.0, z["hip"]), (0, 0.01, 0.55), (0, 0.02, 0.18)], [0.15, 0.18, 0.25, 0.31], mat="cloth", seg=14, n=3, cap=False)
    pel.torus((0, 0, z["waist"] - 0.02), 0.155, 0.018, mat="belt", seg=16)
    pel.ell((0.1, -0.12, z["waist"] - 0.05), (0.03, 0.02, 0.04), mat="sigil_l")
    rows, cols = 7, 11
    sheet = []
    for i in range(rows):
        t = i / (rows - 1)
        zz = z["sh"] + 0.02 - t * (z["sh"] - 0.25)
        rad = 0.17 + t * 0.26
        row = []
        for j in range(cols):
            u = j / (cols - 1)
            a = math.radians(-95 + 190 * u)
            hem = 0.0
            if i == rows - 1:
                hem = 0.09 * ((j % 2) * 2 - 1) + 0.05 * math.sin(j * 2.3)
            row.append(Vector((math.sin(a) * rad, 0.03 + math.cos(a) * rad * 0.75, zz + hem)))
        sheet.append(row)
    cl = r.P("cloak", (0, 0.05, z["sh"]), "torso")
    for i in range(rows - 1):
        for j in range(cols - 1):
            cl.poly([sheet[i][j], sheet[i][j + 1], sheet[i + 1][j + 1], sheet[i + 1][j]], mat="cloth2")
    for s, side, m in ((1, "L", "chaos"), (-1, "R", "umbra")):
        hd = r.parts["hand_" + side]
        W, T = J["wr_" + side], J["tip_" + side]
        hd.ell((W + T) / 2, 0.042, mat=m, seg=10, rings=6)
        fa = r.parts["forearm_" + side]
        fa.torus(J["wr_" + side] - J["hand_dir_" + side] * 0.03, 0.035, 0.008, normal=J["hand_dir_" + side], mat="sigil_" + side.lower(), seg=12, rseg=4)
    d = J["hand_dir_R"]
    W = J["wr_R"] + d * 0.04
    if pose == "swing":
        sd = Vector((-0.55, -0.6, 0.58)).normalized()
    elif pose == "walk":
        sd = Vector((-0.08, -0.25, 1)).normalized()
    else:
        sd = Vector((-0.12, -0.18, 1)).normalized()
    st = r.P("staff", W, "hand_R")
    bot, top = W - sd * 0.62, W + sd * 1.18
    st.limb(bot, top, 0.018, 0.022, mat="wood", seg=8, joints=False)
    st.cone(bot, bot - sd * 0.08, 0.02, mat="metal", seg=6)
    head_c = top + sd * 0.12
    side = sd.cross(Vector((0, 1, 0))).normalized()
    st.torus(head_c, 0.11, 0.014, normal=side.cross(sd), mat="metal", seg=18, rseg=5)
    st.torus(head_c, 0.075, 0.008, normal=side.cross(sd), mat="sigil_staff", seg=16, rseg=4)
    st.ell(head_c, 0.035, mat="sigil_staff", seg=8, rings=6)
    for k in (-1, 1):
        st.cone(top, head_c + side * 0.12 * k + sd * 0.12, 0.012, mat="metal", seg=5)
    J["staff_head"] = head_c
    return J


# ---------------------------------------------------------------- roster

def b_imp(r):
    """Skinny pale imp: bald head, long pointed ears, big pink bat wings, whip tail with a spade."""
    J = humanoid(r, 1.05, bulk=0.55, legs="bird", arm_pose={"L": (30, 50, 35), "R": (25, 40, 30)}, leg_pose={"L": (40, 45), "R": (30, 40)}, foot_mat="claw")
    h = r.parts["head"]
    hc = V(J["head_c"]) + Vector((0, -0.02, 0.01))
    h.ell(hc, (0.095, 0.115, 0.11))
    h.ell(hc + Vector((0, 0.04, 0.05)), (0.09, 0.09, 0.07))
    h.limb(hc + Vector((0, -0.06, -0.04)), hc + Vector((0, -0.11, -0.075)), 0.05, 0.03)
    for s in (1, -1):
        h.cone(hc + Vector((0.07 * s, 0.01, 0.02)), hc + Vector((0.26 * s, 0.08, 0.12)), 0.03, mat="body", seg=5)
        h.ell(hc + Vector((0.04 * s, -0.085, 0.02)), (0.022, 0.018, 0.015), mat="eye", seg=8, rings=5)
    for s, side in SIDES:
        hd = r.parts["hand_" + side]
        W, d = J["wr_" + side], J["hand_dir_" + side]
        for a in (-0.03, 0.0, 0.03):
            hd.cone(W + d * 0.05 + Vector((a, 0, 0)), W + d * 0.17 + Vector((a * 1.5, -0.02, 0)), 0.007, mat="claw", seg=4)
    t = r.parts["torso"]
    for s in (1, -1):
        bat_wing(t, (0.04 * s, 0.06, J["z"]["sh"] - 0.02), s, 0.95, 0.55, raise_deg=42, sweep_deg=25, bone="body", arm="body")
    tl = r.P("tail", (0, 0.05, J["z"]["hip"]), "pelvis")
    pts = [(0, 0.05, 0.52), (0, 0.3, 0.4), (0, 0.5, 0.65), (0, 0.48, 1.0), (0, 0.36, 1.32), (0, 0.42, 1.5)]
    tail_tube(tl, pts, 0.022, 0.007)
    tip = V(pts[-1])
    tl.poly([tip + Vector((0, 0.0, -0.02)), tip + Vector((0.06, -0.03, 0.05)), tip + Vector((0, -0.02, 0.15)), tip + Vector((-0.06, -0.03, 0.05))], mat="claw")


def b_hellhound(r):
    """Black three-headed hound with glowing cyan veins and a snake for a tail."""
    Q = quad(r, 1.0, 1.5, 0.48, 0.5, 0.055)
    b = r.parts["body"]
    b.ell(V(Q["chest"]) + Vector((0, -0.12, 0.05)), (0.3, 0.32, 0.32))
    nb = V(Q["neck_base"])
    for k, (dx, sc, up) in enumerate(((0, 1.1, 0.14), (0.36, 0.92, -0.02), (-0.36, 0.92, -0.02))):
        hp = nb + Vector((dx, -0.42 * sc, 0.32 * sc + up))
        nk = r.P(f"neck{k}", nb, "body")
        nk.limb(nb + Vector((dx * 0.3, 0, 0)), hp, 0.15 * sc, 0.12 * sc)
        hd = r.P(f"head{k}", hp, f"neck{k}")
        dog_head(hd, hp + Vector((0, -0.06, 0.02)), fwd=(dx * 1.6, -1, -0.12), s=1.15 * sc, jaw_open=34)
    spikes(b, [lerp(Q["withers"], (0, Q["L"] * 0.45, Q["H"] * 0.95), i / 7) for i in range(8)], 0.16, 0.035, mat="body", tilt=(0, 0.6, 1))
    tl = r.P("tail", Q["tail_base"], "body")
    pts = [Q["tail_base"], (0, 1.05, 1.0), (0.25, 1.35, 1.15), (0.35, 1.25, 1.45)]
    tl.tube(pts, [0.07, 0.065, 0.06, 0.055], mat="snake", seg=7, n=4)
    snake_head(tl, pts[-1], (0.1, -0.7, 0.4), s=0.7, jaw=40, mat="snake")


def b_harpy(r):
    """Woman with blue-and-white feathered wing arms, feather crest, feather wraps and bird legs."""
    J = humanoid(r, 1.65, bulk=0.78, legs="bird", female=True, arm_pose={"L": (80, 12, 20), "R": (70, 25, 40)}, leg_pose={"L": (25, 25), "R": (10, 20)},
                 body_mat="skin", leg_mat="leg", foot_mat="claw")
    h = r.parts["head"]
    hc = V(J["head_c"])
    h.ell(hc, (0.085, 0.095, 0.11), mat="skin")
    face(h, hc, 1.65)
    long_hair(h, hc, 1.65, 0.35, 0.07)
    for i in range(7):
        a = math.radians(-60 + 20 * i)
        base = hc + Vector((math.sin(a) * 0.07, 0.02, 0.08))
        h.cone(base, base + Vector((math.sin(a) * 0.18, 0.12, 0.2 + 0.05 * math.cos(a))), 0.025, mat="accent" if i % 2 else "membrane", seg=5)
    for s, side in SIDES:
        ua = r.parts["upperarm_" + side]
        feather_wing(ua, J["sh_" + side] + Vector((0, 0.03, 0)), s, 1.7, 1.0, raise_deg=12, sweep_deg=8, tilt=60, tip_mat="accent", arm="skin")
        hd = r.parts["hand_" + side]
        W, d = J["wr_" + side], J["hand_dir_" + side]
        for a in (-0.02, 0.02):
            hd.cone(W + d * 0.06, W + d * 0.16 + Vector((0, -0.05, a)), 0.008, mat="claw", seg=4)
    tor = r.parts["torso"]
    tor.ell(V(J["chest"]) + Vector((0, -0.01, 0.04)), (0.15, 0.115, 0.06), mat="accent")
    p = r.parts["pelvis"]
    for i in range(9):
        a = math.radians(-160 + 40 * i)
        top = V(J["hip"]) + Vector((math.sin(a) * 0.12, -math.cos(a) * 0.09, 0.03))
        p.cone(top, top + Vector((math.sin(a) * 0.1, -math.cos(a) * 0.08, -0.32)), 0.05, mat="accent" if i % 2 else "membrane", seg=5)


def b_centaur(r):
    """Old archer: white hair and beard, gold bands, chestnut horse body with a pale tail, bow drawn."""
    Q = quad(r, 1.5, 1.85, 0.58, 0.72, 0.055, front="hoof", hind="hoof", foot_mat="hoof")
    J = humanoid(r, 1.8, bulk=1.15, legs=None, off=(0, -0.62, 0.62), arm_pose={"L": (88, 75, 0), "R": (75, 88, 125)}, body_mat="skin")
    h = r.parts["head"]
    hc = V(J["head_c"])
    h.ell(hc, (0.09, 0.105, 0.12), mat="skin")
    face(h, hc, 1.8)
    long_hair(h, hc, 1.8, 0.5, 0.09)
    beard(h, hc + Vector((0, -0.07, -0.08)), 0.3, 0.07)
    for s, side in SIDES:
        r.parts["upperarm_" + side].torus(lerp(J["sh_" + side], J["el_" + side], 0.6), 0.055, 0.014, normal=J["arm_dir_" + side], mat="gold", seg=12, rseg=4)
        r.parts["forearm_" + side].torus(lerp(J["el_" + side], J["wr_" + side], 0.7), 0.045, 0.012, normal=J["hand_dir_" + side], mat="gold", seg=12, rseg=4)
    r.parts["torso"].torus(V(J["waist"]) + Vector((0, 0, -0.02)), 0.2, 0.03, mat="gold", seg=16)
    r.parts["torso"].tube([V(J["sh_L"]) + Vector((0, -0.02, 0.02)), V(J["chest"]) + Vector((0, -0.13, 0)), V(J["waist"]) + Vector((-0.17, -0.04, 0))], 0.022, mat="cloth", seg=5, n=2)
    hd = r.parts["hand_L"]
    W = J["wr_L"] + J["hand_dir_L"] * 0.06
    bow = [W + Vector((0.0, 0.12, 0.72)), W + Vector((0.0, -0.06, 0.4)), W, W + Vector((0.0, -0.06, -0.4)), W + Vector((0.0, 0.12, -0.72))]
    hd.tube(bow, [0.008, 0.02, 0.025, 0.02, 0.008], mat="wood", seg=6, n=4)
    R = J["wr_R"]
    hd.tube([bow[0], R, bow[-1]], 0.004, mat="horn", seg=4, n=1)
    hd.limb(R + Vector((0, 0.05, 0)), W + Vector((0, -0.5, 0)), 0.006, 0.006, mat="wood", seg=4, joints=False)
    b = r.parts["body"]
    b.limb((0.22, 0.25, 1.5), (0.3, 0.65, 1.95), 0.08, 0.08, mat="cloth")
    for k in range(3):
        b.cone((0.28 + 0.03 * k, 0.6 + 0.02 * k, 1.9), (0.3 + 0.03 * k, 0.66 + 0.02 * k, 2.05), 0.015, mat="horn", seg=4)
    for s in (1, -1):
        for y in (-0.62, 0.62):
            b.torus((s * 0.19, y * 0.6 + (0.05 if y > 0 else -0.08), 0.22), 0.06, 0.015, mat="gold", seg=10, rseg=4)
    tl = r.P("tail", Q["tail_base"], "body")
    for k in (-0.05, 0, 0.05):
        tail_tube(tl, [Q["tail_base"], (k, 1.2, 1.2), (k * 2, 1.4, 0.75), (k * 3, 1.36, 0.3)], 0.08, 0.0, mat="body2")


def b_naga(r):
    """Eastern swamp dragon: green serpent body with a gold belly, orange frill, whiskers, small claws."""
    pts = [(0.9, 2.4, 0.18), (1.35, 1.4, 0.24), (0.9, 0.4, 0.3), (-0.2, 0.25, 0.32), (-0.85, 1.05, 0.32), (-0.35, 1.75, 0.38), (0.45, 1.5, 0.7), (0.55, 0.9, 1.35), (0.0, 0.55, 1.85), (-0.25, 0.0, 2.2), (-0.1, -0.45, 2.45), (0.0, -0.7, 2.5)]
    radii = [0.06, 0.12, 0.2, 0.26, 0.3, 0.31, 0.29, 0.26, 0.23, 0.21, 0.2, 0.19]
    b = r.P("body", (0, 0.8, 0.3))
    b.tube(pts, radii, seg=10, n=4)
    spikes(b, [pts[i] for i in range(2, 11)], 0.3, 0.06, mat="accent", tilt=(0, 0.5, 1))
    for s in (1, -1):
        for idx in (8, 4):
            a0 = V(pts[idx]) + Vector((0.2 * s, -0.12, -0.1))
            b.limb(a0, a0 + Vector((0.22 * s, -0.2, -0.3)), 0.06, 0.04)
            for k in (-1, 0, 1):
                b.cone(a0 + Vector((0.22 * s, -0.2, -0.3)), a0 + Vector((0.3 * s + 0.04 * k, -0.35, -0.36)), 0.02, mat="horn", seg=4)
    hp = V(pts[-1]) + Vector((0, -0.05, 0.05))
    h = r.P("head", hp, "body")
    dragon_head(h, hp, fwd=(0, -1, -0.25), s=1.05, jaw_open=38, horns=True)
    for s in (1, -1):
        root = hp + Vector((0.12 * s, 0.12, 0.0))
        tips = [root + Vector((s * (0.45 - 0.05 * i), 0.15 + 0.08 * i, 0.4 - 0.18 * i)) for i in range(5)]
        h.poly([root] + tips, mat="membrane")
        for t in tips:
            h.tube([root, t], [0.02, 0.0], mat="accent", seg=4, n=1)
        sn = hp + Vector((0.06 * s, -0.5, 0.0))
        h.tube([sn, sn + Vector((0.25 * s, -0.15, -0.1)), sn + Vector((0.45 * s, 0.05, -0.35)), sn + Vector((0.5 * s, 0.25, -0.6))], [0.015, 0.01, 0.006, 0.0], mat="horn", seg=4, n=3)
    for i in range(6):
        p = V(pts[10 - i]) + Vector((0, 0.15, 0.22))
        h.cone(p, p + Vector((0, 0.3, 0.1)), 0.06, mat="hair", seg=5) if i < 3 else b.cone(p, p + Vector((0, 0.3, 0.1)), 0.06, mat="hair", seg=5)


def b_minotaur(r, pose="idle"):
    """Red-brown bull man: pale curved horns, nose ring, studded leather kilt, hooves, a double axe in each hand."""
    arms = {"idle": {"L": (22, 30, 45), "R": (22, 30, 45)}, "windup": {"L": (25, 25, 50), "R": (30, 160, 15)}}[pose]
    J = humanoid(r, 2.75, bulk=1.55, legs="goat", arm_pose=arms, leg_pose={"L": (10, 15), "R": (-8, 10)}, neck_scale=0.6,
                 body_mat="skin", leg_mat="skin", shin_mat="hair", foot_mat="hoof")
    h = r.parts["head"]
    hc = V(J["head_c"]) + Vector((0, -0.05, -0.04))
    h.ell(hc, (0.17, 0.2, 0.17), mat="skin")
    h.ell(hc + Vector((0, 0.04, 0.1)), (0.16, 0.14, 0.09), mat="hair")
    h.limb(hc + Vector((0, -0.12, -0.03)), hc + Vector((0, -0.3, -0.1)), 0.13, 0.11, mat="skin")
    h.ell(hc + Vector((0, -0.36, -0.11)), (0.1, 0.06, 0.07), mat="nose")
    h.torus(hc + Vector((0, -0.4, -0.17)), 0.045, 0.012, normal=(0, 1, 0), mat="gold", seg=10, rseg=4)
    h.cone(hc + Vector((0, -0.16, -0.14)), hc + Vector((0, -0.12, -0.32)), 0.08, mat="hair", seg=6)
    for s in (1, -1):
        h.tube([hc + Vector((0.12 * s, -0.02, 0.1)), hc + Vector((0.42 * s, 0.0, 0.16)), hc + Vector((0.62 * s, -0.12, 0.34)), hc + Vector((0.58 * s, -0.24, 0.52))], [0.07, 0.055, 0.035, 0.0], mat="horn", seg=8, n=4)
        h.ell(hc + Vector((0.08 * s, -0.17, 0.05)), (0.03, 0.02, 0.018), mat="eye", seg=8, rings=5)
        h.cone(hc + Vector((0.15 * s, 0.02, 0.06)), hc + Vector((0.3 * s, 0.06, 0.0)), 0.045, mat="skin", seg=5)
    p = r.parts["pelvis"]
    hp = V(J["hip"])
    for i in range(9):
        a = math.radians(-80 + i * 20)
        top = hp + Vector((math.sin(a) * 0.3, -math.cos(a) * 0.22, 0.05))
        p.box(top - Vector((0, 0, 0.3)), (0.14, 0.04, 0.55), rot=(0, 0, math.degrees(-a)), mat="cloth")
        p.ell(top - Vector((0, 0, 0.5)) + Vector((math.sin(a) * 0.03, -math.cos(a) * 0.03, 0)), 0.025, mat="metal", seg=6, rings=4)
    p.torus(hp + Vector((0, 0, 0.08)), 0.34, 0.05, mat="cloth", seg=16)
    p.box(hp + Vector((0, -0.34, 0.08)), (0.16, 0.04, 0.12), mat="metal")
    tl = r.P("tail", hp, "pelvis")
    tpts = [hp + Vector((0, 0.25, 0.0)), hp + Vector((0.1, 0.5, -0.45)), hp + Vector((0.15, 0.55, -0.95))]
    tail_tube(tl, tpts, 0.035, 0.02, mat="skin")
    tl.ell(tpts[-1], (0.05, 0.05, 0.12), mat="hair")
    for s, side in SIDES:
        r.parts["forearm_" + side].torus(lerp(J["el_" + side], J["wr_" + side], 0.75), 0.08, 0.025, normal=J["hand_dir_" + side], mat="metal", seg=12, rseg=4)
        hd = r.parts["hand_" + side]
        W = J["wr_" + side] + J["hand_dir_" + side] * 0.1
        if pose == "windup" and side == "R":
            axe(hd, W, Vector((0.15, 0.4, 1)), length=1.5, blade=0.6)
        else:
            axe(hd, W, Vector((s * 0.15, -0.35, -1.0)) if pose == "idle" else Vector((s * 0.3, -0.6, -0.8)), length=1.25, blade=0.5)


def b_cyclops(r):
    """Bald tan giant with one great eye, crossed leather straps, skull belt, fur loincloth and a round shield."""
    J = humanoid(r, 4.2, bulk=1.7, legs="human", arm_pose={"L": (25, 40, 60), "R": (18, 10, 15)}, neck_scale=0.5, body_mat="skin", foot_mat="strap")
    h = r.parts["head"]
    hc = V(J["head_c"]) + Vector((0, -0.04, -0.06))
    h.ell(hc, (0.27, 0.29, 0.31), mat="skin")
    h.ell(hc + Vector((0, -0.22, 0.06)), (0.12, 0.07, 0.11), mat="sclera", seg=12, rings=8)
    h.ell(hc + Vector((0, -0.28, 0.06)), (0.055, 0.03, 0.055), mat="eye", seg=10, rings=6)
    h.ell(hc + Vector((0, -0.2, 0.19)), (0.2, 0.08, 0.05), mat="skin")
    h.limb(hc + Vector((0, -0.12, -0.17)), hc + Vector((0, -0.24, -0.22)), 0.16, 0.12, mat="skin")
    h.cone(hc + Vector((0, -0.29, -0.04)), hc + Vector((0, -0.34, -0.1)), 0.05, mat="skin", seg=6)
    for s in (1, -1):
        h.cone(hc + Vector((0.1 * s, -0.3, -0.22)), hc + Vector((0.12 * s, -0.32, -0.08)), 0.03, mat="horn", seg=5)
        h.ell(hc + Vector((0.27 * s, 0.0, 0.0)), (0.04, 0.07, 0.09), mat="skin")
    t = r.parts["torso"]
    for s in (1, -1):
        t.tube([V(J["sh_" + ("L" if s > 0 else "R")]) + Vector((0, -0.05, 0.05)), V(J["chest"]) + Vector((0, -0.38, 0.0)), V(J["waist"]) + Vector((-s * 0.42, -0.2, -0.05))], 0.045, mat="strap", seg=6, n=3)
    t.torus(V(J["chest"]) + Vector((0, -0.37, 0.0)), 0.07, 0.03, normal=(0, 1, 0), mat="metal", seg=10, rseg=4)
    p = r.parts["pelvis"]
    hp = V(J["hip"])
    p.tube([hp + Vector((0, 0, 0.12)), hp + Vector((0, 0, -0.2)), hp + Vector((0, -0.05, -0.55))], [0.5, 0.52, 0.44], mat="cloth", seg=12, n=2)
    p.torus(hp + Vector((0, 0, 0.12)), 0.52, 0.08, mat="strap", seg=16)
    p.ell(hp + Vector((0, -0.58, 0.12)), (0.12, 0.08, 0.13), mat="horn", seg=10, rings=7)
    for s, side in SIDES:
        r.parts["forearm_" + side].torus(J["wr_" + side] - J["hand_dir_" + side] * 0.12, 0.13, 0.05, normal=J["hand_dir_" + side], mat="strap", seg=12)
        sh = r.parts["shin_" + side]
        for k in range(3):
            sh.torus(lerp(J["knee_" + side], J["ankle_" + side], 0.4 + 0.25 * k), 0.1 - 0.01 * k, 0.025, mat="strap", seg=12, rseg=4)
    hd = r.parts["hand_L"]
    W = J["wr_L"] + J["hand_dir_L"] * 0.15
    n = Vector((1, -0.35, 0)).normalized()
    hd.limb(W + n * 0.05, W + n * 0.15, 0.62, 0.62, mat="wood", seg=20, joints=False)
    hd.torus(W + n * 0.12, 0.63, 0.045, normal=n, mat="metal", seg=24, rseg=5)
    hd.ell(W + n * 0.18, 0.12, mat="metal", seg=10, rings=6)


def b_medusa(r):
    """Green-skinned gorgon: copper snake hair, white draped dress with gold, a long green snake tail."""
    J = humanoid(r, 2.2, bulk=0.85, legs=None, female=True, arm_pose={"L": (30, 65, 30), "R": (35, 15, 45)}, body_mat="skin")
    b = r.P("tail", J["hip"], "pelvis")
    pts = [V(J["hip"]) + Vector((0, 0, 0.05)), (0, 0.05, 0.75), (0, 0.3, 0.32), (0.35, 0.8, 0.2), (1.0, 0.8, 0.18), (1.15, 0.15, 0.16), (0.6, -0.45, 0.14), (-0.25, -0.3, 0.12), (-0.55, 0.45, 0.1), (-0.25, 1.1, 0.07)]
    b.tube(pts, [0.2, 0.22, 0.24, 0.22, 0.2, 0.17, 0.14, 0.1, 0.06, 0.0], mat="snake", seg=10, n=4)
    p = r.parts["pelvis"]
    hp = V(J["hip"])
    p.tube([hp + Vector((0, 0, 0.2)), hp, hp + Vector((0, -0.02, -0.35)), hp + Vector((0.05, -0.05, -0.6))], [0.2, 0.25, 0.3, 0.33], mat="cloth", seg=14, n=3, cap=False)
    p.torus(hp + Vector((0, 0, 0.18)), 0.2, 0.02, mat="gold", seg=16)
    t = r.parts["torso"]
    t.ell(V(J["chest"]) + Vector((0, -0.01, 0.03)), (0.2, 0.15, 0.13), mat="cloth")
    t.tube([V(J["sh_R"]) + Vector((0, 0, 0.04)), V(J["chest"]) + Vector((0.02, -0.15, 0.02)), V(J["waist"]) + Vector((0.18, -0.08, 0.0))], 0.06, mat="cloth", seg=6, n=3, squash=0.4)
    for s, side in SIDES:
        r.parts["upperarm_" + side].torus(lerp(J["sh_" + side], J["el_" + side], 0.55), 0.05, 0.012, normal=J["arm_dir_" + side], mat="gold", seg=12, rseg=4)
    h = r.parts["head"]
    hc = V(J["head_c"])
    h.ell(hc, (0.09, 0.1, 0.115), mat="skin")
    face(h, hc, 2.2)
    for i in range(13):
        a = 2 * math.pi * i / 13
        d = Vector((math.cos(a), math.sin(a) * 0.8 + 0.25, 0.6)).normalized()
        base = hc + d * 0.08
        mid = base + d * 0.18 + Vector((0, 0, 0.1))
        tip = mid + Vector((d.x * 0.15, d.y * 0.12, 0.05 - 0.08 * (i % 3)))
        m = "hair" if i % 3 else "snake"
        h.tube([base, mid, tip], [0.03, 0.025, 0.02], mat=m, seg=6, n=3)
        snake_head(h, tip, (tip - mid), s=0.28, jaw=40, mat=m)


def b_chimera(r):
    """Tawny lion with a pale shaggy mane, a grey goat head with long dark horns, and a blue snake tail."""
    Q = quad(r, 2.3, 3.0, 1.0, 1.15, 0.12)
    nb = V(Q["neck_base"])
    hp = nb + Vector((0, -0.3, 0.25))
    hd = r.P("head_lion", hp, "body")
    hd.limb(nb, hp, 0.36, 0.3)
    dog_head(hd, hp + Vector((0, -0.12, 0.0)), fwd=(0, -1, -0.1), s=1.9, jaw_open=32, ears=True, mane=True)
    r.parts["body"].ell(V(Q["chest"]) + Vector((0, -0.2, 0.25)), (0.6, 0.55, 0.6), mat="body2")
    g0 = V((0, -0.35, Q["H"] + 0.1))
    gh = V((0.0, -0.75, 3.35))
    gn = r.P("head_goat", g0, "body")
    gn.tube([g0, (0, -0.45, 2.8), gh], [0.24, 0.18, 0.15], mat="goat", seg=8, n=3)
    gn.ell(gh, (0.15, 0.24, 0.15), mat="goat")
    gn.limb(gh + Vector((0, -0.15, -0.04)), gh + Vector((0, -0.38, -0.14)), 0.1, 0.06, mat="goat")
    gn.cone(gh + Vector((0, -0.3, -0.16)), gh + Vector((0, -0.32, -0.42)), 0.05, mat="goat", seg=5)
    for s in (1, -1):
        gn.tube([gh + Vector((0.08 * s, 0.02, 0.12)), gh + Vector((0.18 * s, 0.45, 0.6)), gh + Vector((0.28 * s, 1.1, 0.68)), gh + Vector((0.3 * s, 1.5, 0.35))], [0.08, 0.06, 0.035, 0.0], mat="horn", seg=7, n=4)
        gn.ell(gh + Vector((0.11 * s, -0.12, 0.05)), 0.03, mat="eye", seg=8, rings=5)
        gn.cone(gh + Vector((0.12 * s, 0.0, 0.05)), gh + Vector((0.3 * s, 0.05, -0.02)), 0.04, mat="goat", seg=5)
    tb = V(Q["tail_base"])
    tl = r.P("tail_snake", tb, "body")
    pts = [tb, (0, 2.1, 2.9), (0, 1.75, 3.9), (0, 1.0, 4.3), (0, 0.35, 4.05), (0, 0.05, 3.6)]
    tl.tube(pts, [0.22, 0.2, 0.18, 0.16, 0.14, 0.12], mat="snake", seg=8, n=4)
    snake_head(tl, pts[-1], (0, -0.6, -0.7), s=1.5, jaw=45, mat="snake")


def _demon(r, H, bulk, female, span, horn_kind, arm_pose):
    J = humanoid(r, H, bulk=bulk, legs="human", female=female, arm_pose=arm_pose, body_mat="skin", shin_mat="armor", foot_mat="armor")
    h = r.parts["head"]
    hc = V(J["head_c"])
    h.ell(hc, (0.085 * H / 1.9, 0.1 * H / 1.9, 0.115 * H / 1.9), mat="skin")
    face(h, hc, H)
    long_hair(h, hc, H, 0.75 if female else 0.55, 0.09)
    for s in (1, -1):
        if horn_kind == "back":
            h.tube([hc + Vector((0.06 * s, -0.02, 0.09)), hc + Vector((0.13 * s, 0.1, 0.26)), hc + Vector((0.2 * s, 0.32, 0.34)), hc + Vector((0.2 * s, 0.5, 0.22))], [0.038, 0.03, 0.017, 0.0], mat="horn", seg=6, n=4)
        else:
            h.tube([hc + Vector((0.08 * s, 0.0, 0.08)), hc + Vector((0.25 * s, 0.05, 0.2)), hc + Vector((0.32 * s, -0.12, 0.38)), hc + Vector((0.24 * s, -0.25, 0.48))], [0.05, 0.04, 0.022, 0.0], mat="horn", seg=6, n=4)
    t = r.parts["torso"]
    t.ell(V(J["chest"]) + Vector((0, -0.005, 0.0)), (J["sw"] * 1.0, H * 0.085 * bulk, H * 0.1), mat="armor")
    t.ell(V(J["chest"]) + Vector((0, -H * 0.08, -0.02)), (0.03, 0.02, 0.03), mat="glow", seg=8, rings=5)
    for s in (1, -1):
        bat_wing(t, (0.08 * s, J["back"][1], J["z"]["sh"] - 0.05), s, span, span * 0.66, raise_deg=38, sweep_deg=22, bone="horn", arm="horn")
        sh = J["sh_" + ("L" if s > 0 else "R")]
        if not female:
            t.ell(sh + Vector((0, 0, 0.06)), (0.15, 0.15, 0.09), mat="armor")
            spikes(t, [sh + Vector((0.03 * s, 0, 0.1)), sh + Vector((0.08 * s, 0.05, 0.06))], 0.16, 0.035, mat="horn", tilt=(s * 0.6, 0.2, 1))
            t.ell(sh + Vector((0.02 * s, -0.12, 0.03)), (0.03, 0.02, 0.03), mat="glow", seg=8, rings=5)
    p = r.parts["pelvis"]
    p.tube([V(J["hip"]) + Vector((0, 0, 0.08)), V(J["hip"]) + Vector((0, 0, -0.2)), V(J["hip"]) + Vector((0, -0.02, -0.48))], [J["hw"] * 1.7, J["hw"] * 1.9, J["hw"] * 2.0], mat="armor", seg=10, n=2, cap=False)
    for s, side in SIDES:
        hd = r.parts["hand_" + side]
        W, d = J["wr_" + side], J["hand_dir_" + side]
        r.parts["forearm_" + side].limb(J["el_" + side] + d * 0.05, W, H * 0.03, H * 0.024, mat="armor")
        for a in (-0.025, 0.0, 0.025):
            hd.cone(W + d * 0.07, W + d * 0.2 + Vector((a, -0.02, 0)), 0.007, mat="horn", seg=4)
    r.parts["hand_L"].ell(J["tip_L"] + J["hand_dir_L"] * 0.06, 0.06, mat="glow", seg=10, rings=6)
    return J


def b_succubus(r):
    _demon(r, 1.95, 0.8, True, 1.9, "back", {"L": (35, 70, 15), "R": (18, 10, 30)})


def b_incubus(r):
    _demon(r, 2.25, 1.25, False, 2.15, "fwd", {"L": (25, 40, 35), "R": (25, 30, 35)})


def b_griffin(r):
    """Brown eagle head, chest and wings on a tawny lion body, with talons in front and a tufted tail."""
    Q = quad(r, 2.0, 2.5, 0.85, 0.95, 0.09, front="talon")
    nb = V(Q["neck_base"])
    hp = nb + Vector((0, -0.35, 0.65))
    n = r.P("head", nb, "body")
    n.tube([nb, nb + Vector((0, -0.2, 0.35)), hp], [0.34, 0.28, 0.21], mat="body2", seg=8, n=3)
    eagle_head(n, hp + Vector((0, -0.05, 0.08)), fwd=(0, -1, -0.15), s=1.9)
    b = r.parts["body"]
    b.ell(V(Q["chest"]) + Vector((0, -0.25, 0.1)), (0.48, 0.45, 0.58), mat="body2")
    for s in (1, -1):
        feather_wing(b, (0.3 * s, -0.55, Q["H"] + 0.05), s, 3.3, 1.7, raise_deg=42, sweep_deg=22, feathers=10, tip_mat="accent")
    tl = r.P("tail", Q["tail_base"], "body")
    pts = [Q["tail_base"], (0, 1.75, 1.5), (0, 2.15, 1.0), (0, 2.45, 0.7)]
    tail_tube(tl, pts, 0.07, 0.03)
    tl.ell(pts[-1], (0.1, 0.2, 0.1), mat="accent")


def b_hippogriff(r):
    """Golden-brown eagle front with folded wings on a horse's hindquarters and a long horse tail."""
    Q = quad(r, 1.9, 2.5, 0.75, 0.9, 0.08, front="talon", hind="hoof", foot_mat="hoof")
    nb = V(Q["neck_base"])
    hp = nb + Vector((0, -0.3, 0.7))
    n = r.P("head", nb, "body")
    n.tube([nb, nb + Vector((0, -0.18, 0.38)), hp], [0.3, 0.24, 0.19], mat="body2", seg=8, n=3)
    eagle_head(n, hp + Vector((0, -0.05, 0.08)), fwd=(0, -1, -0.2), s=1.75)
    b = r.parts["body"]
    b.ell(V(Q["chest"]) + Vector((0, -0.2, 0.08)), (0.42, 0.42, 0.52), mat="body2")
    for s in (1, -1):
        feather_wing(b, (0.3 * s, -0.5, Q["H"] - 0.05), s, 2.3, 1.4, raise_deg=8, sweep_deg=62, feathers=8, tilt=20, tip_mat="accent")
    tl = r.P("tail", Q["tail_base"], "body")
    for k in (-0.05, 0.0, 0.05):
        tail_tube(tl, [Q["tail_base"], (k, 1.6, 1.4), (k * 2, 1.75, 0.9), (k * 3, 1.7, 0.45)], 0.07, 0.0, mat="hair")


def b_phoenix(r):
    """Fire bird: red body, wings fading from red to orange and gold, long flaming tail streamers."""
    b = r.P("body", (0, 0, 1.2))
    b.ell((0, 0.05, 1.15), (0.3, 0.38, 0.5))
    b.tube([(0, -0.05, 1.5), (0, -0.15, 1.85), (0, -0.25, 2.05)], [0.16, 0.12, 0.1], seg=8, n=3)
    h = r.P("head", (0, -0.25, 2.05), "body")
    hc = V((0, -0.3, 2.12))
    h.ell(hc, (0.1, 0.14, 0.1))
    h.cone(hc + Vector((0, -0.1, -0.01)), hc + Vector((0, -0.3, -0.06)), 0.045, mat="horn", seg=6)
    for s in (1, -1):
        h.ell(hc + Vector((0.065 * s, -0.05, 0.03)), 0.022, mat="eye", seg=8, rings=5)
    for i in range(5):
        a = math.radians(-30 + 15 * i)
        h.tube([hc + Vector((math.sin(a) * 0.04, 0.05, 0.06)), hc + Vector((math.sin(a) * 0.15, 0.3, 0.35)), hc + Vector((math.sin(a) * 0.22, 0.6, 0.45))], [0.03, 0.02, 0.0], mat="glow", seg=5, n=3)
    for s in (1, -1):
        feather_wing(b, (0.18 * s, 0.0, 1.45), s, 2.9, 1.5, raise_deg=48, sweep_deg=10, feathers=10, tip_mat="accent", arm="body")
        lg = r.P("leg_" + ("L" if s > 0 else "R"), (0.12 * s, 0.05, 0.8), "body")
        lg.limb((0.12 * s, 0.05, 0.85), (0.14 * s, 0.0, 0.4), 0.05, 0.03)
        lg.limb((0.14 * s, 0.0, 0.4), (0.14 * s, -0.02, 0.05), 0.03, 0.025, mat="horn")
        for a in (-25, 0, 25):
            lg.cone((0.14 * s, -0.02, 0.05), V((0.14 * s, -0.02, 0.02)) + _rz(Vector((0, -0.18, 0)), a), 0.015, mat="horn", seg=4)
    tl = r.P("tail", (0, 0.35, 0.95), "body")
    for k in range(7):
        dx = (k - 3) * 0.14
        tl.tube([(0, 0.35, 0.95), (dx * 0.6, 0.9, 0.6), (dx * 1.3, 1.6, 0.3), (dx * 2.0, 2.4, 0.4), (dx * 2.4, 3.1, 0.7)], [0.07, 0.06, 0.05, 0.035, 0.0],
                mat="accent" if k % 2 else "glow", seg=5, n=3, squash=0.35)


def b_dragon(r):
    """Red winged dragon: cream belly and wing membranes, horned head, spined back, spade tail."""
    Q = quad(r, 3.8, 7.2, 2.3, 2.4, 0.28)
    nb = V(Q["neck_base"])
    pts = [nb, nb + Vector((0, -1.0, 0.9)), nb + Vector((0, -1.5, 2.0)), nb + Vector((0, -2.3, 2.7))]
    n = r.P("neck", nb, "body")
    n.tube(pts, [0.8, 0.62, 0.5, 0.42], seg=10, n=4)
    spikes(n, [lerp(pts[0], pts[-1], i / 5) + Vector((0, 0.3, 0.45)) for i in range(6)], 0.6, 0.12, mat="accent", tilt=(0, 0.7, 1))
    h = r.P("head", pts[-1], "neck")
    dragon_head(h, V(pts[-1]) + Vector((0, -0.45, 0.05)), fwd=(0, -1, -0.3), s=2.6, jaw_open=28, horns=True)
    b = r.parts["body"]
    for s in (1, -1):
        bat_wing(b, (0.8 * s, -1.3, Q["H"] + 0.3), s, 10.5, 6.0, raise_deg=38, sweep_deg=15, bone="accent")
    spikes(b, [lerp(Q["withers"], (0, 3.5, Q["H"] * 0.95), i / 7) + Vector((0, 0, 0.1)) for i in range(8)], 0.7, 0.14, mat="accent", tilt=(0, 0.7, 1))
    tl = r.P("tail", Q["tail_base"], "body")
    tp = [Q["tail_base"], (0, 5.6, 2.4), (0.8, 7.6, 1.3), (1.8, 9.6, 0.7), (1.4, 11.6, 0.5)]
    tail_tube(tl, tp, 0.75, 0.08, seg=9)
    tip = V(tp[-1])
    tl.poly([tip, tip + Vector((0.5, 0.6, 0.0)), tip + Vector((0.0, 1.2, 0.05)), tip + Vector((-0.5, 0.6, 0.0))], mat="accent")
    spikes(tl, [lerp(tp[0], tp[-1], i / 7) + Vector((0, 0, 0.35 * (1 - i / 7))) for i in range(8)], 0.45, 0.1, mat="accent", tilt=(0, 0.6, 1))


def hydra_neck_joints(base, top, bend, k=8):
    """Joint positions along an S-curve from a base on the body to the head."""
    b, t = V(base), V(top)
    ctrl = [b, b + Vector((bend * 0.4, -1.4, 2.0)), b.lerp(t, 0.55) + Vector((bend, 0.9, 0)), t + Vector((0, 1.6, -1.2)), t]
    pts, _ = C.catmull(ctrl, 8)
    cum = [0.0]
    for i in range(len(pts) - 1):
        cum.append(cum[-1] + (pts[i + 1] - pts[i]).length)
    out = []
    i = 0
    for n in range(k + 1):
        d = cum[-1] * n / k
        while i < len(pts) - 2 and cum[i + 1] < d:
            i += 1
        seg = cum[i + 1] - cum[i]
        f = 0.0 if seg < 1e-9 else (d - cum[i]) / seg
        out.append(pts[i].lerp(pts[i + 1], min(1.0, max(0.0, f))))
    return out


def b_hydra(r, heads=5):
    """Grey-green many-necked serpent: finned crests, pale belly, four stubby legs, heavy tail."""
    b = r.P("body", (0, 0, 2.0))
    b.ell((0, 0.3, 2.1), (3.4, 4.4, 2.3))
    b.ell((0, -2.3, 3.0), (2.8, 1.8, 1.8))
    for s in (1, -1):
        for y in (-2.2, 2.4):
            leg = (2.6 * s, y, 1.4)
            b.limb(leg, (3.3 * s, y - 0.3, 0.4), 0.9, 0.6)
            b.ell((3.4 * s, y - 0.6, 0.25), (0.6, 0.8, 0.3))
            for k in (-1, 0, 1):
                b.cone((3.4 * s + 0.3 * k, y - 1.1, 0.2), (3.4 * s + 0.4 * k, y - 1.6, 0.05), 0.12, mat="horn", seg=5)
    tl = r.P("tail", (0, 4.4, 1.6), "body")
    tail_tube(tl, [(0, 4.4, 1.8), (0.8, 6.8, 1.0), (2.2, 8.6, 0.5), (3.6, 9.4, 0.3)], 1.1, 0.1, seg=9)
    spikes(b, [(0, y, 4.1 - abs(y - 0.3) * 0.12) for y in (-2.8, -1.6, -0.4, 0.8, 2.0, 3.2)], 0.9, 0.22, mat="accent", tilt=(0, 0.5, 1))
    tops = [(-4.6, -6.8, 9.0), (-2.4, -7.6, 11.4), (0.0, -7.2, 13.2), (2.4, -7.6, 11.4), (4.6, -6.8, 9.0)]
    bases = [(-2.2, -3.0, 3.9), (-1.1, -3.4, 4.3), (0.0, -3.5, 4.5), (1.1, -3.4, 4.3), (2.2, -3.0, 3.9)]
    necks = []
    for i, (bs, tp) in enumerate(zip(bases, tops)):
        js = hydra_neck_joints(bs, tp, bend=(i - 2) * 0.6, k=7)
        parent = "body"
        nr = 0.75 if i == 2 else 0.62
        for j in range(len(js) - 1):
            name = f"neck{i}_{j}"
            pr = r.P(name, js[j], parent)
            ra = nr * (1 - 0.45 * j / (len(js) - 1))
            rb = nr * (1 - 0.45 * (j + 1) / (len(js) - 1))
            pr.limb(js[j], js[j + 1], ra, rb, seg=10)
            if j % 2 == 1:
                pr.cone(js[j] + Vector((0, 0.5 * ra, 0.8 * ra)), js[j] + Vector((0, 1.6 * ra, 1.6 * ra)), 0.18 * ra, mat="accent", seg=5)
            parent = name
        hp = js[-1]
        h = r.P(f"head{i}", hp, parent)
        dragon_head(h, hp + Vector((0, -0.4, 0.1)), fwd=(0, -1, -0.35), s=2.4 if i == 2 else 2.0, jaw_open=34, horns=False, crest=True)
        necks.append(js)
    return necks


def b_cerberus(r):
    """Huge lavender-grey three-headed hound with black spiked collars, red mouths and bared teeth."""
    Q = quad(r, 5.0, 6.6, 2.5, 2.7, 0.32)
    r.parts["body"].ell(V(Q["chest"]) + Vector((0, -0.4, 0.2)), (1.4, 1.5, 1.6))
    nb = V(Q["neck_base"])
    for k, (dx, sc, up) in enumerate(((0, 1.0, 0.6), (1.9, 0.85, -0.1), (-1.9, 0.85, -0.1))):
        hp = nb + Vector((dx, -1.7 * sc, 1.1 * sc + up))
        nk = r.P(f"neck{k}", nb, "body")
        nk.limb(nb + Vector((dx * 0.4, 0, 0)), hp, 0.8 * sc, 0.62 * sc)
        cpos = nb.lerp(hp, 0.5) + Vector((dx * 0.1, 0, 0))
        nk.torus(cpos, 0.8 * sc, 0.16, normal=(hp - nb), mat="collar", seg=16)
        dn = (hp - nb).normalized()
        sdir = dn.cross(UP).normalized()
        for a in range(8):
            ang = 2 * math.pi * a / 8
            rv = sdir * math.cos(ang) + dn.cross(sdir).normalized() * math.sin(ang)
            base = cpos + rv * 0.85 * sc
            nk.cone(base, base + rv * 0.4, 0.09, mat="metal", seg=5)
        hd = r.P(f"head{k}", hp, f"neck{k}")
        dog_head(hd, hp + Vector((0, -0.3, 0.1)), fwd=(dx * 0.35, -1, -0.12), s=4.2 * sc, jaw_open=34)
    tl = r.P("tail", Q["tail_base"], "body")
    tail_tube(tl, [Q["tail_base"], (0, 4.4, 3.8), (0.5, 5.4, 3.4), (0.9, 6.0, 2.4)], 0.4, 0.1)


def b_lilith(r):
    """Dark-haired woman in a violet gown with bat wings, a red serpent-dragon coiled around her."""
    J = humanoid(r, 2.5, bulk=0.85, legs=None, female=True, arm_pose={"L": (45, 40, 20), "R": (30, 60, 45)}, body_mat="skin")
    p = r.parts["pelvis"]
    hp = V(J["hip"])
    p.tube([hp + Vector((0, 0, 0.25)), hp, (0, 0.02, 0.6), (0, 0.06, 0.05)], [0.22, 0.27, 0.45, 0.72], mat="cloth", seg=16, n=3, cap=False)
    r.parts["torso"].ell(V(J["chest"]) + Vector((0, -0.005, -0.02)), (0.19, 0.15, 0.17), mat="cloth")
    h = r.parts["head"]
    hc = V(J["head_c"])
    h.ell(hc, (0.1, 0.11, 0.13), mat="skin")
    face(h, hc, 2.5)
    long_hair(h, hc, 2.5, 1.0, 0.13)
    t = r.parts["torso"]
    for s in (1, -1):
        bat_wing(t, (0.1 * s, J["back"][1], J["z"]["sh"]), s, 2.3, 1.5, raise_deg=30, sweep_deg=25, bone="horn", arm="horn")
    sp = r.P("serpent", (0, 0, 0.2), "pelvis")
    pts = []
    for i in range(15):
        t_ = i / 14
        a = t_ * 3.3 * 2 * math.pi
        rad = 0.78 - 0.45 * t_
        pts.append((math.cos(a) * rad, math.sin(a) * rad, 0.15 + t_ * 2.0))
    pts.append((0.35, -0.15, 2.45))
    pts.append((0.3, -0.45, 2.75))
    sp.tube(pts, [0.16 - 0.06 * i / (len(pts) - 1) for i in range(len(pts))], mat="snake", seg=8, n=3)
    dragon_head(sp, V(pts[-1]) + Vector((0, -0.1, 0.0)), fwd=(0, -1, -0.2), s=0.75, jaw_open=40, horns=True, mat="snake")
    for s in (1, -1):
        bat_wing(sp, V(pts[-3]) + Vector((0.12 * s, 0.05, 0.0)), s, 0.6, 0.4, raise_deg=40, sweep_deg=20, bone="snake", arm="snake")


def b_typhon(r):
    """Golden titan with horns and a grey beard, grey bat wings, snakes for hands and a mass of serpent legs."""
    J = humanoid(r, 16.0, bulk=1.35, legs=None, off=(0, 0, -0.2), arm_pose={"L": (110, 10, 40), "R": (110, 10, 40)}, neck_scale=0.7, body_mat="skin")
    h = r.parts["head"]
    hc = V(J["head_c"])
    h.ell(hc, (0.85, 0.95, 1.05), mat="skin")
    face(h, hc, 16.0)
    beard(h, hc + Vector((0, -0.6, -0.5)), 2.2, 0.65)
    long_hair(h, hc, 16.0, 3.5, 0.9)
    for s in (1, -1):
        h.tube([hc + Vector((0.6 * s, 0, 0.6)), hc + Vector((1.5 * s, 0.2, 1.3)), hc + Vector((1.7 * s, -0.4, 2.3))], [0.3, 0.2, 0.0], mat="horn", seg=7, n=3)
    t = r.parts["torso"]
    for s in (1, -1):
        bat_wing(t, (0.8 * s, J["back"][1], J["z"]["sh"]), s, 9.0, 5.8, raise_deg=28, sweep_deg=22, bone="horn", arm="horn")
    for s, side in SIDES:
        hd = r.parts["hand_" + side]
        W, d = J["wr_" + side], J["hand_dir_" + side]
        for k in range(3):
            pts = [W + d * 0.5, W + d * 1.6 + Vector((0.6 * (k - 1), 0, 0.4)), W + d * 2.5 + Vector((1.2 * (k - 1), -0.5, 1.0))]
            hd.tube(pts, [0.3, 0.24, 0.2], mat="snake", seg=7, n=3)
            snake_head(hd, pts[-1], pts[-1] - pts[-2], s=2.0, jaw=40, mat="snake")
    sp = r.P("serpents", J["hip"], "pelvis")
    hp = V(J["hip"])
    for k in range(10):
        a = 2 * math.pi * k / 10 + 0.3
        d = Vector((math.cos(a), math.sin(a), 0))
        pts = [hp + d * 0.8 + Vector((0, 0, 0.3)), hp + d * 2.5 + Vector((0, 0, -3.0)), hp + d * 4.6 + Vector((0, 0, -6.5)), hp + d * 6.6 + Vector((0, 0, -7.6)), hp + d * 7.8 + Vector((0.6 * d.y, -0.6 * d.x, -6.8))]
        sp.tube(pts, [1.1, 0.95, 0.75, 0.55, 0.45], mat="snake", seg=9, n=4)
        snake_head(sp, pts[-1], pts[-1] - pts[-2] + Vector((0, 0, 0.6)), s=3.2, jaw=35, mat="snake")


def b_samael(r):
    """Pale angel with white hair, great white-gold wings, a red sash and robe, a glowing curved blade raised."""
    J = humanoid(r, 3.2, bulk=0.95, legs="human", arm_pose={"L": (20, 20, 25), "R": (150, 10, 10)}, body_mat="skin")
    h = r.parts["head"]
    hc = V(J["head_c"])
    h.ell(hc, (0.13, 0.15, 0.17), mat="skin")
    face(h, hc, 3.2)
    long_hair(h, hc, 3.2, 0.6, 0.14)
    arc = [hc + Vector((math.cos(a) * 0.42, 0.22, 0.34 + math.sin(a) * 0.42)) for a in [math.radians(40 + 22 * i) for i in range(14)]]
    h.tube(arc, 0.025, mat="glow", seg=5, n=2)
    p = r.parts["pelvis"]
    p.tube([V(J["hip"]) + Vector((0, 0, 0.15)), V(J["hip"]), (0, 0.02, 0.5)], [0.3, 0.36, 0.48], mat="cloth", seg=12, n=3, cap=False)
    t = r.parts["torso"]
    t.tube([V(J["sh_L"]) + Vector((0, -0.02, 0.05)), V(J["chest"]) + Vector((0, -0.2, 0)), V(J["waist"]) + Vector((-0.25, -0.1, 0))], 0.07, mat="cloth", seg=6, n=3, squash=0.4)
    for s in (1, -1):
        feather_wing(t, (0.12 * s, J["back"][1], J["z"]["sh"] + 0.05), s, 4.4, 2.2, raise_deg=58, sweep_deg=18, feathers=11, tip_mat="accent", arm="membrane")
        feather_wing(t, (0.1 * s, J["back"][1], J["z"]["chest"] - 0.2), s, 2.6, 1.3, raise_deg=-20, sweep_deg=30, feathers=8, tip_mat="accent", arm="membrane")
    hd = r.parts["hand_R"]
    W, d = J["wr_R"], J["hand_dir_R"]
    top = W + d * 1.4
    hd.limb(W - d * 0.6, top, 0.03, 0.03, mat="metal", seg=6, joints=False)
    hd.tube([top, top + Vector((0.5, -0.1, 0.25)), top + Vector((1.05, -0.1, -0.05)), top + Vector((1.25, -0.05, -0.55))], [0.06, 0.07, 0.04, 0.0], mat="glow", seg=6, n=4, squash=0.25)


def b_atlas(r):
    """Muscular titan with a white beard and loincloth, holding the blue-green world on his shoulders."""
    J = humanoid(r, 9.0, bulk=1.5, legs="human", arm_pose={"L": (150, 20, 50), "R": (150, 20, 50)}, leg_pose={"L": (25, 30), "R": (-15, 10)}, neck_scale=0.6, body_mat="skin")
    h = r.parts["head"]
    hc = V(J["head_c"])
    h.ell(hc, (0.5, 0.55, 0.6), mat="skin")
    face(h, hc, 9.0)
    beard(h, hc + Vector((0, -0.4, -0.3)), 1.1, 0.38)
    long_hair(h, hc, 9.0, 1.6, 0.45)
    t = r.parts["torso"]
    t.ell((0, 0.9, J["H"] + 2.0), 2.7, mat="globe", seg=32, rings=20)
    p = r.parts["pelvis"]
    p.tube([V(J["hip"]) + Vector((0, 0, 0.3)), V(J["hip"]) + Vector((0, 0, -0.5)), V(J["hip"]) + Vector((0, -0.1, -1.3))], [1.0, 1.05, 0.9], mat="cloth", seg=12, n=2)
    t.tube([V(J["sh_L"]) + Vector((0, -0.1, 0.1)), V(J["chest"]) + Vector((0, -0.75, 0.0)), V(J["waist"]) + Vector((-0.9, -0.4, 0))], 0.22, mat="cloth", seg=6, n=3, squash=0.4)


def _horse(r, wings, horn):
    Q = quad(r, 1.65, 1.9, 0.55, 0.7, 0.055, front="hoof", hind="hoof", foot_mat="hoof")
    nb = V(Q["neck_base"])
    hp = nb + Vector((0, -0.3, 0.75))
    n = r.P("head", nb, "body")
    n.tube([nb, nb + Vector((0, -0.12, 0.4)), hp], [0.22, 0.17, 0.13], seg=8, n=3)
    horse_head(n, hp + Vector((0, -0.05, 0.0)), fwd=(0, -1, -0.75), s=1.15)
    for i in range(8):
        p = lerp(tuple(nb), tuple(hp), i / 7)
        n.cone(V(p) + Vector((0, 0.1, 0.1)), V(p) + Vector((0.07 * (i % 2 * 2 - 1), 0.4, -0.12)), 0.07, mat="body2", seg=5)
    n.cone(hp + Vector((0, -0.05, 0.12)), hp + Vector((0, -0.3, -0.05)), 0.07, mat="body2", seg=5)
    if horn:
        hc = hp + Vector((0, -0.12, 0.15))
        n.cone(hc, hc + Vector((0, -0.45, 0.55)), 0.045, mat="horn", seg=8)
    tl = r.P("tail", Q["tail_base"], "body")
    for k in (-0.06, 0.0, 0.06):
        tail_tube(tl, [Q["tail_base"], (k, 1.25, 1.25), (k * 2, 1.5, 0.8), (k * 3, 1.45, 0.25)], 0.07, 0.0, mat="body2")
    if wings:
        b = r.parts["body"]
        for s in (1, -1):
            feather_wing(b, (0.22 * s, -0.35, Q["H"] + 0.05), s, 2.5, 1.3, raise_deg=50, sweep_deg=15, feathers=9, mat="membrane", tip_mat="accent", arm="membrane")


def b_pegasus(r):
    """White winged horse with a white mane."""
    _horse(r, True, False)


def b_unicorn(r):
    """Blue-grey horse with a rose mane and an ivory spiral horn."""
    _horse(r, False, True)


# ---------------------------------------------------------------- colours from the reference sheets
# Hex or (top, bottom): the second colour is the underside. Eyes of enemies glow amber (v1 enemy marker).

COLORS = {
    "imp": {"body": ("#e8d2c8", "#cfb0a4"), "membrane": "#e6a0c4", "claw": "#7c5c5c"},
    "hellhound": {"body": "#1c2232", "veins": "#46e6ff", "body2": "#1c2232", "horn": "#ecebe2", "eye": "#8ff6ff", "snake": ("#1e2638", "#33405e"), "mouth": "#7a1d24", "claw": "#d8d6cc"},
    "harpy": {"skin": "#dcae94", "body": "#dcae94", "hair": "#3b2a22", "membrane": ("#f3f6fa", "#d8e2ee"), "accent": "#3d6fb6", "leg": "#a8703c", "claw": "#2e2826"},
    "centaur": {"body": ("#7a3e22", "#5e2e18"), "skin": "#d9a37a", "hair": "#eeeeee", "body2": "#e8a878", "cloth": "#4a3020", "wood": "#8a5a2a", "hoof": "#2e2622", "horn": "#d8d0c0"},
    "naga": {"body": ("#2f6b55", "#d9c06a"), "membrane": "#d0803a", "accent": "#c8502a", "horn": "#eadba4", "hair": "#e0c25a", "mouth": "#8a2a1e"},
    "minotaur": {"skin": ("#9c4c30", "#8a3e28"), "hair": "#4a2418", "horn": "#ece2c8", "nose": "#5a2a20", "cloth": "#3a2a20", "hoof": "#2a2220"},
    "cyclops": {"skin": ("#d49a6a", "#c08458"), "cloth": "#6a4a30", "strap": "#4a3020", "wood": "#8a5a30", "metal": "#9a9aa0", "horn": "#ece4d0", "sclera": "#f2eee8"},
    "medusa": {"skin": "#86bb62", "hair": "#c47a3a", "snake": ("#8aa040", "#d8d090"), "cloth": "#f2efe6", "horn": "#f0f0e0"},
    "chimera": {"body": ("#b8843c", "#d8b07a"), "body2": "#e8dcc0", "goat": "#8a7c6c", "horn": "#3a3028", "snake": ("#2b4a8c", "#d8b040"), "mouth": "#7a2020", "nose": "#3a2a24"},
    "succubus": {"skin": "#cfc9d2", "hair": "#ece8ef", "armor": "#2b2731", "membrane": "#8a3e52", "horn": "#3a3238", "glow": "#5fe0a0"},
    "incubus": {"skin": "#a9a1aa", "hair": "#e8e4ea", "armor": "#26242c", "membrane": "#7a3a52", "horn": "#3a3238", "glow": "#5fe0a0"},
    "griffin": {"body": ("#c39256", "#d8b080"), "body2": ("#8a5a34", "#e2d2b4"), "membrane": ("#6e4a2c", "#d6c2a0"), "accent": "#3a2a1e", "horn": "#e0b040", "beakleg": "#e0b040", "claw": "#2a2420"},
    "hippogriff": {"body": ("#9a7a52", "#b89a72"), "body2": ("#a07a48", "#e0cca8"), "membrane": ("#8a6438", "#d8c4a0"), "accent": "#4a3420", "hair": "#5a4028", "horn": "#e0b040", "beakleg": "#e0b040", "claw": "#2a2420", "hoof": "#3a3028"},
    "phoenix": {"body": ("#d0381c", "#ff7a2a"), "membrane": "#e8501c", "accent": "#ffb030", "horn": "#f0c040", "glow": "#ffd060",
                "emissive": {"body": ("#ff4a1a", 1.2), "membrane": ("#ff5a1a", 2.0), "accent": ("#ffa020", 3.5)}},
    "dragon": {"body": ("#9a2618", "#d8a878"), "membrane": "#d89a6a", "accent": "#6a160e", "horn": "#e8dcc0", "mouth": "#5a0e0a"},
    "hydra": {"body": ("#56664c", "#a0a884"), "membrane": "#a0aca0", "accent": "#3e4a38", "horn": "#d8d8c8", "mouth": "#5a1e1a"},
    "cerberus": {"body": ("#9a92ae", "#bcb4cc"), "collar": "#1c1c20", "metal": "#d0d0d8", "horn": "#f2f0ea", "mouth": "#a01c22", "nose": "#2a2430", "claw": "#3a3440"},
    "lilith": {"skin": "#e2b9a2", "hair": "#2a1a18", "cloth": "#4b3b7c", "snake": ("#b02a20", "#e0a070"), "membrane": "#3a1a20", "horn": "#2a1a1a", "mouth": "#5a0e0a"},
    "typhon": {"skin": ("#d0903a", "#b87a30"), "hair": "#4a4a4a", "membrane": "#6a6a72", "snake": ("#b07a30", "#e0c080"), "horn": "#e8dcc0"},
    "samael": {"skin": "#e6c8b0", "hair": "#f0eeea", "membrane": ("#f4eee0", "#d8ccb0"), "accent": "#d8c08a", "cloth": "#a02a20", "glow": "#ffd88a", "metal": "#d8c08a"},
    "atlas": {"skin": ("#c8905a", "#b07a48"), "hair": "#ecebe6", "cloth": "#f0eee8"},
    "pegasus": {"body": ("#f6f6f8", "#d8d8e2"), "body2": "#ffffff", "membrane": ("#fdfdff", "#e6e8f0"), "accent": "#eef0f6", "hoof": "#cfc6b4", "nose": "#d8c8c8", "eye": "#6aa8ff"},
    "unicorn": {"body": ("#8aa6c4", "#b8cce0"), "body2": "#c87898", "horn": "#f2ead8", "hoof": "#4a5060", "nose": "#6a7a90", "eye": "#6aa8ff"},
}


# ---------------------------------------------------------------- registry

ROSTER = [
    # key, name, builder, role, rank, zone, reference (file, crop x0 y0 x1 y1)
    ("imp", "Imp", b_imp, "Kerumunan (Husk)", "Prajurit", "I Hutan Pembuka", ("167518dd7ed83f5f910603744479.jpg", (38, 475, 262, 722))),
    ("hellhound", "Hellhound", b_hellhound, "Penerjang samping (Rift Hound)", "Prajurit", "I Hutan Pembuka", ("images (2).jpg", (60, 0, 330, 225))),
    ("harpy", "Harpy", b_harpy, "Penukik udara (Harrier)", "Prajurit", "II Tebing Berangin", ("z0jfasz4aizd1.jpeg", (680, 285, 955, 652))),
    ("centaur", "Centaur", b_centaur, "Pemanah (Spitter)", "Prajurit", "II Tebing Berangin", ("z0jfasz4aizd1.jpeg", (90, 285, 365, 652))),
    ("naga", "Naga rawa", b_naga, "Penyembur air (Spitter air)", "Prajurit", "III Rawa Berkabut", ("167518dd7ed83f5f910603744479.jpg", (705, 398, 1045, 626))),
    ("minotaur", "Minotaur", b_minotaur, "Perisai depan (Warden)", "Ksatria", "IV Reruntuhan Kuil", ("z0jfasz4aizd1.jpeg", (390, 715, 660, 1052))),
    ("cyclops", "Cyclops", b_cyclops, "Pelempar batu (Bombard)", "Ksatria, elit Jenderal", "IV Reruntuhan Kuil", ("z0jfasz4aizd1.jpeg", (950, 715, 1245, 1052))),
    ("medusa", "Medusa", b_medusa, "Penyihir mini-boss", "Jenderal", "III Rawa Berkabut", ("z0jfasz4aizd1.jpeg", (690, 715, 950, 1052))),
    ("chimera", "Chimera", b_chimera, "Mini-boss (Rift Lord)", "Jenderal", "III Rawa Berkabut", ("images (5).jpg", (0, 0, 715, 429))),
    ("succubus", "Succubus", b_succubus, "Elit penyumon", "Ksatria elit", "IV Reruntuhan Kuil", ("167518dd7ed83f5f910603744479.jpg", (255, 1178, 476, 1422))),
    ("incubus", "Incubus", b_incubus, "Elit penyumon", "Ksatria elit", "IV Reruntuhan Kuil", ("167518dd7ed83f5f910603744479.jpg", (38, 1178, 258, 1422))),
    ("griffin", "Griffin", b_griffin, "Penukik elit udara", "Ksatria", "II Tebing Berangin", ("167518dd7ed83f5f910603744479.jpg", (550, 725, 1005, 1048))),
    ("hippogriff", "Hippogriff", b_hippogriff, "Penukik elit udara", "Ksatria", "II Tebing Berangin", ("167518dd7ed83f5f910603744479.jpg", (535, 1145, 1015, 1414))),
    ("phoenix", "Phoenix", b_phoenix, "Elit Meledak", "Jenderal", "V Lembah Bara", ("167518dd7ed83f5f910603744479.jpg", (48, 848, 478, 1073))),
    ("dragon", "Dragon", b_dragon, "Set-piece Tier V", "Marsekal", "V Lembah Bara", ("167518dd7ed83f5f910603744479.jpg", (290, 457, 666, 667))),
    ("hydra", "Hydra", b_hydra, "Boss 1, tiga fase", "Marsekal", "III Danau Hitam", ("images (1).jpg", (0, 0, 431, 464))),
    ("cerberus", "Cerberus besar", b_cerberus, "Boss Tier V", "Marsekal", "V Lembah Bara", ("z0jfasz4aizd1.jpeg", (395, 285, 665, 652))),
    ("lilith", "Lilith", b_lilith, "Boss Tier V", "Marsekal", "V Lembah Bara", ("167518dd7ed83f5f910603744479.jpg", (85, 1525, 491, 1830))),
    ("typhon", "Typhon", b_typhon, "Boss akhir (di luar v1)", "Marsekal", "Cadangan", ("z0jfasz4aizd1.jpeg", (665, 1145, 960, 1495))),
    ("samael", "Samael", b_samael, "Boss akhir (di luar v1)", "Marsekal", "Cadangan", ("167518dd7ed83f5f910603744479.jpg", (590, 1535, 980, 1827))),
    ("atlas", "Atlas", b_atlas, "Cadangan (di luar v1)", "Marsekal", "Cadangan", ("z0jfasz4aizd1.jpeg", (385, 1145, 650, 1495))),
    ("pegasus", "Pegasus", b_pegasus, "Satwa hutan, tunggangan opsional", "Bukan musuh", "Seluruh hutan", ("z0jfasz4aizd1.jpeg", (950, 1145, 1260, 1495))),
    ("unicorn", "Unicorn", b_unicorn, "Penjaga altar", "Bukan musuh", "Altar", ("167518dd7ed83f5f910603744479.jpg", (410, 30, 669, 376))),
]

ROSTER_BY_KEY = {row[0]: row for row in ROSTER}
ROLE, RANK, ZONE, REF = 3, 4, 5, 6


def ilyra_palette():
    return {
