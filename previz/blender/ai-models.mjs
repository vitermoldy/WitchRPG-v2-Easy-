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
const root = path.resolve(here, '..', '..')
const assets = path.join(root, 'assets')
const out = path.join(root, 'public', 'models', 'ai')
const table = JSON.parse(fs.readFileSync(path.join(here, 'ai-models.json'), 'utf8'))
const blender = process.env.BLENDER || 'C:/Program Files/Blender Foundation/Blender 5.1/blender.exe'
const quiet = process.argv.includes('--quiet')
// --src key=path imports one file from elsewhere (for testing the pipeline)
const extra = process.argv.filter((a) => a.includes('=') && !a.startsWith('--')).map((a) => a.split('='))

const files = Object.entries(table).filter(([name]) => name.endsWith('.glb'))
const present = []
for (const [name, info] of files) {
  const src = path.join(assets, name)
  if (fs.existsSync(src)) present.push({ key: info.key, src, turn: info.turn ?? 0 })
}
for (const [key, src] of extra) present.push({ key, src: path.resolve(src), turn: 0 })

fs.mkdirSync(out, { recursive: true })
let failed = false
for (const m of present) {
  const done = path.join(out, `${m.key}.json`)
  if (fs.existsSync(done) && fs.statSync(done).mtimeMs > fs.statSync(m.src).mtimeMs) continue
  if (!fs.existsSync(blender)) {
    console.warn(`[models:ai] Blender tidak ditemukan di ${blender}; ${path.basename(m.src)} belum diimpor (set BLENDER).`)
    failed = true
    break
  }
  console.log(`[models:ai] mengimpor ${path.basename(m.src)} sebagai ${m.key}`)
  const run = spawnSync(blender, ['-b', '--factory-startup', '-P', path.join(here, 'ai_import.py'), '--', m.key, m.src, String(m.turn)], { encoding: 'utf8' })
  const line = (run.stdout || '').split('\n').find((l) => l.startsWith('[ai]'))
  if (run.status !== 0 || !line) {
    console.error(`[models:ai] ${m.key} gagal:\n${(run.stderr || run.stdout || '').slice(-2000)}`)
    failed = true
    continue
  }
  console.log(line)
}

// the manifest lists only models whose source is still there and whose import succeeded
const manifest = {}
for (const m of present) {
  const meta = path.join(out, `${m.key}.json`)
  if (fs.existsSync(meta) && fs.existsSync(path.join(out, `${m.key}.glb`))) manifest[m.key] = JSON.parse(fs.readFileSync(meta, 'utf8'))
}
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1))
// imports whose source is gone are removed, so they do not ship with the game
for (const f of fs.readdirSync(out)) {
  const key = f.replace(/(_lod)?\.(glb|json)$/, '')
  if (f !== 'manifest.json' && !manifest[key]) fs.rmSync(path.join(out, f))
}
if (!quiet || Object.keys(manifest).length) console.log(`[models:ai] ${Object.keys(manifest).length} model dari tool AI dipakai: ${Object.keys(manifest).join(', ') || '(belum ada, semua memakai block-out)'}`)
