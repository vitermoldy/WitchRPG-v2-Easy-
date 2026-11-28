// `npm run models:ai` (also run before `npm run dev` and `npm run build`): brings the owner's image-to-3D
// models from assets/ into the game. Each file named in ai-models.json that is newer than its import is
// passed to ai_import.py in Blender; then public/models/ai/manifest.json lists every model in use, so the
// game takes it in place of the block-out. A model removed from assets/ drops out of the manifest and the
// block-out comes back. Without Blender it says so and leaves everything as it was.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
