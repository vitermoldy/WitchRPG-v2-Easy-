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
    wild hair, a bald old man in profile), four arms (money sack and dagger with a heart on the viewer's left,
    an open book and a sword at the hip on the right), a banner round the waist over a loincloth, and behind
    the two human legs a third taloned bird leg, a furry wolf leg and a bushy fox tail. The viewer's left is
    the creature's right (-X)."""
    H = 5.6
    J = humanoid(r, H, bulk=1.3, legs="human", arm_pose={"L": (55, 45, 70), "R": (55, 35, 60)}, leg_pose={"L": (-10, 6), "R": (14, 8)},
                 neck_scale=0.6, body_mat="skin", foot_mat="skin")
    for side, s in (("L", 1), ("R", -1)):
        extra_arm(r, J, side, s, 0.55, (25, 20, 40), H, 1.2)
    h = r.parts["head"]
    base = V(J["neck"]) + Vector((0, 0.05, 0.05))
    heads = [(-1.0, 0.55, "profile", -1), (-0.5, 0.9, "fox", 0), (0.0, 1.1, "mask", 0), (0.5, 0.9, "scream", 0), (1.0, 0.55, "bald", 1)]
    for dx, up, kind, look in heads:
        top = base + Vector((dx * 0.8, -0.05, up * 0.8 + 0.3))
        h.tube([base + Vector((dx * 0.15, 0, 0)), base + Vector((dx * 0.55, -0.02, up * 0.45 + 0.1)), top], [0.17, 0.13, 0.11], mat="skin", seg=8, n=3)
        if kind == "fox":
            dog_head(h, top + Vector((0, -0.08, 0.06)), fwd=(-0.2, -1, 0.1), s=1.25, jaw_open=28, ears=True, teeth=True, mat="fox")
            continue
        hc = top + Vector((0, -0.04, 0.16))
        s = head_ball(h, hc, H, "skin2" if kind in ("scream", "bald") else "skin", k=0.62)
        fwd = Vector((look * 0.9, -1 + abs(look) * 0.6, 0)).normalized()
        nose = hc + fwd * 0.11 * s
        h.cone(nose - fwd * 0.02, nose + fwd * 0.05, 0.022 * s, mat="skin", seg=5)
        for k in (-1, 1):
            side = Vector((fwd.y, -fwd.x, 0)) * 0.045 * k
            h.ell(hc + fwd * 0.08 * s + side * s + Vector((0, 0, 0.025 * s)), (0.016 * s, 0.01 * s, 0.012 * s), mat="eye", seg=8, rings=5)
        if kind == "profile":
            h.ell(hc + Vector((0, 0.04, 0.08)), (0.15, 0.15, 0.12), mat="hair")
            beard(h, hc + fwd * 0.08 + Vector((0, 0, -0.12)), 0.2, 0.07)
        elif kind == "mask":
            h.ell(hc + Vector((0, 0.04, 0.08)), (0.15, 0.15, 0.12), mat="hair")
            h.ell(hc + Vector((0, -0.13, 0.0)), (0.13, 0.03, 0.15), mat="mask")
        elif kind == "scream":
            wild_hair(h, hc, s, n=11, length=0.25)
            h.ell(hc + Vector((0, -0.12, -0.07)), (0.05, 0.03, 0.06), mat="mouth")
        else:
            h.ell(hc + Vector((0, 0.06, -0.02)), (0.13, 0.1, 0.06), mat="hair")
    t = r.parts["torso"]
    hp = V(J["hip"])
    # the banner of the vices round the waist, over the loincloth
    t.torus(V(J["waist"]) + Vector((0, 0, -0.1)), J["sw"] * 0.85, 0.07, mat="cloth", seg=18, rseg=4)
    t.tube([V(J["waist"]) + Vector((J["sw"] * 0.8, -0.2, -0.1)), hp + Vector((J["sw"] * 1.1, -0.45, -0.3)), hp + Vector((J["sw"] * 1.3, -0.4, -0.9))], 0.13, mat="cloth", seg=6, n=3, squash=0.3)
    p = r.parts["pelvis"]
    p.tube([hp + Vector((0, 0, 0.18)), hp + Vector((0, 0, -0.15)), hp + Vector((0, -0.05, -0.5))], [0.5, 0.54, 0.4], mat="cloth2", seg=12, n=2)
    # behind the human legs: a bird of prey's leg and a wolf's leg, and the fox brush
    for name, x, mat in (("leg_bird", 0.25, "talon"), ("leg_wolf", -0.25, "fur")):
        lg = r.P(name, hp + Vector((x, 0.35, 0)), "pelvis")
        a = hp + Vector((x, 0.35, 0))
        k = hp + Vector((x * 1.3, 0.55, -1.3))
        f = Vector((x * 1.4, hp.y + 0.45, 0.15))
        lg.limb(a, k, 0.26, 0.18, mat="fur" if mat == "fur" else "skin")
        lg.limb(k, f, 0.16, 0.11, mat=mat)
        if mat == "talon":
            for ang in (-30, 0, 30):
                tip = Vector((f.x + math.sin(math.radians(ang)) * 0.45, f.y - math.cos(math.radians(ang)) * 0.45, 0.0))
                lg.cone(f, tip, 0.06, mat="claw", seg=5)
        else:
            fur_on(lg, a, k, 12, 0.2)
            for ang in (-25, 0, 25):
                tip = Vector((f.x + math.sin(math.radians(ang)) * 0.35, f.y - math.cos(math.radians(ang)) * 0.35, 0.0))
                lg.cone(f, tip, 0.05, mat="claw", seg=5)
    tl = r.P("tail", hp + Vector((0, 0.3, -0.1)), "pelvis")
    tail_tube(tl, [hp + Vector((0, 0.3, -0.1)), hp + Vector((0.1, 0.9, -0.8)), hp + Vector((0.05, 1.1, -1.8)), hp + Vector((-0.1, 0.9, -2.5))], 0.22, 0.12, mat="fur")
    fur_on(tl, hp + Vector((0.05, 0.8, -0.6)), hp + Vector((0.0, 1.0, -2.3)), 12, 0.22)
    # upper right (viewer's left): a heavy money sack; lower right: a dagger and a heart
    W, d = J["wr_R"], J["hand_dir_R"]
    r.parts["hand_R"].ell(W + d * 0.3 + Vector((0, 0, -0.1)), (0.22, 0.2, 0.28), mat="cloth3")
    lw = r.parts["hand2_R"]
    W2 = lw.pivot + (lw.pivot - r.parts["forearm2_R"].pivot).normalized() * 0.15
    sword(lw, W2, Vector((0.1, -0.3, 1)), length=0.7)
    lw.ell(W2 + Vector((0, -0.15, -0.05)), (0.09, 0.07, 0.1), mat="heart")
    # upper left (viewer's right): an open book; lower left: a sword hilt at the hip
    W, d = J["wr_L"], J["hand_dir_L"]
    bk = r.parts["hand_L"]
    c = W + d * 0.2
    bk.poly([c + Vector((0, -0.05, 0)), c + Vector((0.35, -0.15, 0.1)), c + Vector((0.35, -0.15, 0.55)), c + Vector((0, -0.05, 0.45))], mat="page")
    bk.poly([c + Vector((0, -0.05, 0)), c + Vector((-0.35, -0.15, 0.1)), c + Vector((-0.35, -0.15, 0.55)), c + Vector((0, -0.05, 0.45))], mat="page")
    sw = r.parts["hand2_L"]
    W2 = sw.pivot + (sw.pivot - r.parts["forearm2_L"].pivot).normalized() * 0.15
    sword(sw, W2, Vector((0.05, -0.2, -1)), length=1.6)


