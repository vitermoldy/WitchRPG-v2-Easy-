"""Renders the creature board of the second batch (assets/Monster pt2): reference on the left, block-out on
the right, like papan-makhluk.png of phase 0.

    blender -b --factory-startup -P previz/blender/build_pt2.py -- [--pct 100] [--only satyr,buer] [--views]

--views also renders each block-out from four sides into previz/frames/pt2_<key>.png, for checking shapes."""
import json
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import pv_common as C  # noqa: E402
import pv_creatures as K  # noqa: E402
import pv_creatures2 as K2  # noqa: E402
import pv_creatures3 as K3  # noqa: E402
import pv_shots as S  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


PCT = int(arg("--pct", "100"))
KEYS = [row[0] for row in K2.ROSTER2 + K3.ROSTER3]
if arg("--only"):
    KEYS = [k for k in KEYS if k in arg("--only").split(",")]
TMP = os.path.join(C.PREVIZ, "frames")
os.makedirs(TMP, exist_ok=True)
t0 = time.time()
VIEW = {"buer": -35, "raia": -30, "marinus": -60, "asmodeus": -40, "septiceps": -20, "panotti": -25, "blemmye": -20}


def log(*a):
    print(f"[pt2 {time.time() - t0:6.1f}s]", *a, flush=True)


for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob)
lib = bpy.context.scene
root = C.collection("Makhluk2", lib.collection)
colls, stats = {}, {}
for key in KEYS:
    coll = C.collection(f"CR_{key}", root)
    r = K.build(key, coll)
    K.ground_rig(r)
    lo, hi = C.bounds(coll)
    stats[key] = {"tinggi": round(hi.z - lo.z, 2), "lebar": round(hi.x - lo.x, 2), "panjang": round(hi.y - lo.y, 2), "segitiga": C.tri_count(coll),
                  "bagian": sum(1 for o in coll.objects if o.type == "MESH")}
    colls[key] = coll
    log(key, stats[key])
with open(os.path.join(TMP, "makhluk_pt2.json"), "w", encoding="utf-8") as fh:
    json.dump(stats, fh, indent=1)


def board():
    sc = C.new_scene("papan-makhluk-pt2")
    sc.world = C.sky_world("latar_papan2", "#121014", "#121014", "#121014", 1.0)
    C.sun(sc, "kunci", (55, 0, -35), energy=3.2).data.use_shadow = False
    C.sun(sc, "tepi", (60, 0, 150), "#b6c8ff", energy=2.2).data.use_shadow = False
    cols, cw, ch, head = 4, 9.6, 5.6, 2.0
    rows = math.ceil(len(KEYS) / cols)
    Wt, Ht = cols * cw, head + rows * ch
    coll = C.collection("papan2", sc.collection)
    card = C.mat_flat("kartu2", "#1d1a1f", 1.0)
    well = C.mat_flat("sumur2", "#2a2d36", 1.0)
    C.text(coll, "Papan makhluk WitchRPG v2 (Easy), bagian 2: Tanah Ganjil", (0.4, 0, -0.85), size=0.62, color="#f4efe9", rot=(90, 0, 0))
    C.text(coll, "Kiri: gambar referensi pemilik (assets/Monster pt2). Kanan: block-out 3D yang mengikuti anatomi dan atributnya; warnanya dipilih per makhluk karena referensinya hitam putih.",
           (0.4, 0, -1.45), size=0.26, color="#b9b2ad", rot=(90, 0, 0))
    for i, k in enumerate(KEYS):
        r_, c_ = divmod(i, cols)
        x0, z0 = c_ * cw, -(head + r_ * ch)
        bg = C.Rig(f"kartu2.{k}", {"c": card, "w": well}, coll)
        bg.P("m").box((x0 + cw / 2, 1.0, z0 - ch / 2), (cw - 0.24, 0.02, ch - 0.24), mat="c")
        bg.parts["m"].box((x0 + 6.85, 0.9, z0 - 2.25), (4.5, 0.02, 3.95), mat="w")
        bg.finalize()
        row = K.ROSTER_BY_KEY[k]
        if row[K.REF]:
            S.ref_plane(coll, f"ref2.{k}", row[K.REF][0], row[K.REF][1], (x0 + 2.4, 0, z0 - 2.25), 3.95)
        else:
            C.text(coll, "Pengganti sementara:", (x0 + 2.3, 0, z0 - 2.0), size=0.26, color="#8f8a86", align="CENTER", rot=(90, 0, 0))
            C.text(coll, "model dari pemilik menyusul", (x0 + 2.3, 0, z0 - 2.4), size=0.26, color="#8f8a86", align="CENTER", rot=(90, 0, 0))
        lc = colls[k]
        lo, hi = C.bounds(lc)
        rot = VIEW.get(k, -40)
        a = math.radians(rot)
        corners = [Vector((xx, yy, 0)) for xx in (lo.x, hi.x) for yy in (lo.y, hi.y)]
        rx = [c.x * math.cos(a) - c.y * math.sin(a) for c in corners]
