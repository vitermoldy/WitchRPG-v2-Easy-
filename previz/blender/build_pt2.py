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


