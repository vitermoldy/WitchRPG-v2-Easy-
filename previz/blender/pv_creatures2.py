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