def b_asmodeus(r):
    """Asmodeus of the Dictionnaire Infernal (prompt no. 15): three heads side by side, a bull's with short horns
    (viewer's left), a scowling bearded king with fangs and a spiked crown breathing rays of fire, and a ram's
    with curled horns; great bat wings; muscular arms; rooster-clawed legs and a coiled serpent tail; astride a
    crouching scaly beast with heavy clawed paws and a snarling lion face."""
    Q = quad(r, 2.1, 4.0, 1.6, 1.55, 0.17, front="paw", hind="paw", body_mat="body")
    b = r.parts["body"]
    b.ell(V(Q["chest"]) + Vector((0, -0.25, 0.05)), (0.8, 0.8, 0.85), mat="body")
    spikes(b, [lerp(Q["withers"], (0, Q["L"] * 0.45, Q["H"] * 0.95), i / 7) + Vector((0, 0, 0.3)) for i in range(8)], 0.35, 0.08, mat="body2", tilt=(0, 0.6, 1))
    nb = V(Q["neck_base"])
    hp = nb + Vector((-0.5, -0.45, -0.3))
    n = r.P("neck", nb, "body")
    n.limb(nb, hp, 0.45, 0.36, mat="body")
    lion_face(n, hp + Vector((0, -0.15, 0)), fwd=(-0.3, -1, -0.15), s=2.6, jaw_open=34, mat="body", mane_mat="body2", mane=0.6)
    J = humanoid(r, 3.1, bulk=1.3, legs=None, off=(0, -1.0, 0.75), arm_pose={"L": (35, 40, 50), "R": (35, 45, 55)}, neck_scale=0.7, body_mat="skin")
    # his own legs astride the beast, ending in rooster claws
    hpr = V(J["hip"])
    for s, side in SIDES:
        lg = r.P("rider_leg_" + side, hpr + Vector((0.25 * s, 0, 0)), "pelvis")
        k = hpr + Vector((0.85 * s, -0.4, -0.35))
        f = hpr + Vector((0.95 * s, -0.1, -1.2))
        lg.limb(hpr + Vector((0.25 * s, 0, 0)), k, 0.17, 0.13, mat="skin")
        lg.limb(k, f, 0.12, 0.08, mat="scale")
        for ang in (-35, 0, 35):
            lg.cone(f, f + Vector((math.sin(math.radians(ang)) * 0.25, -math.cos(math.radians(ang)) * 0.25, -0.1)), 0.035, mat="claw", seg=5)
        lg.cone(f, f + Vector((0, 0.18, -0.05)), 0.03, mat="claw", seg=5)
    h = r.parts["head"]
    hc = V(J["head_c"]) + Vector((0, 0, 0.05))
    head_ball(h, hc, 3.1, "skin")
    face(h, hc, 3.1)
    h.ell(hc + Vector((0, -0.13, -0.12)), (0.1, 0.06, 0.06), mat="mouth")
    for k in (-1, 1):
        h.cone(hc + Vector((0.04 * k, -0.15, -0.09)), hc + Vector((0.04 * k, -0.16, -0.17)), 0.016, mat="horn", seg=4)
    beard(h, hc + Vector((0, -0.12, -0.16)), 0.45, 0.12, mat="hair")
    # rays of fire from the king's mouth
    for i in range(5):
        a = math.radians(-24 + 12 * i)
        o = hc + Vector((0, -0.16, -0.12))
        h.cone(o, o + Vector((math.sin(a) * 0.5, -1.1, -0.35 + 0.08 * (i % 2))), 0.05, mat="fire", seg=5)
    c0 = hc + Vector((0, 0, 0.14))
    h.torus(c0, 0.15, 0.03, mat="gold", seg=14, rseg=4)
    for i in range(7):
        a = 2 * math.pi * i / 7
        p0 = c0 + Vector((math.cos(a) * 0.15, math.sin(a) * 0.15, 0))
        h.cone(p0, p0 + Vector((0, 0, 0.17 + 0.06 * (i % 2))), 0.035, mat="gold", seg=4)
    # bull head on the viewer's left (the creature's right, -X), ram head on the right
    for s, kind in ((-1, "bull"), (1, "ram")):
        a = hc + Vector((0.42 * s, 0.08, -0.08))
        h.limb(V(J["neck"]) + Vector((0.12 * s, 0, 0)), a, 0.15, 0.12, mat=kind)
        h.ell(a, (0.17, 0.22, 0.18), mat=kind)
        h.limb(a + Vector((0, -0.12, -0.02)), a + Vector((0.04 * s, -0.42, -0.1)), 0.13, 0.1, mat=kind)
        h.ell(a + Vector((0.04 * s, -0.43, -0.1)), (0.1, 0.06, 0.08), mat="nose")
        for k in (-1, 1):
            h.ell(a + Vector((0.11 * k, -0.15, 0.06)), 0.03, mat="eye", seg=8, rings=5)
        if kind == "bull":
            for k in (-1, 1):
                h.tube([a + Vector((0.1 * k, 0, 0.12)), a + Vector((0.3 * k, -0.05, 0.18)), a + Vector((0.36 * k, -0.12, 0.32))], [0.06, 0.045, 0.0], mat="horn", seg=6, n=3)
        else:
            for k in (-1, 1):
                pts = [a + Vector((0.12 * k, 0.05, 0.1)) + Vector((0.18 * k * math.cos(t), 0.18 * math.sin(t), 0.12 * math.sin(t) - 0.05 * t)) for t in [i * 0.9 for i in range(7)]]
                h.tube(pts, [0.07 - 0.009 * i for i in range(7)], mat="horn", seg=6, n=2)
    t = r.parts["torso"]
    for s in (1, -1):
        bat_wing(t, (0.25 * s, J["back"][1], J["z"]["sh"] - 0.1), s, 3.4, 2.2, raise_deg=36, sweep_deg=24, bone="horn", arm="membrane")
    # the coiled serpent tail
    tl = r.P("tail", Q["tail_base"], "body")
    tb = V(Q["tail_base"])
    pts = [tb] + [tb + Vector((0.55 * math.cos(a), 0.9 + 0.55 * math.sin(a), -0.9 + 0.15 * a)) for a in [i * 0.8 for i in range(9)]]
    tl.tube(pts, [0.32 - 0.026 * i for i in range(len(pts))], mat="snake", seg=8, n=3)
    snake_head(tl, pts[-1], (0.2, -0.8, 0.5), s=1.3, jaw=40, mat="snake")


