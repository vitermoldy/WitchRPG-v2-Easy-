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
        bpy.data.objects.remove(ob)
    for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.actions, bpy.data.materials, bpy.data.images):
        for d in list(coll):
            if d.users == 0:
                coll.remove(d)


def mesh_bounds():
    """World bounds of every mesh as it is drawn now (armatures in their rest pose)."""
    deps = bpy.context.evaluated_depsgraph_get()
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for ob in bpy.context.scene.objects:
        if ob.type != "MESH":
            continue
        ev = ob.evaluated_get(deps)
        me = ev.to_mesh()
        for v in me.vertices:
            w = ev.matrix_world @ v.co
            lo = Vector((min(lo.x, w.x), min(lo.y, w.y), min(lo.z, w.z)))
            hi = Vector((max(hi.x, w.x), max(hi.y, w.y), max(hi.z, w.z)))
        ev.to_mesh_clear()
    return lo, hi


def tris():
    n = 0
    deps = bpy.context.evaluated_depsgraph_get()
    for ob in bpy.context.scene.objects:
        if ob.type == "MESH":
            me = ob.evaluated_get(deps).to_mesh()
            me.calc_loop_triangles()
            n += len(me.loop_triangles)
            ob.evaluated_get(deps).to_mesh_clear()
    return n


def export(path, animations):
    for ob in bpy.context.scene.objects:
        ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_yup=True, export_apply=not animations,
                              export_animations=animations, export_lights=False, export_cameras=False, export_materials="EXPORT")


# the height to match: the block-out's
clear()
bpy.ops.import_scene.gltf(filepath=BLOCKOUT)
lo, hi = mesh_bounds()
height = hi.z - lo.z
clear()

bpy.ops.import_scene.gltf(filepath=SRC)
arms = [ob for ob in bpy.context.scene.objects if ob.type == "ARMATURE"]
for a in arms:
    a.data.pose_position = "REST"
bpy.context.view_layer.update()
animated = bool(arms) and len(bpy.data.actions) > 0
lo, hi = mesh_bounds()
s = height / max(1e-6, hi.z - lo.z)
centre = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
root = bpy.data.objects.new(KEY, None)
bpy.context.scene.collection.objects.link(root)
for ob in list(bpy.context.scene.objects):
    if ob is not root and ob.parent is None:
        ob.parent = root
        ob.location -= centre
