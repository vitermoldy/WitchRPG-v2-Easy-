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
