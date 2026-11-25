"""Block-outs of Ilyra and every creature of the v2 roster, built from simple shapes as named parts.
Colours, anatomy and signature props follow the owner's reference sheets in assets/ (owner request,
24 Nov 2026); the shapes themselves are modelled from primitives, never traced."""
import math

from mathutils import Matrix, Vector

import pv_common as C
from pv_common import HEX, V


def X(p, s):
    return (p[0] * s, p[1], p[2])


def add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def lerp(a, b, t):
