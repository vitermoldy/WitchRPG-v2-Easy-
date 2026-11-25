"""Builds the whole WitchRPG v2 previz and renders it.

    blender -b --factory-startup -P previz/blender/build.py -- [--only hero,valley,...] [--pct 100] [--no-save] [--anim]

Targets: variants, hero, valley, lineup, minotaur, hydra, army, board. --anim also renders the animatic frames and
encodes previz/animatic.mp4 with ffmpeg. Without --only every still is rendered."""
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

import pv_animatic as A  # noqa: E402
import pv_common as C  # noqa: E402
import pv_creatures as K  # noqa: E402
import pv_shots as S  # noqa: E402
import pv_world as Wd  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


ONLY = set(arg("--only", "variants,hero,valley,lineup,minotaur,hydra,army,bara,board").split(","))
PCT = int(arg("--pct", "100"))
OUT = C.PREVIZ
RENDERS = os.path.join(OUT, "renders")
TMP = os.path.join(OUT, "frames")
os.makedirs(RENDERS, exist_ok=True)
os.makedirs(TMP, exist_ok=True)
t0 = time.time()


def log(*a):
    print(f"[previz {time.time() - t0:6.1f}s]", *a, flush=True)


bpy.context.preferences.filepaths.save_version = 0
lib = bpy.context.scene
lib.name = "Pustaka"
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob)

# creature library: every block-out once, at rest, for the lineup and the board
lib_colls, stats = {}, {}
root = C.collection("Makhluk", lib.collection)
for key in ["ilyra"] + [r[0] for r in K.ROSTER]:
    coll = C.collection(f"CR_{key}", root)
    r = K.build(key, coll)
    K.ground_rig(r)
    lo, hi = C.bounds(coll, skip=("staff",))
