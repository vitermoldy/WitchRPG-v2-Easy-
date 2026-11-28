"""Imports one model from the owner's image-to-3D tool into the game (called by ai-models.mjs).

    blender -b --factory-startup -P previz/blender/ai_import.py -- <key> <source.glb> [turn_degrees]

The model is scaled to the height of the creature's block-out (public/models/<key>.glb), stood with its
feet on the ground, centred over its feet and turned to face the way the game expects (glTF +Z, Blender
-Y). A model without bones over the triangle budget is decimated. Writes public/models/ai/<key>.glb
(with its animation clips when it is rigged), <key>_lod.glb (rest pose, decimated, for the far shadow
army) and <key>.json ({"animated": bool, "clips": [...], "triangles": n})."""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
KEY, SRC = argv[0], argv[1]
TURN = float(argv[2]) if len(argv) > 2 else 0.0
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, "public", "models", "ai")
BLOCKOUT = os.path.join(ROOT, "public", "models", f"{KEY}.glb")
BOSSES = {"septiceps", "asmodeus", "blackdragon", "manticore"}
BUDGET = 25000 if KEY in BOSSES else 10000
os.makedirs(OUT, exist_ok=True)


def clear():
    for ob in list(bpy.data.objects):
