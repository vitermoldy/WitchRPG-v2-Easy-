import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** Repo root, one level above /server. */
export const ROOT = fileURLToPath(new URL('..', import.meta.url))

