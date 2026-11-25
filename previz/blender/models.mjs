// `npm run models -- [names] [--lod 0.22]`: runs export_glb.py in Blender with those arguments.
// Blender is started directly, without a shell, because cmd.exe breaks the quoted install path as
// soon as npm appends arguments. Set BLENDER to use another Blender build.
import { spawnSync } from 'node:child_process'

const blender = process.env.BLENDER || 'C:/Program Files/Blender Foundation/Blender 5.1/blender.exe'
const args = ['-b', '--factory-startup', '-P', 'previz/blender/export_glb.py', '--', ...process.argv.slice(2)]
