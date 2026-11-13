import type { Channel } from '../data/channels'

const PALETTE = [
  '#2aa889',
  '#3d7ea6',
  '#c4783a',
  '#c44b4b',
  '#6b7fd7',
  '#d4a017',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#16a085',
]

function colorFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]!
}

function attr(line: string, key: string): string | undefined {
  const re = new RegExp(`${key}="([^"]*)"`, 'i')
  return re.exec(line)?.[1]
}

/** Parse M3U / M3U Plus playlist text into Kayla channels. */
export function parseM3u(text: string): Channel[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  const out: Channel[] = []
  let pending: { name: string; group: string; logo?: string } | null = null

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (line.startsWith('#EXTINF:')) {
      const comma = line.lastIndexOf(',')
      const name = (comma >= 0 ? line.slice(comma + 1) : 'قناة').trim() || 'قناة'
      const group =
        attr(line, 'group-title')?.trim() ||
        attr(line, 'group-name')?.trim() ||
        'عام'
      pending = { name, group, logo: attr(line, 'tvg-logo') }
      continue
    }

    if (line.startsWith('#')) continue
    if (!pending) continue

    const streamUrl = line
    const id = `m3u-${out.length + 1}-${hashId(streamUrl)}`
    out.push({
      id,
      name: pending.name,
      nameAr: pending.name,
      category: pending.group,
      categoryAr: pending.group,
      color: colorFor(pending.group + pending.name),
      streamUrl,
      description: pending.group,
      logo: pending.logo,
    })
    pending = null
  }

  return out
}

function hashId(value: string): string {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export function buildXtreamM3uUrl(
  server: string,
  username: string,
  password: string,
): string {
  const base = server.replace(/\/+$/, '')
  const withProto = /^https?:\/\//i.test(base) ? base : `http://${base}`
  const url = new URL(`${withProto}/get.php`)
  url.searchParams.set('username', username)
  url.searchParams.set('password', password)
  url.searchParams.set('type', 'm3u_plus')
  url.searchParams.set('output', 'ts')
  return url.toString()
}

export async function fetchPlaylistText(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  const text = await res.text()
  if (!/#EXTM3U/i.test(text) && !/#EXTINF/i.test(text)) {
    throw new Error('الملف ليس قائمة M3U صالحة')
  }
  return text
}

export function categoriesFromChannels(list: Channel[]) {
  const groups = [...new Set(list.map((c) => c.category))].sort((a, b) =>
    a.localeCompare(b, 'ar'),
  )
  return [
    { id: 'all', label: 'All', labelAr: 'الكل' },
    ...groups.map((g) => ({ id: g, label: g, labelAr: g })),
  ]
}
