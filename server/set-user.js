import { randomInt } from 'node:crypto'
import { hashPassword, PASSWORD_MAX, PASSWORD_MIN, USERNAME } from './auth.js'
import { config } from './config.js'
import { connect } from './db.js'

/**
 * `npm run set-user -- <username> <kata sandi>`: makes an account, or gives an existing one a
 * new password (there is no reset by email, so this is the reset). A new account takes over the
 * witch of the newest browser that saved one before any account owned it.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const [username = '', password = ''] = process.argv.slice(2)
if (!USERNAME.test(username) || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
  console.error(`Pakai: npm run set-user -- <username> <kata sandi>\nUsername 3 sampai 24 karakter (huruf, angka, titik, garis bawah, minus), kata sandi ${PASSWORD_MIN} sampai ${PASSWORD_MAX} karakter.`)
  process.exit(1)
}

const pool = await connect(config.db)
const hash = await hashPassword(password)
const [[found]] = await pool.query('SELECT id, username FROM users WHERE username = ?', [username])
if (found) {
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, found.id])
  // A new password signs the account out everywhere.
  await pool.query('DELETE FROM sessions WHERE user_id = ?', [found.id])
  console.log(`${config.name}: kata sandi ${found.username} diganti. Semua sesinya dikeluarkan.`)
  await pool.end()
  process.exit(0)
}

try {
  const [free] = await pool.query('SELECT c.id FROM clients c LEFT JOIN users u ON u.device_id = c.id WHERE u.id IS NULL ORDER BY c.last_seen DESC LIMIT 1')
  const client = free[0]?.id ?? Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
