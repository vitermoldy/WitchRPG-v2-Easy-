// The sign-in gate, the account row on the start screen, and keeping the witch in step with the
// server (from v1, without its Rift history). While the server runs, nobody plays without an
// account; when it cannot be reached the game still works and the witch stays in this browser.
import { ApiError, authState, checkAccount, fetchProfile, onAuth, pushProfile, signIn, signOut, signUp, type AuthState } from '../data/api'
import type { Game } from '../engine/game'
import { isFresh, type Profile } from '../game/progression'
import { clearProfile, normalizeProfile } from '../game/save'

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T

export interface AccountHooks {
