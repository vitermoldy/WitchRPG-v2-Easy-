export type SkillId =
  | 'hexBolt'
  | 'grip'
  | 'burst'
  | 'snare'
  | 'barrier'
  | 'warp'
  | 'rite'
  | 'swap'
  | 'focus'
  | 'general'
  | 'marshal'

export type Branch = 'chaos' | 'umbra'

export interface SkillDef {
  id: SkillId
  branch: Branch
  name: string
  key: string
  unlock: number
  effect: string
  upgrade: string
  /** False for skills the GDD lists that this prototype does not play yet. */
  built: boolean
  /** The GDD gives this skill no upgrade, so no point can be spent on it. */
  noUpgrade?: boolean
}

export const SKILLS: SkillDef[] = [
  {
    id: 'hexBolt',
    branch: 'chaos',
    name: 'Hex Bolt',
    key: 'Bidik, LMB',
    unlock: 1,
    effect: 'Proyektil merah lurus, 12 damage, mengisi meter Chaos dan meter stun, menjatuhkan Harpy.',
    upgrade: 'Menembak 3 peluru menyebar.',
    built: true,
  },
  {
    id: 'grip',
    branch: 'chaos',
    name: 'Telekinesis Grip',
    key: 'Bidik, tahan LMB',
    unlock: 1,
    effect: 'Angkat makhluk hingga 500 kg, lepas untuk melempar; lemparan menembus perisai Minotaur.',
    upgrade: 'Mengangkat 2 target sekaligus.',
    built: true,
  },
  {
    id: 'burst',
    branch: 'chaos',
    name: 'Chaos Burst',
    key: 'Q',
    unlock: 3,
    effect: 'Ledakan radius 8 m di titik bidik atau target lock-on, melempar makhluk ke udara.',
    upgrade: 'Radius +2 m.',
    built: true,
  },
  {
    id: 'snare',
    branch: 'chaos',
    name: 'Hex Snare',
    key: 'E',
    unlock: 5,
    effect: 'Zona 6 m selama 6 detik: musuh melambat 40% dan menerima +25% damage.',
    upgrade: 'Durasi +2 detik.',
    built: true,
  },
  {
    id: 'barrier',
    branch: 'chaos',
    name: 'Hex Barrier',
