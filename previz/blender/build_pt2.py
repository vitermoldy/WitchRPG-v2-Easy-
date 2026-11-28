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
