import '@fontsource-variable/sora'
import '@fontsource-variable/figtree'
import '@fontsource-variable/martian-mono'
import './styles.css'
import { Game } from './engine/game'
import { mountAccount } from './ui/account'
import { Ledger, TravelPanel } from './ui/ledger'
import { WorldMap } from './ui/worldmap'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const debug = new URLSearchParams(location.search).has('debug')

const screens = {
  loading: $('screen-loading'),
  error: $('screen-error'),
  start: $('screen-start'),
  pause: $('screen-pause'),
}
function show(name: keyof typeof screens | null) {
  for (const [k, el] of Object.entries(screens)) el.hidden = k !== name
}

function fail(message: string) {
  $('error-text').textContent = message
  show('error')
}

async function boot() {
  const canvas = $('view') as HTMLCanvasElement
  if (!canvas.getContext('webgl2')) {
    fail('Browser ini tidak menyediakan WebGL 2.')
    return
  }
  let game: Game
  try {
    game = new Game(canvas, debug)
  } catch (e) {
    fail(`WebGL gagal dimulai: ${(e as Error).message}`)
    return
  }
  if (debug) (window as unknown as { __game: Game }).__game = game
  game.run()
  try {
    await game.init((step) => {
      $('loading-step').textContent = step
    })
  } catch (e) {
    fail(`Hutan gagal dimuat: ${(e as Error).message}`)
    return
  }
  show('start')
  $('btn-enter').focus()

  const enter = async () => {
    const locked = await game.input.lock()
    show(null)
    game.start()
    // without the mouse locked she cannot look around: wait on the pause screen for another click
    if (!locked && !debug) {
      game.pause()
      $('lock-note').hidden = false
    }
  }
  $('btn-enter').addEventListener('click', enter)

  const pr = game.profile
  // what the start screen shows from the witch; read again when the server hands over another one
  const refreshers: (() => void)[] = []
