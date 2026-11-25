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
  const profileLine = () => {
    $('profile-line').textContent = pr.level > 1 || pr.shadows.length ? `Ilyra Lv ${pr.level}, ${pr.shadows.length} bayangan di Ruang Bayangan` : ''
  }
  profileLine()
  refreshers.push(profileLine)

  /** One range setting: shows its value, applies it, and keeps it in the save. */
  const range = (id: string, value: () => number, fmt: (v: number) => string, apply: (v: number) => void) => {
    const input = $(`set-${id}`) as HTMLInputElement
    const out = $(`out-${id}`) as HTMLOutputElement
    const show = () => {
      input.value = String(value())
      out.textContent = fmt(value())
    }
    show()
    refreshers.push(show)
    input.addEventListener('input', () => {
      const v = Number(input.value)
      out.textContent = fmt(v)
      apply(v)
      game.saveNow()
    })
  }
  range('sens', () => game.sensitivity, (v) => v.toFixed(2), (v) => {
    game.sensitivity = v
    pr.settings.sensitivity = v
  })
  range('vol', () => pr.settings.volume, (v) => `${Math.round(v * 100)}%`, (v) => {
    pr.settings.volume = v
    game.sfx.setVolume(v)
  })
  range('detail', () => pr.settings.detail, (v) => String(v), (v) => {
    pr.settings.detail = v
    game.rigs.detail = v
  })
  const shake = $('set-shake') as HTMLInputElement
  shake.checked = pr.settings.shake
  refreshers.push(() => {
    shake.checked = pr.settings.shake
  })
  shake.addEventListener('change', () => {
    pr.settings.shake = shake.checked
    game.saveNow()
  })

  mountAccount(game, { onProfileChanged: () => refreshers.forEach((fn) => fn()) })

  game.onPause = () => {
    $('lock-note').hidden = true
    show('pause')
    $('btn-resume').focus()
  }

  // ------------------------------------------------------------ the Ledger and the altars
  const ledger = new Ledger({
    profile: pr,
    changed: () => {
      game.statsChanged()
    },
    sfxUi: () => game.sfx.ui(),
    liveShadows: () => new Set(game.umbra.field().map((u) => u.record!.id)),
  })
  const travel = new TravelPanel({
    altars: () => {
      const here = game.altars.near()
      return game.altars.list.filter((a) => game.altars.isLit(a.key)).map((a) => ({ key: a.key, name: a.name, here: a === here }))
    },
    travel: (key) => game.travel(key),
    openLedger: () => ledger.open(),
  })
  const map = new WorldMap(game)
  if (debug) Object.assign(window as unknown as Record<string, unknown>, { __ledger: ledger, __travel: travel, __map: map })

  /** A menu opens: the game waits and the mouse is freed for the buttons. */
  const openMenu = (menu: { open(): void }) => {
    game.openMenu()
    game.input.unlock()
    menu.open()
  }
  /** Back to the fight: lock the mouse again, or ask for a click on the pause screen if the browser refuses. */
  const backToFight = async () => {
    if (ledger.isOpen || travel.isOpen || map.isOpen) return
    const locked = await game.input.lock()
    if (!locked && !debug) {
      game.pause()
      show('pause')
      $('lock-note').hidden = false
      $('btn-resume').focus()
      return
    }
    game.resume()
  }
  ledger.onClose = () => void backToFight()
  map.onClose = () => void backToFight()
  travel.onClose = () => {
    if (travel.next === 'ledger') ledger.open()
    else void backToFight()
  }
  game.input.onKey = (code) => {
    if (game.state !== 'playing' || !game.player.alive) return
    if (code === 'Tab') openMenu(ledger)
    else if (code === 'KeyM') openMenu(map)
    else if (code === 'KeyF' && game.altars.near() && !game.fight.executable()) openMenu(travel)
  }
  $('btn-resume').addEventListener('click', async () => {
    const locked = await game.input.lock()
    if (!locked && !debug) {
      $('lock-note').hidden = false
      return
    }
    show(null)
    game.resume()
  })
}

boot()
