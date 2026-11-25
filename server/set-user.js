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
