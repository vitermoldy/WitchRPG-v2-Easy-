// The sign-in gate, the account row on the start screen, and keeping the witch in step with the
// server (from v1, without its Rift history). While the server runs, nobody plays without an
// account; when it cannot be reached the game still works and the witch stays in this browser.
import { ApiError, authState, checkAccount, fetchProfile, onAuth, pushProfile, signIn, signOut, signUp, type AuthState } from '../data/api'
import type { Game } from '../engine/game'
import { isFresh, type Profile } from '../game/progression'
import { clearProfile, normalizeProfile } from '../game/save'

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T

export interface AccountHooks {
  /** The witch changed underneath the start screen (taken from the server). */
  onProfileChanged: () => void
}

export function mountAccount(game: Game, hooks: AccountHooks): void {
  const gate = $<HTMLDialogElement>('auth-gate')
  const form = $<HTMLFormElement>('gate-form')
  const user = $<HTMLInputElement>('gate-user')
  const pass = $<HTMLInputElement>('gate-pass')
  const submit = $<HTMLButtonElement>('gate-submit')
  const error = $('gate-error')
  let mode: 'in' | 'up' = 'in'
  let busy = false
  // "Main tanpa akun" holds until the page reloads or the player asks to sign in.
  let skipped = false
  let shown: AuthState['status'] | null = null
  let last: AuthState['status'] = authState().status
  let pushTimer = 0
  let note = ''

  const label = (): string => (mode === 'in' ? 'Masuk' : 'Buat akun')
