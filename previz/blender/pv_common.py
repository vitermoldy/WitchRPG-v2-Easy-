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
    "umbra_hot": "#c7a6ff",
    "umbra_deep": "#2c1052",
    "rift": "#ffa53d",
    "bone": "#efe6df",
    "ash": "#5d5557",
    "skin": "#d9cdc7",
    "cloth": "#161013",
}


def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgb(h, a=1.0):
    h = h.lstrip("#")
    return (srgb_to_lin(int(h[0:2], 16) / 255), srgb_to_lin(int(h[2:4], 16) / 255), srgb_to_lin(int(h[4:6], 16) / 255), a)


# ---------------------------------------------------------------- materials

_MATS = {}


def _new_mat(name):
    m = bpy.data.materials.get(name)
    if m:
        bpy.data.materials.remove(m)
