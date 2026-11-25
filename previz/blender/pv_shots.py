"""Shot scenes of the previz: hero camera, valley, lineup, Minotaur fight, Hydra, rising army, creature board."""
import math
import os

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Vector

import pv_common as C
import pv_creatures as K
import pv_world as Wd
from pv_common import HEX, V

# Camera numbers. vfov is the vertical field of view, the way Three.js PerspectiveCamera.fov counts it.
CAM = {
    "prompt": dict(dist=3.4, shoulder=0.85, height=1.65, vfov=68.0, pitch=-8.0),
    "normal": dict(dist=3.4, shoulder=0.8, height=1.6, vfov=50.0, pitch=-6.0),
    "aim": dict(dist=2.0, shoulder=0.65, height=1.6, vfov=40.0, pitch=-4.0),
}
CAM_FINAL_OVER = {}

_ACTORS = None


def actors_coll():
    global _ACTORS
    if _ACTORS is None or _ACTORS.name not in bpy.data.collections:
        _ACTORS = C.collection("Aktor", bpy.data.scenes["Pustaka"].collection)
