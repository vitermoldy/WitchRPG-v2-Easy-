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
  function showError(text: string): void {
    error.textContent = text
    error.hidden = !text
  }

  function setMode(next: 'in' | 'up'): void {
    mode = next
    $('gate-h').textContent = next === 'in' ? 'Masuk ke Crimson Sovereign' : 'Buat akun Crimson Sovereign'
    submit.textContent = label()
    pass.autocomplete = next === 'in' ? 'current-password' : 'new-password'
    $('gate-pass-hint').hidden = next === 'in'
    $('gate-switch-text').textContent = next === 'in' ? 'Belum punya akun?' : 'Sudah punya akun?'
    $('gate-switch').textContent = next === 'in' ? 'Daftar' : 'Masuk'
    $('gate-lead').textContent =
      next === 'in'
        ? 'Level, stat, skill, Ruang Bayangan, dan altar yang sudah menyala tersimpan di akunmu, jadi bisa dilanjutkan dari browser mana pun.'
        : 'Witch yang sudah ada di browser ini ikut masuk ke akun barumu.'
    showError('')
    user.removeAttribute('aria-invalid')
    pass.removeAttribute('aria-invalid')
  }

  /** The gate only covers the start screen; she is never stopped in the forest by it. */
  const onTitle = (): boolean => game.state === 'title'

  function render(state: AuthState = authState()): void {
    const offline = state.status === 'unavailable'
    const wanted = onTitle() && (state.status === 'signed-out' || (offline && !skipped) || (state.status === 'checking' && gate.open))
    $('gate-checking').hidden = state.status !== 'checking'
    form.hidden = state.status !== 'signed-out'
    $('gate-switch-line').hidden = state.status !== 'signed-out'
    $('gate-offline').hidden = !offline
    $('gate-lead').hidden = state.status !== 'signed-out'
    if (wanted && !gate.open) gate.showModal()
    else if (!wanted && gate.open) gate.close()
    // Focus moves only when what the screen asks for changes, never on every update.
    if (gate.open && shown !== state.status) {
      if (state.status === 'signed-out') user.focus()
      else if (offline) $('gate-retry').focus()
    }
    shown = gate.open ? state.status : null
    renderRow(state)
    if (state.status === 'signed-in' && last !== 'signed-in') void sync()
    last = state.status
  }

  function renderRow(state: AuthState = authState()): void {
    const text = $('account-text')
    const button = $<HTMLButtonElement>('btn-account')
    if (state.status === 'signed-in' && state.account) {
      text.innerHTML = ''
      text.append('Masuk sebagai ')
      const b = document.createElement('b')
      b.textContent = state.account.username
      text.append(b, note ? `. ${note}` : '.')
      button.textContent = 'Keluar'
      button.hidden = false
    } else if (state.status === 'checking') {
      text.textContent = 'Memeriksa akun...'
      button.hidden = true
    } else {
      text.textContent =
        state.status === 'unavailable'
          ? 'Server mati, jadi progres hanya tersimpan di browser ini.'
          : 'Belum masuk. Progres hanya tersimpan di browser ini.'
      button.textContent = 'Masuk'
      button.hidden = false
    }
  }

  function setNote(text: string): void {
    note = text
    renderRow()
  }

  /** Puts a witch from the server in place of the one in this browser, before she enters the forest. */
  function adopt(remote: Profile): void {
    const p = normalizeProfile(remote)
    if (!p) return
    game.adoptProfile(p)
    hooks.onProfileChanged()
  }

  /** After signing in: the newer witch wins, whichever side has it. */
  async function sync(): Promise<void> {
    try {
      const remote = await fetchProfile()
      const local = game.profile
      const remoteTime = remote?.updatedAt ? Date.parse(remote.updatedAt) : 0
      const localTime = local.updatedAt ? Date.parse(local.updatedAt) : 0
      if (remote && (isFresh(local) || remoteTime > localTime) && onTitle()) {
        adopt(remote)
        setNote(`Witch Lv ${remote.level} dimuat dari server`)
      } else {
        const r = await pushProfile(local)
        if (r.stale && r.profile && onTitle()) adopt(r.profile)
        setNote(remote ? 'Progres di browser ini lebih baru dan sudah dikirim' : 'Witch di browser ini sekarang milik akunmu')
      }
    } catch (e) {
      setNote(e instanceof ApiError ? `Sinkron gagal: ${e.message}` : 'Sinkron gagal')
    }
  }

  /** Every local save also goes to the server, a moment later so quick changes travel together. */
  function schedulePush(): void {
    if (authState().status !== 'signed-in') return
    window.clearTimeout(pushTimer)
    pushTimer = window.setTimeout(async () => {
      try {
        const r = await pushProfile(game.profile)
        // Another browser saved a newer witch; take it only before she enters the forest.
