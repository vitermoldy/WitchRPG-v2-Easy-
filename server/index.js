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
app.disable('x-powered-by')
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'same-origin')
  next()
})
app.use('/api', createApi(() => pool, config.db.database))

const dist = ROOT + 'dist'
if (existsSync(dist)) app.use(express.static(dist))

/** MySQL may start after this server; keep trying every few seconds. */
async function connectLoop() {
  try {
    pool = await connect(config.db)
    console.log(`${config.name}: database ${config.db.database} terhubung`)
