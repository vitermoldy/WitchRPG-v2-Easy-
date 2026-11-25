import { config } from './config.js'
import { connect } from './db.js'

/** `npm run users`: who has an account, when they joined, and how far their witch has come. */
const when = (d) => (d ? new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-')

const pool = await connect(config.db)
const [rows] = await pool.query(
  `SELECT u.username, u.created_at, u.last_login_at, u.last_seen_at, u.login_count, w.level, w.boss_kills,
     (SELECT COUNT(*) FROM shadows s WHERE s.client_id = u.device_id) AS shadows,
     (SELECT COUNT(*) FROM witch_altars a WHERE a.client_id = u.device_id) AS altars
   FROM users u LEFT JOIN witches w ON w.client_id = u.device_id ORDER BY u.created_at`,
)
await pool.end()

if (rows.length === 0) {
  console.log(`${config.name}: belum ada akun di database ${config.db.database}.`)
} else {
  console.log(`${config.name}: ${rows.length} akun di database ${config.db.database}`)
  console.table(
    rows.map((r) => ({
      username: r.username,
      daftar: when(r.created_at),
      'terakhir masuk': when(r.last_login_at),
      'terakhir aktif': when(r.last_seen_at),
      'kali masuk': r.login_count,
