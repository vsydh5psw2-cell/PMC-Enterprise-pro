import { get, set, del } from 'idb-keyval'
import type { Channel } from '../data/channels'
import { demoChannels } from '../data/channels'

const KEY = 'kayla-iptv-playlist-v2'
const LEGACY_KEY = 'kayla-iptv-playlist-v1'

export type StoredPlaylist = {
  sourceLabel: string
  channels: Channel[]
  savedAt: string
}

export async function loadPlaylist(): Promise<StoredPlaylist | null> {
  try {
    const stored = await get<StoredPlaylist>(KEY)
    if (stored?.channels?.length) return stored

    // Migrate old localStorage playlist if present.
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredPlaylist
    if (!parsed?.channels?.length) return null
    await savePlaylist(parsed.sourceLabel, parsed.channels)
    localStorage.removeItem(LEGACY_KEY)
    return parsed
  } catch {
    return null
  }
}

export async function savePlaylist(sourceLabel: string, channels: Channel[]) {
  const payload: StoredPlaylist = {
    sourceLabel,
    channels,
    savedAt: new Date().toISOString(),
  }
  try {
    await set(KEY, payload)
  } catch (err) {
    const name = err instanceof DOMException ? err.name : ''
    if (name === 'QuotaExceededError' || /quota/i.test(String(err))) {
      throw new Error(
        'القائمة كبيرة جداً للتخزين على الجهاز. جرّب قائمة أقصر أو تصفية المجموعات.',
      )
    }
    throw err
  }
  return payload
}

export async function clearPlaylist() {
  await del(KEY)
  localStorage.removeItem(LEGACY_KEY)
}

export async function activeCatalog(): Promise<{
  channels: Channel[]
  sourceLabel: string
  isDemo: boolean
}> {
  const stored = await loadPlaylist()
  if (stored?.channels.length) {
    return {
      channels: stored.channels,
      sourceLabel: stored.sourceLabel,
      isDemo: false,
    }
  }
  return {
    channels: demoChannels,
    sourceLabel: 'تجريبي',
    isDemo: true,
  }
}
