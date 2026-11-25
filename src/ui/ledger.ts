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
      const sel = focusKey.startsWith('up-') ? `[data-upgrade="${focusKey.slice(3)}"]` : `[data-stat="${focusKey}"]`
      const el = this.dlg.querySelector<HTMLButtonElement>(sel)
      if (el && !el.disabled) el.focus()
      else $('btn-ledger-close').focus()
    }
  }

  render() {
    const p = this.host.profile
    const d = derive(p.stats, p.level)
    const need = xpToNext(p.level)
    $('ledger-lv').textContent = `Lv ${p.level}`
    $('ledger-xp-fill').style.transform = `scaleX(${Math.min(1, p.xp / need).toFixed(3)})`
    $('ledger-xp-text').textContent = `${fmt(p.xp)} / ${fmt(need)} XP`
    $('stat-points').textContent = p.statPoints ? `${p.statPoints} poin bebas` : 'tidak ada poin'
    $('skill-points').textContent = p.skillPoints ? `${p.skillPoints} poin skill` : 'tidak ada poin'

    $('stat-list').innerHTML = STAT_KEYS.map((k) => {
      const info = STAT_INFO[k]
      return `<li class="stat">
        <span class="stat-name"><b>${info.name}</b><small>${info.effect}</small></span>
        <span class="stat-val num">${p.stats[k]}</span>
        <button class="btn btn-small" type="button" data-stat="${k}" ${p.statPoints > 0 ? '' : 'disabled'} aria-label="Tambah 1 poin ke ${info.name}">+</button>
      </li>`
    }).join('')

    $('derived-list').innerHTML = [
      ['HP maksimum', fmt(d.maxHp)],
      ['Mana maksimum', fmt(d.maxMana)],
      ['Regen mana', `${fmt(d.manaRegen, 1)} per detik`],
      ['Damage', `${fmt(d.damageMult * 100)}%`],
      ['Jarak dodge', `${fmt(d.dodgeDistance, 2)} m`],
      ['Kekuatan bayangan', `${fmt(d.shadowPower * 100)}%`],
    ]
      .map(([a, b]) => `<dt>${a}</dt><dd class="num">${b}</dd>`)
      .join('')

    for (const branch of ['chaos', 'umbra'] as const) {
      $(`tree-${branch}`).innerHTML = SKILLS.filter((s) => s.branch === branch)
        .map((s) => {
          const open = isUnlocked(p, s.id)
          const bought = !!p.upgrades[s.id]
          let up = ''
          if (s.noUpgrade) up = ''
          else if (bought) up = `<p class="node-up bought">Upgrade terpasang: ${s.upgrade}</p>`
          else
            up = `<p class="node-up"><span>Upgrade: ${s.upgrade}</span><button class="btn btn-small ${branch === 'umbra' ? 'btn-umbra' : ''}" type="button" data-upgrade="${s.id}" ${
              canUpgrade(p, s.id) ? '' : 'disabled'
            }>Pakai 1 poin</button></p>`
          return `<li class="node ${open ? 'open' : 'locked'}">
            <p class="node-name">${s.name}<kbd>${s.key}</kbd></p>
            <p class="node-meta">${open ? 'Terbuka' : `Lv ${s.unlock}`}</p>
            <p class="node-effect">${s.effect}</p>
            ${up}
          </li>`
        })
        .join('')
    }

    const live = this.host.liveShadows()
    $('room-count').textContent = p.shadows.length ? `${p.shadows.length} bayangan, ${live.size} di medan` : ''
    if (!p.shadows.length) {
      $('room-list').innerHTML = `<li class="room-empty">${
        isUnlocked(p, 'rite')
          ? 'Belum ada bayangan. Kalahkan makhluk, hadapkan kamera ke tubuhnya yang bersinar ungu, lalu tahan R.'
          : 'Belum ada bayangan. Umbra Rite terbuka di Lv 2: setelah itu tubuh makhluk yang kalah bisa dibangkitkan.'
      }</li>`
      return
    }
    // one group per kind and rank, strongest first, so three hundred shadows still read at a glance
    const order: Record<string, number> = { marsekal: 0, jenderal: 1, ksatria: 2, prajurit: 3 }
    const groups = new Map<string, typeof p.shadows>()
    for (const s of p.shadows) {
      const key = `${s.rank}:${s.kind}`
      const list = groups.get(key)
      if (list) list.push(s)
      else groups.set(key, [s])
    }
    const keys = [...groups.keys()].sort((a, b) => order[a.split(':')[0]] - order[b.split(':')[0]] || a.localeCompare(b))
    $('room-list').innerHTML = keys
      .map((key) => {
        const list = groups.get(key)!.sort((a, b) => b.level - a.level)
        const [rank, kind] = key.split(':') as [keyof typeof RANKS, keyof typeof UNITS]
        const fighting = list.filter((s) => live.has(s.id)).length
        const shown = list.slice(0, ROOM_SHOWN)
        return `<li class="room-group">
          <details data-group="${key}" ${this.openGroups.has(key) ? 'open' : ''}>
            <summary>
              <span class="room-name">${RANKS[rank].label} ${UNITS[kind].name}</span>
              <span class="room-meta num">${list.length} bayangan, Lv ${list[list.length - 1].level} sampai ${list[0].level}${fighting ? `, ${fighting} di medan` : ''}</span>
            </summary>
            <ul class="room-members">${shown
              .map(
