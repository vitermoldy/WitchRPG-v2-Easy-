import { RANKS, UNITS } from '../game/balance'
import { buyUpgrade, canUpgrade, derive, isUnlocked, releaseShadow, spendStat, STAT_KEYS, xpToNext, type Profile, type StatKey } from '../game/progression'
import { SKILLS, type SkillId } from '../game/skills'

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T

const STAT_INFO: Record<StatKey, { name: string; effect: string }> = {
  hex: { name: 'Hex', effect: '+2% damage tongkat dan sihir Chaos' },
  spr: { name: 'Spirit', effect: '+5 mana maks, regen lebih cepat' },
  vit: { name: 'Vitality', effect: '+10 HP maks' },
  agi: { name: 'Agility', effect: '+1% gerak, dodge sedikit lebih jauh' },
  umb: { name: 'Umbra', effect: 'bayangan +2% lebih kuat (di versi Easy setiap Rite berhasil)' },
}

