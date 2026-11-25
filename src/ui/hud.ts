import * as THREE from 'three'
import { CHAOS, ELITE, UNITS, type UnitKind } from '../game/balance'
import { xpToNext } from '../game/progression'
import type { Game } from '../engine/game'
import type { Zone } from '../world/map'

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T

type Tone = 'info' | 'chaos' | 'umbra' | 'level'

/** How to fight each mini-boss, under its bar. */
const BOSS_HINT: Partial<Record<UnitKind, string>> = {
  medusa: 'Tatapannya membatukan: tahan C saat lingkarannya penuh, atau pasang Hex Barrier.',
  chimera: 'Api di depan, seruduk kambing dari jauh, sengat ular di belakang. Ia memanggil Imp.',
  cerberus: 'Tiga kepala menggigit di lingkaran, api di depan, terjangan dari jauh. Ia memanggil Hellhound.',
  lilith: 'Menghilang saat didekati. Roll dari tombak gelap; kutukannya meracuni. Ia memanggil Succubus.',
  dragon: 'Api di depan, ekor di belakang, bola api dari jauh. Terkamannya hanya bisa dihindari dengan roll.',
  atlas: 'Bola dunia jatuh di lingkaran besar di depannya: keluar sebelum penuh. Dari jauh ia melempar batu.',
  typhon: 'Hantaman badai di lingkaran lebar, petir dari jauh, lecutan ular di garis. Ia memanggil Harpy.',
