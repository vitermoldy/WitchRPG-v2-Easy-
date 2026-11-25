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

/** The Ledger: level, stats, the skill tree and the Shadow Room. The game waits while it is open. */
export class Ledger {
  private readonly dlg = $<HTMLDialogElement>('ledger')
  private readonly host: LedgerHost
  onClose: (() => void) | null = null
  /** Shadow Room groups the player has opened, kept open across re-renders. */
  private readonly openGroups = new Set<string>()

  constructor(host: LedgerHost) {
    this.host = host
    $('btn-ledger-close').addEventListener('click', () => this.close())
    this.dlg.addEventListener('close', () => this.onClose?.())
    this.dlg.addEventListener(
      'toggle',
      (e) => {
        const d = e.target as HTMLDetailsElement
        if (!d.dataset?.group) return
        if (d.open) this.openGroups.add(d.dataset.group)
        else this.openGroups.delete(d.dataset.group)
      },
      true,
    )
    this.dlg.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest('button')
      if (!t) return
      const p = this.host.profile
      if (t.dataset.stat) {
        if (spendStat(p, t.dataset.stat as StatKey)) this.after(t.dataset.stat)
      } else if (t.dataset.upgrade) {
        if (buyUpgrade(p, t.dataset.upgrade as SkillId)) this.after('up-' + t.dataset.upgrade)
      } else if (t.dataset.release) {
        const id = Number(t.dataset.release)
        const rec = p.shadows.find((s) => s.id === id)
        if (!rec) return
        const group = `${rec.rank}:${rec.kind}`
        void confirmDialog(`Lepas ${rec.name}?`, `${rec.name} kembali menjadi debu. Bayangan yang dilepas tidak bisa dipanggil lagi.`, 'Lepas bayangan').then((ok) => {
          if (ok && releaseShadow(p, id)) this.after()
          if (!this.dlg.open) this.dlg.showModal()
          // the pressed button may be gone: keep focus in the Ledger, on the group or the close button
          const back = ok ? this.dlg.querySelector<HTMLElement>(`details[data-group="${group}"] summary`) : t
          ;(back && back.isConnected ? back : $('btn-ledger-close')).focus()
        })
      }
    })
  }

  get isOpen() {
    return this.dlg.open
  }

  open() {
    this.render()
    if (!this.dlg.open) this.dlg.showModal()
    $('btn-ledger-close').focus()
  }

  close() {
    if (this.dlg.open) this.dlg.close()
  }

  private after(focusKey?: string) {
    this.host.sfxUi()
    this.host.changed()
    this.render()
    // keep keyboard focus on the control that was used, or the next useful one
    if (focusKey) {
