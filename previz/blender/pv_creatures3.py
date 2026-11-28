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
    K2.head_ball(h, hc, 2.3, "skin", k=1.1)
    face(h, hc, 2.5)
    beard(h, hc + Vector((0, -0.08, -0.1)), 0.3, 0.1)
    long_hair(h, hc, 2.3, 0.4, 0.09)
    K2.fur_on(r.parts["torso"], V(J["chest"]) + Vector((0, -0.18, 0.15)), V(J["waist"]) + Vector((0, -0.16, -0.1)), 10, 0.07, mat="hair")
    tl = r.P("tail", Q["tail_base"], "body")
    tb = V(Q["tail_base"])
    for k in (-0.08, 0.0, 0.08):
        tail_tube(tl, [tb, tb + Vector((k, 0.45, 0.45)), tb + Vector((k * 2, 0.9, 0.2)), tb + Vector((k * 3, 1.25, 0.55)), tb + Vector((k * 3, 1.6, 0.3))], 0.09, 0.0, mat="hair")


def b_aquilon(r):
    """The eagle-headed warrior: a white-feathered eagle head, gold-trimmed armour, a cape, wings to fly, a spear."""
    H = 2.4
    J = humanoid(r, H, bulk=1.15, legs="human", arm_pose={"L": (20, 15, 30), "R": (25, 60, 70)}, leg_pose={"L": (10, 8), "R": (-8, 6)},
                 body_mat="skin", shin_mat="armor", foot_mat="armor")
    h = r.parts["head"]
    hc = V(J["head_c"])
    eagle_head(h, hc, fwd=(0, -1, 0), s=1.25, mat="feather")
    t = r.parts["torso"]
    t.ell(V(J["chest"]) + Vector((0, -0.01, 0.0)), (J["sw"] * 1.05, H * 0.085, H * 0.11), mat="armor")
    t.torus(V(J["waist"]) + Vector((0, 0, 0.0)), J["sw"] * 0.75, 0.035, mat="gold", seg=16)
    t.poly([V(J["sh_L"]) + Vector((0, 0.1, 0.05)), V(J["sh_R"]) + Vector((0, 0.1, 0.05)), Vector((-0.45, 0.35, 0.25)), Vector((0.45, 0.35, 0.25))], mat="cloth")
    for sd, side in SIDES:
        K2.back_wing(r, "wing_" + side, (0.1 * sd, J["back"][1], J["z"]["sh"] - 0.05), sd, "feather", 2.2, 1.1, raise_deg=35, sweep_deg=20, feathers=10, tilt=58,
                     mat="feather", tip_mat="accent", arm="feather")
    hd = r.parts["hand_R"]
    W, d = J["wr_R"], J["hand_dir_R"]
    spear = Vector((0.05, -0.3, 1)).normalized()
    hd.limb(W - spear * 0.9, W + spear * 1.6, 0.03, 0.03, mat="wood", seg=6, joints=False)
    hd.cone(W + spear * 1.6, W + spear * 1.95, 0.06, mat="metal", seg=6)


def b_duyung(r):
    """The mermaid: long dark hair falling over her chest, pale skin, a dark scaled fish tail with a fan."""
    H = 2.1
    J = humanoid(r, H, bulk=0.8, legs=None, female=True, arm_pose={"L": (25, 20, 30), "R": (30, 35, 45)}, body_mat="skin")
    h = r.parts["head"]
    hc = V(J["head_c"])
    K2.head_ball(h, hc, H, "skin")
    face(h, hc, H)
    long_hair(h, hc, H, 0.9, 0.11)
    for k in (1, -1):
        h.tube([hc + Vector((0.07 * k, -0.02, 0.0)), hc + Vector((0.1 * k, -0.08, -0.25)), hc + Vector((0.09 * k, -0.11, -0.55))], [0.05, 0.06, 0.0], mat="hair", seg=6, n=3, squash=0.5)
    hp = V(J["hip"])
    tl = r.P("tail", hp, "pelvis")
    pts = [hp + Vector((0, 0, 0.08)), hp + Vector((0, 0.1, -0.5)), Vector((0, 0.6, 0.18)), Vector((0, 1.3, 0.15)), Vector((0.1, 1.9, 0.3)), Vector((0.1, 2.3, 0.6))]
    tl.tube(pts, [0.17, 0.19, 0.17, 0.13, 0.08, 0.04], mat="scale", seg=10, n=4)
    tip = V(pts[-1])
    tl.poly([tip, tip + Vector((0.3, 0.35, 0.35)), tip + Vector((0.0, 0.2, 0.05)), tip + Vector((-0.3, 0.35, 0.35))], mat="fin")


def b_aries(r):
    """Stand-in for the ram-horned demon: great curled ram horns on a bony skull face, white bristles on the neck and
    shoulders, a heavy body on goat legs (the owner designs the real body)."""
    H = 3.0
    J = humanoid(r, H, bulk=1.45, legs="hoof", arm_pose={"L": (25, 25, 40), "R": (25, 30, 40)}, leg_pose={"L": (8, 15), "R": (-6, 12)},
                 neck_scale=0.7, body_mat="skin", leg_mat="fur", foot_mat="hoof")
    h = r.parts["head"]
    hc = V(J["head_c"])
    h.ell(hc, (0.16, 0.2, 0.18), mat="bone")
    h.limb(hc + Vector((0, -0.12, -0.04)), hc + Vector((0, -0.32, -0.1)), 0.11, 0.07, mat="bone")
    h.ell(hc + Vector((0, -0.12, 0.05)), (0.035, 0.02, 0.025), mat="eye", seg=8, rings=5)
