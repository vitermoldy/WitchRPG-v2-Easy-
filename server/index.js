import { existsSync } from 'node:fs'
import express from 'express'
import { createApi } from './app.js'
import { ROOT, config } from './config.js'
import { connect } from './db.js'

/**
 * `npm run server` in development (Vite forwards /api here), `npm start` after a build
 * (this also serves dist/). The game works with the server off: the witch stays in the browser and
 * goes out once someone signs in while the server answers.
 */
let pool = null
const app = express()
