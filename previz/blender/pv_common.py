"""Shared helpers for the WitchRPG v2 previz: palette, materials, mesh primitives, named-part rigs,
cameras and render settings. Coordinates are metres, Z up, creatures face -Y (glTF +Z forward)."""
import math

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

