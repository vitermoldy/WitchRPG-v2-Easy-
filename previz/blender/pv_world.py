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
    dict(key="tebing", name="Tebing Berangin", tier="II", lv="4-6", c=(320, -40), r=190, fog="#e9c79c", dens=0.006, hs=30, ground="#5b5141"),
