import { randomInt } from 'node:crypto'
import express from 'express'
import { createAuth } from './auth.js'

/**
 * The API:
 *   GET  /api/health
 *   /api/auth/...                     register, login, logout, me (see auth.js)
