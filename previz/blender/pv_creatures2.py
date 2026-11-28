"""Block-outs of the second batch of creatures (owner, 28 Nov 2026: assets/Monster pt2). The sheets are
old bestiary engravings in black ink, so the anatomy and props follow them closely while the colours
are chosen per creature (owner, phase 0: no look-alike colours). Modelled from primitives, never traced.

Importing this module registers the creatures with pv_creatures (COLORS, ROSTER_BY_KEY), so
export_glb.py and build_pt2.py can build them like the first roster."""
import math

from mathutils import Vector

import pv_creatures as K
from pv_common import V
from pv_creatures import (SIDES, UP, _dir_rot, _rx, bat_wing, beard, dog_head, dragon_head, eagle_head, face, feather_wing,
                          humanoid, lerp, long_hair, quad, snake_head, spikes, tail_tube)


# ---------------------------------------------------------------- helpers

def head_ball(part, hc, H, mat="skin", k=1.0):
    s = H / 1.9 * k
    part.ell(hc, (0.088 * s, 0.1 * s, 0.115 * s), mat=mat)
    return s


def goat_horns(part, hc, s, mat="horn", length=1.0, spread=1.0):
    for k in (1, -1):
        part.tube([hc + Vector((0.05 * k * s, -0.02 * s, 0.08 * s)), hc + Vector((0.1 * k * s * spread, 0.06 * s, 0.2 * s * length)),
                   hc + Vector((0.13 * k * s * spread, 0.2 * s * length, 0.24 * s * length))], [0.03 * s, 0.02 * s, 0.0], mat=mat, seg=6, n=3)


def pointed_ears(part, hc, s, mat="skin", length=0.16):
    for k in (1, -1):
        part.cone(hc + Vector((0.08 * k * s, 0.01 * s, 0.02 * s)), hc + Vector((0.08 * k * s + length * k * s, 0.05 * s, 0.09 * s)), 0.03 * s, mat=mat, seg=5)


def claws(part, W, d, n=3, length=0.12, r=0.007, spread=0.025):
    for i in range(n):
        a = (i - (n - 1) / 2) * spread
        part.cone(W + d * 0.05 + Vector((a, 0, 0)), W + d * (0.05 + length) + Vector((a * 1.5, -0.02, 0)), r, mat="claw", seg=4)


def wild_hair(part, hc, s, n=16, length=0.3, mat="hair", up=0.4):
    for i in range(n):
        a = 2 * math.pi * i / n
        d = Vector((math.cos(a), 0.35 + 0.3 * math.sin(a * 2), math.sin(a) * 0.8 + up)).normalized()
        base = hc + d * 0.08 * s
        part.cone(base, base + d * length * s * (0.75 + 0.35 * math.sin(i * 1.7) ** 2), 0.045 * s, mat=mat, seg=5)


def lion_face(part, at, fwd=(0, -1, 0), s=1.0, mat="body", mane_mat="body2", mane=1.0, jaw_open=12):
    """A lion's face as the engravings draw it: round skull, short broad muzzle, flat nose, small round
    ears, and a ring of mane (mane scales its length; 0 for none)."""
    a, F = V(at), Vector(fwd).normalized()
    side = F.cross(UP).normalized()
    part.ell(a, (0.2 * s, 0.19 * s, 0.2 * s), mat=mat)
    m = a + F * 0.15 * s - UP * 0.05 * s
    part.ell(m, (0.12 * s, 0.09 * s, 0.08 * s), mat=mat)
    part.ell(m + F * 0.07 * s + UP * 0.04 * s, (0.05 * s, 0.03 * s, 0.03 * s), mat="nose" if "nose" in part.rig.pal else "horn", seg=8, rings=5)
    jd = F * math.cos(math.radians(jaw_open)) - UP * math.sin(math.radians(jaw_open))
    j0 = a + F * 0.08 * s - UP * 0.12 * s
    part.limb(j0, j0 + jd * 0.12 * s, 0.08 * s, 0.06 * s, mat=mat)
    if "mouth" in part.rig.pal:
        part.ell(m + F * 0.05 * s - UP * 0.07 * s, (0.07 * s, 0.03 * s, 0.025 * s), mat="mouth", seg=8, rings=5)
    for k in (-1, 1):
        part.ell(a + F * 0.16 * s + UP * 0.07 * s + side * 0.075 * s * k, (0.03 * s, 0.02 * s, 0.022 * s), mat="eye", seg=8, rings=5)
        part.ell(a + F * 0.15 * s + UP * 0.11 * s + side * 0.08 * s * k, (0.045 * s, 0.02 * s, 0.015 * s), mat=mat, seg=6, rings=4)
        part.ell(a + UP * 0.17 * s + side * 0.15 * s * k, (0.05 * s, 0.03 * s, 0.05 * s), mat=mat, seg=8, rings=5)
    if mane > 0:
        n = 18
        for i in range(n):
            ang = 2 * math.pi * i / n
            d = side * math.cos(ang) + UP * math.sin(ang)
            base = a - F * 0.04 * s + d * 0.16 * s
            part.cone(base, base + (d * 0.3 - F * 0.12) * s * mane * (0.8 + 0.3 * math.sin(i * 2.1) ** 2), 0.08 * s, mat=mane_mat, seg=5)
        part.ell(a - F * 0.12 * s, (0.27 * s, 0.2 * s, 0.28 * s), mat=mane_mat, seg=10, rings=7)


