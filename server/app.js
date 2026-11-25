import { randomInt } from 'node:crypto'
import express from 'express'
import { createAuth } from './auth.js'

/**
 * The API:
 *   GET  /api/health
 *   /api/auth/...                     register, login, logout, me (see auth.js)
 *   GET  /api/profile                 the account's witch, or { profile: null } before the first save
 *   PUT  /api/profile  { profile }    save the witch; an older copy than the stored one is refused
 * Everything but health and auth needs a signed-in account. Each account files its data under one
 * 12-character code (`clients.id`, `users.device_id`); the browser never chooses it.
 */

const CODE = /^[A-HJ-NP-Z2-9]{12}$/
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const newCode = () => Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')

// Mirrors src/game and src/world: skill ids, creature kinds that can be raised, ranks, stats, altars.
