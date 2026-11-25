import { DEFAULT_SETTINGS, newProfile, STAT_KEYS, type Profile } from './progression'

const KEY = 'witchrpg-v2-easy:profile:v1'

/** Reads the saved witch. Storage can be blocked or hold junk; both give a fresh profile. */
export function loadProfile(): { profile: Profile; error: string | null } {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return { profile: newProfile(), error: 'Penyimpanan browser diblokir, progres tidak akan tersimpan.' }
  }
  if (!raw) return { profile: newProfile(), error: null }
  try {
    const profile = normalizeProfile(JSON.parse(raw))
    if (!profile) throw new Error('shape')
    return { profile, error: null }
  } catch {
    return { profile: newProfile(), error: 'Data simpanan rusak, jadi witch dimulai dari Lv 1.' }
  }
}

/** A witch from storage or the server, with defaults filled in; null when it is not one. */
export function normalizeProfile(data: Partial<Profile> | null | undefined): Profile | null {
  if (!data || data.version !== 1 || typeof data.level !== 'number' || !data.stats) return null
  const base = newProfile()
  const profile: Profile = {
    ...base,
    ...data,
    stats: { ...base.stats, ...data.stats },
    tierClears: { ...base.tierClears, ...data.tierClears },
    settings: { ...DEFAULT_SETTINGS, ...data.settings },
    upgrades: { ...data.upgrades },
    shadows: Array.isArray(data.shadows) ? data.shadows : [],
    world: {
      altars: Array.isArray(data.world?.altars) && data.world.altars.length ? [...new Set(data.world.altars.filter((a) => typeof a === 'string'))] : [...base.world.altars],
      last: typeof data.world?.last === 'string' ? data.world.last : base.world.last,
    },
  } as Profile
  for (const k of STAT_KEYS) if (typeof profile.stats[k] !== 'number') profile.stats[k] = base.stats[k]
