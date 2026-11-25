"""Builds the whole WitchRPG v2 previz and renders it.

    blender -b --factory-startup -P previz/blender/build.py -- [--only hero,valley,...] [--pct 100] [--no-save] [--anim]

Targets: variants, hero, valley, lineup, minotaur, hydra, army, board. --anim also renders the animatic frames and
encodes previz/animatic.mp4 with ffmpeg. Without --only every still is rendered."""
import json
import os
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

