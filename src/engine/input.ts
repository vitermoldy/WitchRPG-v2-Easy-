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
    window.addEventListener('blur', () => this.releaseAll())
    target.addEventListener('mousedown', (e) => {
      if (!this.active) return
      e.preventDefault()
      this.press(e.button === 2 ? 'Mouse2' : e.button === 1 ? 'Mouse1' : 'Mouse0')
    })
    window.addEventListener('mouseup', (e) => {
      this.release(e.button === 2 ? 'Mouse2' : e.button === 1 ? 'Mouse1' : 'Mouse0')
    })
    target.addEventListener('contextmenu', (e) => e.preventDefault())
    window.addEventListener('mousemove', (e) => {
      if (!this.locked) return
      this.dx += e.movementX
      this.dy += e.movementY
    })
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.target
      if (!this.locked) this.releaseAll()
      this.onLockChange?.(this.locked)
    })
  }

  get active() {
    return this.locked || this.virtualLock
  }

  async lock(): Promise<boolean> {
    if (this.virtualLock) return true
    try {
      const req = this.target.requestPointerLock as unknown as (o?: { unadjustedMovement?: boolean }) => Promise<void> | void
      try {
        await req.call(this.target, { unadjustedMovement: true })
      } catch {
        await req.call(this.target)
      }
      return true
    } catch {
      return false
    }
  }

  unlock() {
    if (document.pointerLockElement) document.exitPointerLock()
  }

  press(code: string) {
    if (!this.down.has(code)) this.pressedSet.add(code)
    this.down.add(code)
  }

  release(code: string) {
    if (this.down.has(code)) this.releasedSet.add(code)
    this.down.delete(code)
  }

  releaseAll() {
    for (const c of this.down) this.releasedSet.add(c)
    this.down.clear()
  }

  held(code: string) {
