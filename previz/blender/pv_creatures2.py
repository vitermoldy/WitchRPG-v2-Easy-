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
