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
    dict(key="rawa", name="Rawa Berkabut", tier="III", lv="7-9", c=(-300, 40), r=200, fog="#a9c491", dens=0.03, hs=9, ground="#283224"),
    dict(key="kuil", name="Reruntuhan Kuil", tier="IV", lv="10-12", c=(40, 330), r=170, fog="#8f9096", dens=0.02, hs=14, ground="#373a33"),
    dict(key="bara", name="Lembah Bara", tier="V", lv="13-15", c=(330, 330), r=165, fog="#d8622c", dens=0.018, hs=28, ground="#1d1917"),
]
LAKE = dict(c=(-330, 300), r=95)
# Danau Hitam belongs to the swamp but keeps its own low fog over the black water
LAKE_FOG = dict(key="danau", name="Danau Hitam", c=LAKE["c"], r=120, fog="#a3b996", dens=0.012, hs=5, glow=0.15)
_U = (0.673, -0.740)
HYDRA_POS = (LAKE["c"][0] + _U[0] * 82, LAKE["c"][1] + _U[1] * 82)
ALTAR = (-10, -395)
TEMPLE = (40, 318)
PATHS = [
    [(-10, -395), (-25, -330), (0, -230), (20, -120), (30, 0), (45, 120), (40, 250)],
    [(20, -120), (-90, -80), (-190, -20), (-260, 90), (-290, 200)],
    [(30, 0), (140, -20), (230, -40)],
    [(45, 120), (180, 200), (280, 290)],
]
SPOTS = {
    "hero": (-34, -335),
    "minotaur": (40, 282),
    "hydra": (-330 + 0.673 * 100, 300 - 0.740 * 100),
    "army": (128, -258),
}
CLEARINGS = [(SPOTS["hero"], 22), (SPOTS["army"], 16), (ALTAR, 16), (TEMPLE, 30), (SPOTS["minotaur"], 18), (SPOTS["hydra"], 20)]

# ---------------------------------------------------------------- noise and height

_rng = np.random.default_rng(20261124)
_LAT = _rng.random((256, 256)) * 2 - 1


def vnoise(x, y):
    xi = np.floor(x).astype(np.int64)
    yi = np.floor(y).astype(np.int64)
