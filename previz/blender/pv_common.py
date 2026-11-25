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
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m


def mat_flat(name, color, rough=0.8, metal=0.0, emit=None, emit_strength=0.0):
    if name in _MATS:
        return _MATS[name]
    m = _new_mat(name)
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = rgb(color)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = rgb(emit)
        b.inputs["Emission Strength"].default_value = emit_strength
    m.diffuse_color = rgb(color)
    _MATS[name] = m
    return m


def mat_emit(name, color, strength=8.0):
    if name in _MATS:
        return _MATS[name]
    m = _new_mat(name)
    nt = m.node_tree
    nt.nodes.remove(nt.nodes["Principled BSDF"])
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = rgb(color)
    e.inputs["Strength"].default_value = strength
    nt.links.new(e.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    m.diffuse_color = rgb(color)
    _MATS[name] = m
    return m


def mat_cracked(name, color, crack, strength=5.0, scale=2.2, rough=0.75, coverage=0.5, width=0.035):
    """Dark body with glowing cracks: Voronoi edges masked by noise so the cracks come in patches."""
    if name in _MATS:
        return _MATS[name]
    m = _new_mat(name)
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    b = N["Principled BSDF"]
    b.inputs["Base Color"].default_value = rgb(color)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Emission Color"].default_value = rgb(crack)
    # a soft sheen lets rim light trace dark silhouettes against dark forest
    b.inputs["Sheen Weight"].default_value = 0.6
    b.inputs["Sheen Roughness"].default_value = 0.35
    b.inputs["Sheen Tint"].default_value = (0.75, 0.72, 0.8, 1.0)
    tc = N.new("ShaderNodeTexCoord")
    vor = N.new("ShaderNodeTexVoronoi")
    vor.feature = "DISTANCE_TO_EDGE"
    vor.inputs["Scale"].default_value = scale
    L.new(tc.outputs["Object"], vor.inputs["Vector"])
    edge = N.new("ShaderNodeMapRange")
    edge.inputs["From Min"].default_value = 0.0
    edge.inputs["From Max"].default_value = width
    edge.inputs["To Min"].default_value = 1.0
    edge.inputs["To Max"].default_value = 0.0
    L.new(vor.outputs["Distance"], edge.inputs["Value"])
    noi = N.new("ShaderNodeTexNoise")
    noi.inputs["Scale"].default_value = 0.9
    noi.inputs["Detail"].default_value = 2.0
    L.new(tc.outputs["Object"], noi.inputs["Vector"])
    mask = N.new("ShaderNodeMapRange")
    mask.inputs["From Min"].default_value = 1.0 - coverage
    mask.inputs["From Max"].default_value = 1.0 - coverage + 0.12
    L.new(noi.outputs["Fac"], mask.inputs["Value"])
    mul = N.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    L.new(edge.outputs["Result"], mul.inputs[0])
    L.new(mask.outputs["Result"], mul.inputs[1])
    mul2 = N.new("ShaderNodeMath")
    mul2.operation = "MULTIPLY"
    mul2.inputs[1].default_value = strength
    L.new(mul.outputs[0], mul2.inputs[0])
    L.new(mul2.outputs[0], b.inputs["Emission Strength"])
    m.diffuse_color = rgb(color)
    _MATS[name] = m
    return m


def mat_tone(name, top, bottom=None, rough=0.7, metal=0.0, emit=None, emit_strength=0.0, vary=0.12):
    """Flat colour that shifts from `top` (facing up) to `bottom` (facing down), with a little noise
    so large areas do not look like plastic. Gives backs and bellies, manes and muzzles their own tone."""
    if name in _MATS:
        return _MATS[name]
    m = _new_mat(name)
    nt = m.node_tree
    N, L = nt.nodes, nt.links
    b = N["Principled BSDF"]
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Sheen Weight"].default_value = 0.25
    geo = N.new("ShaderNodeNewGeometry")
    sep = N.new("ShaderNodeSeparateXYZ")
    L.new(geo.outputs["Normal"], sep.inputs[0])
    mr = N.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = -0.45
    mr.inputs["From Max"].default_value = 0.35
    L.new(sep.outputs["Z"], mr.inputs["Value"])
    mix = N.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["A"].default_value = rgb(bottom or top)
    mix.inputs["B"].default_value = rgb(top)
    L.new(mr.outputs["Result"], mix.inputs["Factor"])
    tc = N.new("ShaderNodeTexCoord")
    noi = N.new("ShaderNodeTexNoise")
    noi.inputs["Scale"].default_value = 4.0
    L.new(tc.outputs["Object"], noi.inputs["Vector"])
    vr = N.new("ShaderNodeMapRange")
    vr.inputs["To Min"].default_value = 1.0 - vary
    vr.inputs["To Max"].default_value = 1.0 + vary * 0.5
    L.new(noi.outputs["Fac"], vr.inputs["Value"])
    hsv = N.new("ShaderNodeHueSaturation")
    L.new(mix.outputs["Result"], hsv.inputs["Color"])
    L.new(vr.outputs["Result"], hsv.inputs["Value"])
    L.new(hsv.outputs["Color"], b.inputs["Base Color"])
    if emit:
        b.inputs["Emission Color"].default_value = rgb(emit)
        b.inputs["Emission Strength"].default_value = emit_strength
    m.diffuse_color = rgb(top)
    _MATS[name] = m
    return m


def mat_globe(name, ocean="#2a6aa8", land="#4f8a3a"):
    """Blue-green world sphere (Atlas): land and sea from noise."""
    if name in _MATS:
        return _MATS[name]
    m = _new_mat(name)
    nt = m.node_tree
