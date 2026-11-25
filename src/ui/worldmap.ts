import { FAUNA, UNITS, type UnitKind, type V2Kind } from '../game/balance'
import type { Game } from '../engine/game'
import { CAMP_DEFS } from '../world/camps'
import { ALTARS, heightMap, inWaterRect, PATHS, PLAY_HALF, toMap, WATER_LEVEL, ZONES, zoneWeights } from '../world/map'

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T

/** Half the width of the map drawn (m): a little past the playable edge. */
const EXTENT = PLAY_HALF + 10
const BASE = 320
const SAVE_KEY = 'witchrpg-v2-easy:map-kinds'

// one colour per creature kind on the map; chosen to stay apart from each other and readable on the ground tones
const KIND_COLOR: Partial<Record<UnitKind, string>> = {
  imp: '#ff8a5c', hellhound: '#5ce0ff', harpy: '#9fd0ff', centaur: '#e8c070', griffin: '#ffd34d', hippogriff: '#f0a8ff',
  naga: '#6dff9a', minotaur: '#ff5c7a', cyclops: '#c9a27a', succubus: '#7dffcf', incubus: '#b6ff5c', phoenix: '#ffb04d',
  pegasus: '#ffffff', unicorn: '#d8f6ff',
}

interface BossEntry {
  kind: UnitKind
  name: string
  level: number
  zone: string
