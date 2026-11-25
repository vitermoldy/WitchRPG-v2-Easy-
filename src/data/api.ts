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
export interface AuthState {
  status: AuthStatus
  account: Account | null
}

let auth: AuthState = { status: 'checking', account: null }
const listeners = new Set<(state: AuthState) => void>()
function setAuth(next: AuthState): void {
  auth = next
  listeners.forEach((fn) => fn(auth))
}
export const authState = (): AuthState => auth
export function onAuth(fn: (state: AuthState) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`api/${path}`, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    })
  } catch {
    throw new ApiError('Server tidak menjawab.', 0)
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    // The session ran out or was signed out elsewhere: ask for the password again.
    if (res.status === 401 && !path.startsWith('auth/') && auth.status === 'signed-in') setAuth({ status: 'signed-out', account: null })
    throw new ApiError((body as { error?: string }).error ?? `Server menjawab ${res.status}.`, res.status)
  }
  return body as T
}

type Entry = { user: Account; device: string }

/** Asks the server who is signed in on this browser. */
export async function checkAccount(): Promise<void> {
  setAuth({ ...auth, status: 'checking' })
