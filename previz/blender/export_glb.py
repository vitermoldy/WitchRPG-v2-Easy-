"""Exports game models (GLB) from the previz block-outs into public/models/.

    blender -b --factory-startup -P previz/blender/export_glb.py -- [ilyra imp ...] [--lod 0.25]
    npm run models -- imp hellhound harpy --lod 0.22

Every part stays a named node with its own pivot (pelvis, thigh_L, neck2_3, ...), so the game can pose
and animate the model by rotating parts, the way v1's models.ts did. Materials are flattened to one
