"""Shared helpers for the WitchRPG v2 previz: palette, materials, mesh primitives, named-part rigs,
cameras and render settings. Coordinates are metres, Z up, creatures face -Y (glTF +Z forward)."""
import math

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

ROOT = r"C:\MyRepo\WitchRPG-v2"
PREVIZ = ROOT + r"\previz"
ASSETS = ROOT + r"\assets"
FONT_PATH = r"C:\Windows\Fonts\bahnschrift.ttf"

# Colours from v1 (src/engine/palette.ts) plus the v2 zone fogs.
HEX = {
    "chaos": "#ff2a3d",
    "chaos_hot": "#ff7a5c",
    "umbra": "#8f55ff",
