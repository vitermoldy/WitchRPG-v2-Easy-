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

