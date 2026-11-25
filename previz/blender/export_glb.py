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
OUT = os.path.join(C.ROOT, "public", "models")
os.makedirs(OUT, exist_ok=True)

scene = bpy.context.scene
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob)

_flat = {}


def tone_of(m):
    """(top, bottom, vary) of a two-tone material from pv_common.mat_tone, or None."""
    if not m or not m.node_tree:
        return None
    nodes = m.node_tree.nodes
    if not any(n.bl_idname == "ShaderNodeNewGeometry" for n in nodes):
        return None
    mix = next((n for n in nodes if n.bl_idname == "ShaderNodeMix" and n.data_type == "RGBA"), None)
    if not mix:
        return None
    vary = 0.0
    for n in nodes:
        links = n.inputs["Value"].links if n.bl_idname == "ShaderNodeMapRange" else ()
        if links and links[0].from_node.bl_idname == "ShaderNodeTexNoise":
            vary = 1.0 - n.inputs["To Min"].default_value
    return tuple(mix.inputs["B"].default_value[:3]), tuple(mix.inputs["A"].default_value[:3]), vary


def bake_tones(ob):
    """Writes the two-tone shading of mat_tone into a vertex colour (linear), white on other faces.
    Same numbers as the shader: world normal Z from -0.45 (bottom) to 0.35 (top), and object-space
    noise at scale 4 scaling the value between 1 - vary and 1 + vary / 2."""
    if ob.type != "MESH":
        return False
    tones = [tone_of(s.material) for s in ob.material_slots]
    if not any(tones):
        return False
