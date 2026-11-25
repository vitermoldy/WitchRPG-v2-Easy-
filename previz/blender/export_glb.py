"""Exports game models (GLB) from the previz block-outs into public/models/.

    blender -b --factory-startup -P previz/blender/export_glb.py -- [ilyra imp ...] [--lod 0.25]
    npm run models -- imp hellhound harpy --lod 0.22

Every part stays a named node with its own pivot (pelvis, thigh_L, neck2_3, ...), so the game can pose
and animate the model by rotating parts, the way v1's models.ts did. Materials are flattened to one
colour plus emission, which glTF carries without baking. The two-tone materials (back and belly, see
pv_common.mat_tone) are baked into vertex colours instead: the shader's up-to-down blend and its light
noise become COLOR_0, and their flat material turns white so the vertex colour shows as it is.

With --ratio R the game model itself is decimated to about R (for block-outs over the triangle budget).
With --lod R it writes <name>_lod.glb instead: every part decimated to about R of its triangles, for
the far shadow army drawn as a crowd (parts under 60 triangles are left alone so eyes do not vanish)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Vector, noise  # noqa: E402

import pv_common as C  # noqa: E402
import pv_creatures as K  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
LOD = None
RATIO = None
if "--lod" in argv:
    i = argv.index("--lod")
    LOD = float(argv[i + 1])
    argv = argv[:i] + argv[i + 2:]
if "--ratio" in argv:
    i = argv.index("--ratio")
    RATIO = float(argv[i + 1])
    argv = argv[:i] + argv[i + 2:]
SHRINK = LOD or RATIO
WANT = argv or ["ilyra", "imp", "hellhound", "harpy"]
POSE = {"ilyra": "walk"}
