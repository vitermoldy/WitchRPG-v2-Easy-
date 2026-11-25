import mysql from 'mysql2/promise'
import { AUTH_TABLES } from './auth.js'

/**
 * The witch, plus users and sessions from auth.js:
 * - clients: one row per data key; each account owns one (users.device_id);
