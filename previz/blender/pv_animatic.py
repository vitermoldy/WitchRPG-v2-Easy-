"""Animatic, 26 s at 24 fps: fly over the valley, drop to Ilyra's shoulder, walk the shore of
Danau Hitam, lock on to a swamp naga, and the Hydra rises. Every frame is keyed from Python."""
import math

import bpy
import numpy as np
from mathutils import Quaternion, Vector

import pv_common as C
import pv_creatures as K
import pv_shots as S
import pv_world as Wd
from pv_common import HEX, V

