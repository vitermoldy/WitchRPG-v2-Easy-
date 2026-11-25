// Talks to the MySQL server (npm run server). People sign in with a username and password; the
// server files each account's witch under one code. The browser keeps a code of its own
// (localStorage), offered on sign-up so the witch it already has becomes the account's.

import type { Profile } from '../game/progression'

const CODE_KEY = 'witchrpg-v2-easy:client'
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

let memoryCode: string | undefined

function makeCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')
}

function clientCode(): string {
  try {
    let code = localStorage.getItem(CODE_KEY)
    if (!code || !/^[A-HJ-NP-Z2-9]{12}$/.test(code)) {
      code = makeCode()
      localStorage.setItem(CODE_KEY, code)
    }
    return code
  } catch {
    memoryCode ??= makeCode()
    return memoryCode
  }
}

/** A failed call; `status` 0 means nothing answered. */
export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// ---------------------------------------------------------------- who is signed in

export interface Account {
  username: string
  createdAt: string
}
/** checking: asking the server. unavailable: the server or MySQL cannot be reached. */
export type AuthStatus = 'checking' | 'signed-in' | 'signed-out' | 'unavailable'
