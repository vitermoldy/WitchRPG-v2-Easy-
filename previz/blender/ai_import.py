"""Imports one model from the owner's image-to-3D tool into the game (called by ai-models.mjs).

    blender -b --factory-startup -P previz/blender/ai_import.py -- <key> <source.glb> [turn_degrees]

The model is scaled to the height of the creature's block-out (public/models/<key>.glb), stood with its
