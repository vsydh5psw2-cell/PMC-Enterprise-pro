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

function hashId(value: string): string {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
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

/**
 * Keep the scheme the user typed. If omitted, use HTTPS only —
 * never silently downgrade to cleartext HTTP with credentials.
 */
export function normalizeServerBase(server: string): string {
  const trimmed = server.trim().replace(/\/+$/, '')
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function buildXtreamM3uUrl(
  server: string,
  username: string,
  password: string,
  output: 'ts' | 'm3u8' = 'm3u8',
): string {
  const base = normalizeServerBase(server)
  const url = new URL(`${base}/get.php`)
  url.searchParams.set('username', username)
  url.searchParams.set('password', password)
  url.searchParams.set('type', 'm3u_plus')
  url.searchParams.set('output', output)
  return url.toString()
}

export function buildXtreamApiUrl(
  server: string,
  username: string,
  password: string,
  action?: string,
): string {
  const base = normalizeServerBase(server)
  const url = new URL(`${base}/player_api.php`)
  url.searchParams.set('username', username)
  url.searchParams.set('password', password)
  if (action) url.searchParams.set('action', action)
  return url.toString()
}

export function channelsFromXtreamLive(
  streams: Array<Record<string, unknown>>,
  categories: Array<Record<string, unknown>>,
  server: string,
  username: string,
  password: string,
): Channel[] {
  const base = normalizeServerBase(server)
  const catMap = new Map<string, string>()
  for (const c of categories) {
    const id = String(c.category_id ?? '')
    const name = String(c.category_name ?? 'عام')
    if (id) catMap.set(id, name)
  }

  const out: Channel[] = []
  for (let index = 0; index < streams.length; index += 1) {
    const s = streams[index]!
    const streamId = String(s.stream_id ?? '')
    if (!streamId) continue
    const name = String(s.name ?? `قناة ${index + 1}`)
    const categoryId = String(s.category_id ?? '')
    const group = catMap.get(categoryId) || 'مباشر'
    const streamUrl = `${base}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.m3u8`
    out.push({
      id: `xt-${streamId}`,
      name,
      nameAr: name,
      category: group,
      categoryAr: group,
      color: colorFor(group + name),
      streamUrl,
      description: group,
      logo: typeof s.stream_icon === 'string' ? s.stream_icon : undefined,
    })
  }
  return out
}

function assertM3u(text: string) {
  if (!/#EXTM3U/i.test(text) && !/#EXTINF/i.test(text)) {
    throw new Error('الملف ليس قائمة M3U صالحة')
  }
  return text
}

/** Browser-only fetch (no server proxy — avoids SSRF). May fail when the provider blocks CORS. */
export async function fetchPlaylistText(url: string): Promise<string> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`المزود أرجع HTTP ${res.status}`)
    return assertM3u(await res.text())
  } catch (err) {
    if (err instanceof Error && /M3U|HTTP|قائمة/i.test(err.message)) throw err
    throw new Error(
      'المتصفح منع تحميل القائمة (CORS). افتح رابط التحميل ثم استخدم «رفع ملف» أو «لصق M3U».',
    )
  }
}

export async function fetchJsonDirect(url: string): Promise<unknown> {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`المزود أرجع HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    if (err instanceof Error && /HTTP|JSON/i.test(err.message)) throw err
    throw new Error('تعذّر قراءة بيانات المزود من المتصفح')
  }
}

export async function loadXtreamChannels(
  server: string,
  username: string,
  password: string,
): Promise<Channel[]> {
  // Try player_api in the browser (works only if provider allows CORS).
  try {
    const catsUrl = buildXtreamApiUrl(server, username, password, 'get_live_categories')
    const streamsUrl = buildXtreamApiUrl(server, username, password, 'get_live_streams')
    const [cats, streams] = await Promise.all([
      fetchJsonDirect(catsUrl),
      fetchJsonDirect(streamsUrl),
    ])
    if (Array.isArray(streams) && streams.length) {
      const channels = channelsFromXtreamLive(
        streams as Array<Record<string, unknown>>,
        Array.isArray(cats) ? (cats as Array<Record<string, unknown>>) : [],
        server,
        username,
        password,
      )
      if (channels.length) return channels
    }
  } catch {
    // fall through
  }

  // Try M3U with the same scheme the user provided (no silent HTTP downgrade).
  try {
    const text = await fetchPlaylistText(
      buildXtreamM3uUrl(server, username, password, 'm3u8'),
    )
    const channels = parseM3u(text)
    if (channels.length) return channels
  } catch {
    // fall through to guided upload
  }

  throw new Error(
    'المتصفح لا يستطيع سحب القنوات مباشرة من هذا المزود. اضغط «فتح رابط القائمة» ثم ارفع الملف من تبويب رفع ملف.',
  )
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