def b_buer(r):
    """Buer of the Dictionnaire Infernal (prompt no. 14): a lion's head with a thick shaggy mane, grimacing with the
    tongue out, no torso, five goat legs with cloven hooves radiating like spokes, shaggy tufts at the joints. It
    rolls like a wheel when it moves."""
    R = 1.02
    hub = r.P("hub", (0, 0, R), None)
    c = Vector((0, 0, R))
    lion_face(hub, c + Vector((0, -0.12, 0.02)), fwd=(0, -1, -0.05), s=1.9, jaw_open=24, mat="body", mane_mat="body2", mane=0.75)
    hub.limb(c + Vector((0, -0.38, -0.16)), c + Vector((0, -0.5, -0.3)), 0.07, 0.05, mat="mouth")
    for i in range(5):
        a = math.radians(i * 72)
        d = Vector((0.0, -math.sin(a), math.cos(a)))
        spread = (0.32 if i % 2 else -0.32) if i else 0.0
        side = Vector((spread, 0, 0))
        leg = r.P(f"leg{i}", c + d * 0.25 + side * 0.4, "hub")
        k0 = c + d * 0.3 + side * 0.4
        k1 = c + d * 0.62 + side * 0.8 + Vector((0, 0.06, 0)) * (1 if i % 2 else -1)
        k2 = c + d * (R - 0.08) + side
        leg.limb(k0, k1, 0.13, 0.09, mat="leg")
        fur_on(leg, k0, k1, 8, 0.12, mat="body2")
        fur_on(leg, k1, k1 + (k2 - k1) * 0.3, 4, 0.08, mat="body2")
        leg.limb(k1, k2, 0.07, 0.05, mat="leg")
        leg.limb(k2, c + d * (R + 0.07) + side, 0.07, 0.085, mat="hoof", joints=False)