def back_wing(r, name, root, s, kind, span, chord, **kw):
    """A wing on its own part (wing_L / wing_R), pivoted at its root on the back, so the game can beat it."""
    w = r.P(name, root, "torso")
    if kind == "bat":
        bat_wing(w, root, s, span, chord, **kw)
    else:
        feather_wing(w, root, s, span, chord, **kw)
    return w


def extra_arm(r, J, side, s, z_off, pose, H, bulk, mat="skin"):
    """A second pair of arms below the first (the Tetrachiron), named upperarm2_* / forearm2_* / hand2_*."""
    ab, fw, el = pose
    S = V(J["sh_" + side]) + Vector((-s * 0.02 * H, 0, -z_off))
    d1 = _rx(Vector((s * math.sin(math.radians(ab)), 0, -math.cos(math.radians(ab)))), -fw)
    d2 = _rx(d1, -el)
    E = S + d1 * (0.17 * H)
    W = E + d2 * (0.15 * H)
    T = W + d2 * (0.08 * H)
    ua = r.P("upperarm2_" + side, S, "torso")
    ua.ell(S, H * 0.036 * bulk, mat=mat)
    ua.limb(S, E, H * 0.028 * bulk, H * 0.023 * bulk, mat=mat)
    fa = r.P("forearm2_" + side, E, "upperarm2_" + side)
    fa.limb(E, W, H * 0.023 * bulk, H * 0.017 * bulk, mat=mat)
    hd = r.P("hand2_" + side, W, "forearm2_" + side)
    hd.ell((W + T) / 2, (H * 0.02 * bulk, H * 0.015 * bulk, H * 0.042), rot=_dir_rot(d2), mat=mat)
    return W, d2


def fur_on(part, a, b, n, r, mat="fur", out=0.6):
    """Shaggy fur: tufts along a limb from a to b, pointing down and out."""
    a, b = V(a), V(b)
    axis = (b - a).normalized()
    side = axis.cross(Vector((0, 1, 0)))
    if side.length < 1e-3:
        side = Vector((1, 0, 0))
    side.normalize()
    fwd = axis.cross(side).normalized()
    for i in range(n):
        t = (i + 0.5) / n
        ang = i * 2.39996
        rv = side * math.cos(ang) + fwd * math.sin(ang)
        base = a.lerp(b, t) + rv * r * 0.8
        part.cone(base, base + rv * r * out + Vector((0, 0, -r * 2.2)), r * 0.7, mat=mat, seg=5)


def sword(part, W, d, length=1.1, mat="metal"):
    d = Vector(d).normalized()
    side = d.cross(Vector((0, 1, 0)))
    if side.length < 1e-3:
        side = Vector((1, 0, 0))
    side.normalize()
    part.limb(W - d * 0.1, W + d * 0.12, 0.025, 0.025, mat="wood", seg=6, joints=False)
    part.limb(W + d * 0.12 - side * 0.13, W + d * 0.12 + side * 0.13, 0.02, 0.02, mat="gold", seg=6, joints=False)
    tip = W + d * length
    base = W + d * 0.14
    part.poly([base - side * 0.045, base + side * 0.045, tip - d * 0.15 + side * 0.035, tip, tip - d * 0.15 - side * 0.035], mat=mat)


# ---------------------------------------------------------------- the batch

def b_septiceps(r):
    """Discordia, the allegory of discord (prompt no. 1): a muscular giant with five serpentine necks (from the
    viewer's left: a brooding man in profile, a snarling fox, a man behind a pale mask, a screaming face with
