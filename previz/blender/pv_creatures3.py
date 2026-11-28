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
