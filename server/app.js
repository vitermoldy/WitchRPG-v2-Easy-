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
const SKILLS = new Set(['hexBolt', 'grip', 'burst', 'snare', 'barrier', 'warp', 'rite', 'swap', 'focus', 'general', 'marshal'])
// fauna (pegasus, unicorn) is never raised, so it is not here
const KINDS = new Set(['imp', 'hellhound', 'harpy', 'centaur', 'naga', 'minotaur', 'medusa', 'chimera', 'cyclops', 'succubus', 'incubus', 'phoenix', 'hydra', 'griffin', 'hippogriff', 'cerberus', 'lilith', 'dragon', 'typhon', 'samael', 'atlas'])
const RANKS = new Set(['prajurit', 'ksatria', 'jenderal', 'marsekal'])
const STATS = ['hex', 'spr', 'vit', 'agi', 'umb']
const ALTARS = new Set(['pembuka', 'simpang', 'tebing', 'rawa', 'danau', 'kuil', 'bara'])
const MAX_LEVEL = 30
