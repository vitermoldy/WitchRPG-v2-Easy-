import { config } from './config.js'
import { connect } from './db.js'

/** `npm run users`: who has an account, when they joined, and how far their witch has come. */
const when = (d) => (d ? new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-')

const pool = await connect(config.db)
const [rows] = await pool.query(
