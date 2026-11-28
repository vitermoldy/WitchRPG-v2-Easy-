"""Stand-in block-outs of the third batch (owner, 28 Nov 2026: assets/Prompt-3D-Monster-WitchRPG.md).
The owner makes the real models with an image-to-3D tool; until a GLB arrives the game uses these.
Importing this module registers them with pv_creatures, like pv_creatures2."""
import math

from mathutils import Vector

import pv_creatures as K
import pv_creatures2 as K2
from pv_common import V
from pv_creatures import SIDES, bat_wing, beard, dragon_head, eagle_head, face, feather_wing, humanoid, lerp, long_hair, quad, snake_head, spikes, tail_tube


def b_silenus(r):
    """The plump old satyr: small curved horns, a bearded face, a round pot belly, one hand pointing, shaggy goat legs."""
    H = 1.8
    J = humanoid(r, H, bulk=1.35, legs="hoof", arm_pose={"L": (20, 10, 15), "R": (35, 80, 5)}, leg_pose={"L": (10, 15), "R": (-8, 10)},
                 body_mat="skin", leg_mat="fur", foot_mat="hoof")
    t = r.parts["torso"]
    t.ell(V(J["waist"]) + Vector((0, -0.12, -0.04)), (0.26, 0.24, 0.22), mat="skin")
    h = r.parts["head"]
    hc = V(J["head_c"])
    s = K2.head_ball(h, hc, H, "skin", k=1.15)
    face(h, hc, H * 1.15)
    beard(h, hc + Vector((0, -0.09, -0.09)), 0.22, 0.07)
    K2.goat_horns(h, hc, s * 1.1, length=0.8)
    for side, a, b in (("L", V(J["hip"]) + Vector((J["hw"], 0, 0)), J["knee_L"]), ("R", V(J["hip"]) + Vector((-J["hw"], 0, 0)), J["knee_R"])):
        K2.fur_on(r.parts["thigh_" + side], a, b, 10, 0.09)
        K2.fur_on(r.parts["shin_" + side], J["knee_" + side], J["ankle_" + side], 6, 0.06)


def b_hippocentaurus(r):
    """The odd centaur of the woodcut: a hairy bearded torso with crossed arms joined straight onto a long, bloated
    horse body with no horse neck, thin legs and a long wavy tail."""
    Q = quad(r, 1.55, 2.9, 0.8, 1.05, 0.05, front="hoof", hind="hoof", foot_mat="hoof")
    b = r.parts["body"]
    b.ell((0, 0.1, Q["H"] - 0.4), (0.5, 1.45, 0.62))
    # a massive torso, the arms folded across the chest
    J = humanoid(r, 2.3, bulk=1.6, legs=None, off=(0, -1.35, 0.3), arm_pose={"L": (-35, 40, 55), "R": (-38, 45, 50)}, body_mat="skin")
    h = r.parts["head"]
    hc = V(J["head_c"])
