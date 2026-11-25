"""The forest valley: terrain, five zones with their own fog, water, instanced forest and set pieces.
X is east, Y is north, metres. The playable map is 1000 x 1000 m inside a ring of mountains."""
import math

import bmesh
import bpy
import numpy as np
from mathutils import Vector

import pv_common as C

# zone: name, tier, centre, radius, fog colour, fog density at the ground, fog height scale, ground colour
ZONES = [
    dict(key="pembuka", name="Hutan Pembuka", tier="I", lv="1-3", c=(0, -280), r=230, fog="#cddbea", dens=0.014, hs=10, ground="#2a3322"),