def b_cacodaemon(r):
    """The winged dragon-demon (prompt nos. 4 and 18): a long snouted lizard-dog head with a toothy grin, a curled
    ram-like horn and a crest of curly hair, scrawny arms reaching forward with hooked talons, two small fleshy
    sacs on the chest, spotted ribbed bat wings, lean legs with shaggy fur on the thighs and shins, bird-of-prey
    talon feet and a long thin tail. The woodcuts show one wing; the far one is hidden, so it has two."""
    H = 2.1
    J = humanoid(r, H, bulk=0.8, legs="bird", arm_pose={"L": (25, 75, 30), "R": (20, 65, 45)}, leg_pose={"L": (25, 30), "R": (-5, 20)},
                 neck_scale=1.3, body_mat="body", leg_mat="body", foot_mat="claw")
    h = r.parts["head"]
    hc = V(J["head_c"]) + Vector((0, -0.02, 0.0))
    dog_head(h, hc, fwd=(0, -1, 0.05), s=1.05, jaw_open=22, ears=True, teeth=True, mat="body")
    pts = [hc + Vector((0.08, 0.05, 0.12)) + Vector((0.12 * math.cos(t), 0.1 + 0.12 * math.sin(t), 0.1 * math.sin(t))) for t in [i * 0.95 for i in range(6)]]
    h.tube(pts, [0.035 - 0.005 * i for i in range(6)], mat="horn", seg=5, n=2)
    wild_hair(h, hc + Vector((0, 0.05, 0.05)), 1.0, n=8, length=0.12, mat="body2", up=1.0)
    for s, side in SIDES:
        claws(r.parts["hand_" + side], J["wr_" + side], J["hand_dir_" + side], n=4, length=0.13)
        back_wing(r, "wing_" + side, (0.08 * s, J["back"][1], J["z"]["sh"] - 0.03), s, "bat", 1.9, 1.3, raise_deg=50, sweep_deg=30, bone="horn", arm="body")
        w = r.parts["wing_" + side]
        for k in range(6):
            p = Vector((s * (0.45 + 0.17 * (k % 3)), J["back"][1] + 0.35 + 0.1 * (k // 3), J["z"]["sh"] + 0.5 - 0.35 * (k // 3) + 0.1 * (k % 3)))
            w.ell(p, (0.05, 0.02, 0.07), mat="accent", seg=6, rings=4)
        fur_on(r.parts["thigh_" + side], V(J["hip"]) + Vector((J["hw"] * s, 0, 0)), J["knee_" + side], 8, 0.06, mat="body2")
    t = r.parts["torso"]
    t.ell(V(J["chest"]) + Vector((0, -0.05, -0.1)), (0.13, 0.08, 0.18), mat="body2")
    for k in (-1, 1):
        t.ell(V(J["chest"]) + Vector((0.06 * k, -0.12, -0.2)), (0.04, 0.04, 0.06), mat="body2")
    tl = r.P("tail", (0, 0.06, J["z"]["hip"]), "pelvis")
    hp = V(J["hip"])
    tail_tube(tl, [hp + Vector((0, 0.08, 0)), hp + Vector((0.1, 0.45, -0.45)), hp + Vector((0.25, 0.7, -0.95)), hp + Vector((0.1, 1.0, -1.05)), hp + Vector((-0.1, 1.15, -0.8))], 0.07, 0.01)


def b_cornutus(r):
    """The horned winged monster (prompt no. 2, Fig. XXVIII): a round grinning cat-like face with small round ears
    and one short horn on top, two feathered wings from the shoulders, an X above two V shapes and a crescent cut
    into the chest, legs scaled like a fish from the knees down; the foot on the viewer's left is a bird's
    talon, the other a human foot."""
    H = 2.3
    J = humanoid(r, H, bulk=1.2, legs="human", arm_pose={"L": (20, 15, 25), "R": (20, 15, 25)}, leg_pose={"L": (8, 6), "R": (-6, 4)},
                 body_mat="skin", shin_mat="scale", foot_mat="skin")
    h = r.parts["head"]
    hc = V(J["head_c"])
    h.ell(hc, (0.13, 0.12, 0.13), mat="skin")
    h.ell(hc + Vector((0, -0.08, -0.04)), (0.08, 0.05, 0.05), mat="skin")
    h.ell(hc + Vector((0, -0.12, -0.05)), (0.06, 0.02, 0.012), mat="mouth")
    for k in (-1, 1):
        h.ell(hc + Vector((0.045 * k, -0.11, 0.03)), (0.022, 0.014, 0.016), mat="eye", seg=8, rings=5)
        h.ell(hc + Vector((0.1 * k, 0.0, 0.11)), (0.04, 0.02, 0.04), mat="skin", seg=8, rings=5)
    h.cone(hc + Vector((0, -0.02, 0.12)), hc + Vector((0, 0.0, 0.24)), 0.025, mat="horn", seg=5)
    for sd, side in SIDES:
        back_wing(r, "wing_" + side, (0.08 * sd, J["back"][1], J["z"]["sh"] - 0.05), sd, "feather", 1.9, 1.0, raise_deg=35, sweep_deg=20, feathers=9, tilt=58,
                  mat="membrane", tip_mat="accent", arm="membrane")
