import { get, set, del } from 'idb-keyval'
import type { Channel } from '../data/channels'
import { demoChannels } from '../data/channels'

const KEY = 'kayla-iptv-playlist-v2'
const LEGACY_KEY = 'kayla-iptv-playlist-v1'
const BOOT_GUARD = 'kayla-boot-guard'
const MAX_CHANNELS = 5000

export type StoredPlaylist = {
  sourceLabel: string
  channels: Channel[]
  savedAt: string
}

/** If Safari crash-loops, clear heavy playlist on the next quick reload. */
export async function recoverFromCrashLoop(): Promise<boolean> {
  try {
    const now = Date.now()
    const prev = Number(sessionStorage.getItem(BOOT_GUARD) || '0')
    sessionStorage.setItem(BOOT_GUARD, String(now))
    if (prev && now - prev < 12000) {
      await clearPlaylist()
      sessionStorage.removeItem(BOOT_GUARD)
      return true
    }
    window.setTimeout(() => {
      try {
        sessionStorage.removeItem(BOOT_GUARD)
      } catch {
        // ignore
      }
    }, 8000)
  } catch {
    // ignore
  }
  return false
}

export async function loadPlaylist(): Promise<StoredPlaylist | null> {
  try {
    const stored = await get<StoredPlaylist>(KEY)
    if (stored?.channels?.length) {
      if (stored.channels.length > MAX_CHANNELS) {
        return {
          ...stored,
          channels: stored.channels.slice(0, MAX_CHANNELS),
        }
      }
      return stored
    }

    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredPlaylist
    if (!parsed?.channels?.length) return null
    const clipped = parsed.channels.slice(0, MAX_CHANNELS)
    await savePlaylist(parsed.sourceLabel, clipped)
    localStorage.removeItem(LEGACY_KEY)
    return { ...parsed, channels: clipped }
  } catch {
    return null
  }
}

export async function savePlaylist(sourceLabel: string, channels: Channel[]) {
  const clipped = channels.slice(0, MAX_CHANNELS)
  const payload: StoredPlaylist = {
    sourceLabel,
    channels: clipped,
    savedAt: new Date().toISOString(),
  }
  try {
    await set(KEY, payload)
  } catch (err) {
    const name = err instanceof DOMException ? err.name : ''
    if (name === 'QuotaExceededError' || /quota/i.test(String(err))) {
      throw new Error(
        'القائمة كبيرة جداً للتخزين على الجهاز. جرّب رفع ملف أصغر أو لصق جزء منه.',
      )
    }
    throw err
  }
  return {
    payload,
    truncated: channels.length > MAX_CHANNELS,
    savedCount: clipped.length,
  }
}

export async function clearPlaylist() {
  await del(KEY)
  try {
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    // ignore
  }
}

export async function activeCatalog(): Promise<{
  channels: Channel[]
  sourceLabel: string
  isDemo: boolean
  recovered: boolean
}> {
  const recovered = await recoverFromCrashLoop()
  const stored = recovered ? null : await loadPlaylist()
  if (stored?.channels.length) {
    return {
      channels: stored.channels,
      sourceLabel: stored.sourceLabel,
      isDemo: false,
      recovered,
    }
  }
  return {
    channels: demoChannels,
    sourceLabel: 'تجريبي',
    isDemo: true,
    recovered,
  }
}
