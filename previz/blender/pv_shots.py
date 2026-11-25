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
