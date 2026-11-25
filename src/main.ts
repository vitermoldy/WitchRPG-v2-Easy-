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
