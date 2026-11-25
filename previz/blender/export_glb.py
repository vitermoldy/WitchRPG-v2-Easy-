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
    me = ob.data
    attr = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    me.color_attributes.active_color = attr
    rot = ob.matrix_world.to_3x3()
    normals = me.corner_normals
    for poly in me.polygons:
        t = tones[poly.material_index] if poly.material_index < len(tones) else None
        for li in poly.loop_indices:
            if not t:
                attr.data[li].color = (1.0, 1.0, 1.0, 1.0)
                continue
            top, bottom, vary = t
            nz = (rot @ Vector(normals[li].vector)).normalized().z
            f = min(1.0, max(0.0, (nz + 0.45) / 0.8))
            co = me.vertices[me.loops[li].vertex_index].co
            fac = 0.5 + 0.5 * noise.noise(co * 4.0)
            v = (1.0 - vary) + fac * vary * 1.5
            attr.data[li].color = tuple(min(1.0, (bottom[k] + (top[k] - bottom[k]) * f) * v) for k in range(3)) + (1.0,)
    return True


def emission_of(m):
    if not m or not m.node_tree:
        return None
    for n in m.node_tree.nodes:
        if n.bl_idname == "ShaderNodeEmission":
            return tuple(n.inputs["Color"].default_value[:3]), n.inputs["Strength"].default_value
        if n.bl_idname == "ShaderNodeBsdfPrincipled":
            s = n.inputs["Emission Strength"]
            if not s.is_linked and s.default_value > 0:
                return tuple(n.inputs["Emission Color"].default_value[:3]), s.default_value
    return None


def flat(m):
    """One plain Principled material per source material: base colour, roughness, emission."""
    if m.name in _flat:
        return _flat[m.name]
    f = bpy.data.materials.new(f"g_{m.name}")
    f.use_nodes = True
    b = f.node_tree.nodes["Principled BSDF"]
    # a two-tone material: the colour lives in the vertex colours, so the material is white
    col = (1.0, 1.0, 1.0) if tone_of(m) else tuple(m.diffuse_color[:3])
    b.inputs["Base Color"].default_value = (*col, 1.0)
    b.inputs["Roughness"].default_value = 0.75
    metal = 0.0
    for n in m.node_tree.nodes if m.node_tree else []:
        if n.bl_idname == "ShaderNodeBsdfPrincipled" and not n.inputs["Metallic"].is_linked:
            metal = n.inputs["Metallic"].default_value
            b.inputs["Roughness"].default_value = n.inputs["Roughness"].default_value if not n.inputs["Roughness"].is_linked else 0.75
    b.inputs["Metallic"].default_value = metal
    e = emission_of(m)
    if e:
        b.inputs["Emission Color"].default_value = (*e[0], 1.0)
        b.inputs["Emission Strength"].default_value = min(e[1], 12.0)
        if not m.node_tree.nodes.get("Principled BSDF"):
            b.inputs["Base Color"].default_value = (*e[0], 1.0)
    _flat[m.name] = f
    return f


def lod_tris(coll):
    """Triangles after the decimate modifiers, as exported."""
    deps = bpy.context.evaluated_depsgraph_get()
    n = 0
    for o in coll.objects:
        if o.type != "MESH":
            continue
        e = o.evaluated_get(deps)
        me = e.to_mesh()
        me.calc_loop_triangles()
        n += len(me.loop_triangles)
        e.to_mesh_clear()
    return n


def export(key):
    coll = bpy.data.collections.new(f"export_{key}")
    scene.collection.children.link(coll)
    r = K.build(key, coll, pose=POSE.get(key), lights=False) if key == "ilyra" else K.build(key, coll, pose=POSE.get(key))
    K.ground_rig(r)
    r.root.name = key
    for name, ob in r.objs.items():
        ob.name = name
        bake_tones(ob)
        for slot in ob.material_slots:
            if slot.material:
                slot.material = flat(slot.material)
        if SHRINK and ob.type == "MESH" and len(ob.data.polygons) >= 60:
            mod = ob.modifiers.new("lod", "DECIMATE")
            mod.ratio = SHRINK
    for ob in scene.objects:
        ob.select_set(False)
    for ob in coll.objects:
        ob.select_set(True)
