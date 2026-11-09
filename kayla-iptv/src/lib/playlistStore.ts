import type { Channel } from '../data/channels'
import { demoChannels } from '../data/channels'

const KEY = 'kayla-iptv-playlist-v1'

export type StoredPlaylist = {
  sourceLabel: string
  channels: Channel[]
  savedAt: string
}

export function loadPlaylist(): StoredPlaylist | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredPlaylist
    if (!parsed?.channels?.length) return null
    return parsed
  } catch {
    return null
  }
}

export function savePlaylist(sourceLabel: string, channels: Channel[]) {
  const payload: StoredPlaylist = {
    sourceLabel,
    channels,
    savedAt: new Date().toISOString(),
  }
  localStorage.setItem(KEY, JSON.stringify(payload))
  return payload
}

export function clearPlaylist() {
  localStorage.removeItem(KEY)
}

export function activeCatalog(): {
  channels: Channel[]
  sourceLabel: string
  isDemo: boolean
} {
  const stored = loadPlaylist()
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
