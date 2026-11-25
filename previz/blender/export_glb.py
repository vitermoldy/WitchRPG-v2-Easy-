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
