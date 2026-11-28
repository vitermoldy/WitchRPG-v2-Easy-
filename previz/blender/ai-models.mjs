// `npm run models:ai` (also run before `npm run dev` and `npm run build`): brings the owner's image-to-3D
// models from assets/ into the game. Each file named in ai-models.json that is newer than its import is
// passed to ai_import.py in Blender; then public/models/ai/manifest.json lists every model in use, so the
