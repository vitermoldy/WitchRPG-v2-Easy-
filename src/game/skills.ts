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
