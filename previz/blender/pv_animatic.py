"""Animatic, 26 s at 24 fps: fly over the valley, drop to Ilyra's shoulder, walk the shore of
Danau Hitam, lock on to a swamp naga, and the Hydra rises. Every frame is keyed from Python."""
import math

import bpy
import numpy as np
from mathutils import Quaternion, Vector

import pv_common as C
import pv_creatures as K
import pv_shots as S
import pv_world as Wd
from pv_common import HEX, V

FPS = 24
T_FLY, T_DROP, T_WALK, T_NAGA, T_END = 7.0, 10.5, 16.0, 19.0, 26.0
FRAMES = int(T_END * FPS)


def ease(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def seg(t, a, b):
    return ease((t - a) / (b - a))


def look_quat(d):
    return Vector(d).normalized().to_track_quat("-Z", "Y")


def lock_quat(cam_loc, target, vfov, third=(1 / 3, 1 / 3)):
    tv = math.tan(math.radians(vfov) / 2)
    th = tv * 16 / 9
    d = V(target) - V(cam_loc)
    yaw = math.atan2(d.y, d.x) + math.atan(third[0] * th)
    pitch = math.atan2(d.z, math.hypot(d.x, d.y)) - math.atan(third[1] * tv)
    return look_quat((math.cos(yaw) * math.cos(pitch), math.sin(yaw) * math.cos(pitch), math.sin(pitch)))


def build(dunia, res=(1280, 720), samples=24):
    Sp = Vector((*Wd.SPOTS["hydra"], 0))
    H = Vector((*Wd.HYDRA_POS, 0))
    f = (H - Sp).normalized()
    left = Vector((0, 0, 1)).cross(f)
    A = Sp - f * 9.0
    sd = S.sun_dir(f, 12, 3.5)
    world = C.sky_world("langit_senja_anim", "#241f45", "#ff9a5c", "#1a1418", 1.0, sun_dir=sd, sun_glow="#ffb46a", glow_power=10)
    sc, local = S.shot_scene("animatic", dunia, world, -sd, "#ff9a5a", 3.2, res=res, vol_end=2200, samples=samples, exposure=0.2, vol_tile="8")
    sc.frame_start, sc.frame_end = 1, FRAMES
    sc.render.fps = FPS

    il = S.actor("aktor.ilyra.walk", "ilyra", "walk")
    il_i = C.instance(il.coll, local, name="ilyra.anim")
    naga = S.actor("aktor.naga.anim", "naga")
    Np = Sp + f * 9.0 + left * 6.5
    naga_i = C.instance(naga.coll, local, loc=(Np.x, Np.y, -3.4), rot_z=S.yaw_to((Sp - Np).normalized()), name="naga.anim")
    hy = S.actor("aktor.hydra.anim", "hydra")
    hy_i = C.instance(hy.coll, local, loc=(H.x, H.y, -17.0), rot_z=S.yaw_to(-f), name="hydra.anim")
    foam = C.collection("animatic.busa", local)
    S.foam_rings(foam, hy, type("I", (), {"matrix_basis": hy_i.matrix_basis.copy(), "location": Vector((H.x, H.y, 0))})())
    foam_obs = list(foam.objects)
    eye = C.point(local, "cahaya.mata_hydra.anim", (H.x, H.y, -10), HEX["rift"], energy=1500, radius=3)

    reticle = C.Rig("penanda_lockon", {"r": C.mat_emit("penanda", "#ff7a86", 6.0)}, local)
    rp = reticle.P("m")
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        c = Vector((math.cos(a), math.sin(a), 0)) * 0.55
        rp.box(c, (0.32, 0.06, 0.02), rot=(0, 0, math.degrees(a) + 90), mat="r")
    reticle.finalize()
    ret = reticle.root
    ret.scale = (0, 0, 0)

    cam = C.camera(sc, "kamera.animatic", (0, 0, 0), lens_vfov=S.CAM["normal"]["vfov"], clip=(0.05, 4000))
    cam.rotation_mode = "QUATERNION"
    tc = ret.constraints.new("TRACK_TO")
    tc.target = cam
    tc.track_axis = "TRACK_Z"
    tc.up_axis = "UP_Y"

    fly_pts = [Vector(p) for p in ((150, -680, 300), (60, -430, 240), (-70, -190, 180), (-170, 20, 120), (-215, 150, 60))]
    fly_curve, _ = C.catmull(fly_pts, 40)
    fly_look = [Vector((-150, 120, 0)), Vector((-300, 280, 15))]
    cn = S.CAM["normal"]
    head_rest = {}
    for name, ob in hy.objs.items():
        if name.startswith("head"):
            head_rest[name] = C.world_matrix(ob).translation.copy()
    hydra_yaw = math.radians(S.yaw_to(-f))
    rng = np.random.default_rng(1)

    def game_cam(P, face, dist=None, height=None):
        z = Wd.ground_z(P.x, P.y)
        loc, look = C.game_camera((P.x, P.y, z), face, dist or cn["dist"], cn["shoulder"], height or cn["height"], cn["pitch"])
        return loc, look

    def hydra_z(t):
        return -17.0 + 13.2 * seg(t, T_NAGA + 0.4, T_NAGA + 5.2)

    def hydra_head(t, name="head2"):
        p = head_rest[name]
        c, s = math.cos(hydra_yaw), math.sin(hydra_yaw)
        return Vector((H.x + p.x * c - p.y * s, H.y + p.x * s + p.y * c, hydra_z(t) + p.z))

    def il_pos(t):
        u = min(1.0, max(0.0, (t - T_DROP) / (T_WALK - T_DROP)))
        u = u * u * (3 - 2 * u) * 0.25 + u * 0.75
        return A.lerp(Sp, u)

    for fr in range(1, FRAMES + 1):
        t = (fr - 1) / FPS
        P = il_pos(t)
        walking = T_DROP <= t < T_WALK
        phase = (P - A).length / 1.35 * 2 * math.pi
        face = f.copy()
        if t >= T_WALK:
            face = f.lerp((Np - Sp).normalized(), 0.4 * seg(t, T_WALK, T_WALK + 0.8) * (1 - seg(t, T_NAGA + 1.0, T_NAGA + 2.5))).normalized()
        z = Wd.ground_z(P.x, P.y)
        bob = 0.025 * abs(math.sin(phase)) if walking else 0.0
        il_i.location = (P.x, P.y, z + bob)
        il_i.rotation_euler = (0, 0, math.radians(S.yaw_to(face)))
        il_i.keyframe_insert("location", frame=fr)
        il_i.keyframe_insert("rotation_euler", frame=fr)
        amp = 1.0 if walking else 0.0
        sw = math.sin(phase) * amp
        breath = 0.0 if walking else math.sin(t * 2.2) * 1.2
        poses = {
            "thigh_L": (-24 * sw, 0, 0), "thigh_R": (24 * sw, 0, 0),
            "shin_L": (max(0, 30 * math.sin(phase + 1.2)) * amp, 0, 0), "shin_R": (max(0, 30 * math.sin(phase + 1.2 + math.pi)) * amp, 0, 0),
            "upperarm_L": (14 * sw, 0, 0), "torso": (3 + breath, 0, 4 * sw), "pelvis": (0, 0, -3 * sw),
            "cloak": (5 + 3 * math.sin(phase * 2) * amp, 0, 0), "head": (-2, 0, -3 * sw),
        }
        for part, rot in poses.items():
            ob = il.objs.get(part)
            if ob:
                ob.rotation_euler = [math.radians(a) for a in rot]
                ob.keyframe_insert("rotation_euler", frame=fr)

        # naga: surfaces when she stops, dives as the lake rises
        nz = -3.4 + 3.0 * seg(t, T_WALK + 0.1, T_WALK + 1.3) - 3.4 * seg(t, T_NAGA + 0.9, T_NAGA + 2.1)
        naga_i.location.z = nz
        naga_i.keyframe_insert("location", frame=fr)
        nh = naga.objs.get("head")
        if nh:
            nh.rotation_euler = (math.radians(6 * math.sin(t * 3.1)), 0, math.radians(8 * math.sin(t * 1.7)))
            nh.keyframe_insert("rotation_euler", frame=fr)

        # hydra: rises with swaying necks
        hz = hydra_z(t)
        hy_i.location.z = hz
        hy_i.keyframe_insert("location", frame=fr)
        rise = seg(t, T_NAGA + 0.4, T_NAGA + 5.2)
        for name, ob in hy.objs.items():
            if name.startswith("neck") and "_" in name:
                i, j = (int(v) for v in name[4:].split("_"))
                a = (2.5 + 2.0 * rise) * math.sin(t * 1.3 + i * 1.1 + j * 0.45)
                b = (2.0 + 1.5 * rise) * math.sin(t * 0.9 + i * 0.7 - j * 0.3)
                ob.rotation_euler = (math.radians(a), math.radians(b), 0)
                ob.keyframe_insert("rotation_euler", frame=fr)
        for ob in foam_obs:
            s = 1.0 * seg(t, T_NAGA + 0.2, T_NAGA + 1.5) if "tubuh" not in ob.name else 1.5 * seg(t, T_NAGA, T_NAGA + 2.5)
            ob.scale = (s + 1e-3, s + 1e-3, 1)
            ob.keyframe_insert("scale", frame=fr)
        eye.location = hydra_head(t) + Vector((0, 0, -1))
        eye.keyframe_insert("location", frame=fr)

        # camera
        if t < T_FLY:
            u = t / T_FLY
            u = u * 0.85 + ease(u) * 0.15
            k = min(len(fly_curve) - 1.001, u * (len(fly_curve) - 1))
            i0 = int(k)
            loc = fly_curve[i0].lerp(fly_curve[i0 + 1], k - i0)
            tgt = fly_look[0].lerp(fly_look[1], ease(u))
            q = look_quat(tgt - loc)
            vfov = 50.0
        elif t < T_DROP:
            u = seg(t, T_FLY, T_DROP)
            g_loc, g_look = game_cam(il_pos(T_DROP), f)
            a_loc = fly_curve[-1]
            loc = a_loc.lerp(g_loc, u)
            loc.z += math.sin(u * math.pi) * 6.0
            q0 = look_quat(fly_look[1] - a_loc)
            q = q0.slerp(look_quat(g_look), ease(u))
            vfov = 50.0 + (cn["vfov"] - 50.0) * u
        elif t < T_WALK + 0.4:
            loc, look = game_cam(P, f)
            q = look_quat(look)
            vfov = cn["vfov"]
        elif t < T_NAGA:
            u = seg(t, T_WALK + 0.4, T_WALK + 1.1)
            tgt = Vector((Np.x, Np.y, nz + 2.6))
            d = (tgt - Vector((P.x, P.y, 0)))
            d.z = 0
            loc, look = game_cam(P, f.lerp(d.normalized(), u).normalized())
            q = look_quat(look).slerp(lock_quat(loc, tgt, cn["vfov"]), u)
            vfov = cn["vfov"]
            ret.location = tgt
        else:
            u = seg(t, T_NAGA + 0.6, T_NAGA + 4.5)
            tgt_h = hydra_head(t) + Vector((0, 0, -1.5))
            tgt_n = Vector((Np.x, Np.y, 2.6))
            tgt = tgt_n.lerp(tgt_h, seg(t, T_NAGA + 0.8, T_NAGA + 3.0))
