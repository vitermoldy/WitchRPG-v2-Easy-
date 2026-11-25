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

const fmt = (n: number, d = 0) => n.toLocaleString('id-ID', { maximumFractionDigits: d, minimumFractionDigits: d })

/** Ask once before something that cannot be undone. */
export function confirmDialog(title: string, text: string, yes: string): Promise<boolean> {
  const dlg = $<HTMLDialogElement>('confirm')
  $('confirm-title').textContent = title
  $('confirm-text').textContent = text
  $('confirm-yes').textContent = yes
  return new Promise((resolve) => {
    const done = (v: boolean) => {
      $('confirm-yes').onclick = null
      $('confirm-no').onclick = null
      dlg.onclose = null
      if (dlg.open) dlg.close()
      resolve(v)
    }
    $('confirm-yes').onclick = () => done(true)
    $('confirm-no').onclick = () => done(false)
    dlg.onclose = () => done(false)
    dlg.showModal()
    $('confirm-no').focus()
  })
}

export interface LedgerHost {
  profile: Profile
  /** Called after any change so the game can refresh derived stats and save. */
  changed(): void
  sfxUi(): void
  /** Shadows standing on the field, by record id. */
  liveShadows(): Set<number>
}

/** Members listed per Shadow Room group; the rest are summed up in one line. */
const ROOM_SHOWN = 60

