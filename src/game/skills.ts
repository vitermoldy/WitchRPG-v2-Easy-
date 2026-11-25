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
    key: 'X',
    unlock: 7,
    effect: 'Perisai 3 detik yang menyerap 150 damage, lalu meledak dan mendorong musuh.',
    upgrade: 'Menyerap +50 damage.',
    built: true,
  },
  {
    id: 'warp',
    branch: 'chaos',
    name: 'Reality Warp',
    key: 'V',
    unlock: 10,
    effect: 'Medan 10 m selama 5 detik: makhluk terangkat dan proyektil mereka dipantulkan.',
    upgrade: 'Durasi +2 detik.',
    built: true,
  },
  {
    id: 'rite',
    branch: 'umbra',
    name: 'Umbra Rite',
    key: 'Tahan R',
    unlock: 2,
    effect: 'Bangkitkan musuh yang kalah menjadi bayangan. Satu kali coba per tubuh.',
    upgrade: 'Waktu cast jadi 1 detik.',
    built: true,
  },
  {
    id: 'swap',
    branch: 'umbra',
    name: 'Tukar Tempat',
    key: 'Roda Z',
    unlock: 4,
    effect: 'Bertukar posisi dengan bayangan yang paling dekat ke titik bidik.',
    upgrade: 'Cooldown 10 jadi 6 detik.',
    built: true,
  },
  {
    id: 'focus',
    branch: 'umbra',
    name: 'Perintah Fokus',
    key: 'Roda Z',
    unlock: 6,
    effect: 'Perintah Serang membuat semua bayangan memukul target yang sama.',
    upgrade: 'Damage bayangan pada target itu +20%.',
    built: true,
  },
  {
    id: 'general',
    branch: 'umbra',
    name: 'Kebangkitan Jenderal',
    key: 'Tahan R',
    unlock: 8,
    effect: 'Bisa membangkitkan makhluk berpangkat Jenderal: Medusa dan Chimera.',
    upgrade: '',
    built: true,
    noUpgrade: true,
  },
  {
    id: 'marshal',
    branch: 'umbra',
    name: 'Kebangkitan Marsekal',
    key: 'Tahan R',
    unlock: 9,
    effect: 'Bisa membangkitkan boss berpangkat Marsekal, satu kali per boss. Hydra datang di fase berikutnya.',
    upgrade: '',
    built: true,
    noUpgrade: true,
  },
]

export const skillById = (id: SkillId): SkillDef => SKILLS.find((s) => s.id === id)!
