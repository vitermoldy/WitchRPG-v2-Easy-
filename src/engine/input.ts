/** Keyboard and mouse state, read once per frame. Keys are KeyboardEvent.code values. */
export class Input {
  private readonly down = new Set<string>()
  private readonly pressedSet = new Set<string>()
  private readonly releasedSet = new Set<string>()
  dx = 0
  dy = 0
  locked = false
  /** Set by ?debug so automated runs can play without pointer lock. */
  virtualLock = false
  /** Game keys are only taken from the browser during a fight; menus keep Tab and Space. */
  capture = false
  onKey: ((code: string) => void) | null = null
  onLockChange: ((locked: boolean) => void) | null = null
  private readonly target: HTMLElement

  constructor(target: HTMLElement) {
    this.target = target
    window.addEventListener('keydown', (e) => {
      if (!this.active || !this.capture) return
      if (GAME_KEYS.has(e.code)) e.preventDefault()
      if (e.repeat) return
      this.press(e.code)
      this.onKey?.(e.code)
    })
    window.addEventListener('keyup', (e) => {
      if (GAME_KEYS.has(e.code) && this.active && this.capture) e.preventDefault()
      this.release(e.code)
    })
