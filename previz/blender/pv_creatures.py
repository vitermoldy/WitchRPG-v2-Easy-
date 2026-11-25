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
