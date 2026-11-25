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
    lo2, hi2 = C.bounds(coll)
    stats[key] = {
        "tinggi": round(hi.z - lo.z, 2),
        "lebar": round(hi2.x - lo2.x, 2),
        "panjang": round(hi2.y - lo2.y, 2),
        "segitiga": C.tri_count(coll),
        "bagian": sum(1 for o in coll.objects if o.type == "MESH"),
    }
    lib_colls[key] = coll
log("makhluk", len(lib_colls))
with open(os.path.join(TMP, "makhluk.json"), "w", encoding="utf-8") as fh:
    json.dump(stats, fh, indent=1)

dunia, protos = Wd.build_world(lib)
log("dunia")
world_stats = {
    "instance": {ob.name: len(ob.data.vertices) for ob in bpy.data.objects if ob.name.startswith(("forest_", "cover_", "embers_"))},
    "segitiga_prototipe": {k: sum(len(p.vertices) - 2 for p in ob.data.polygons) for k, ob in protos.items()},
    "segitiga_medan": sum(len(p.vertices) - 2 for p in bpy.data.objects["terrain"].data.polygons),
}
