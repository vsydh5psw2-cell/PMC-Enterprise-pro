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

export function normalizeServerBase(server: string): string {
  const trimmed = server.trim().replace(/\/+$/, '')
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  // Prefer HTTPS to avoid sending credentials over cleartext when possible.
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

async function fetchTextDirect(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

/** Fetch via same-origin proxy first (avoids CORS), then direct fetch. */
export async function fetchPlaylistText(url: string): Promise<string> {
  try {
    const res = await fetch('/api/fetch-playlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (res.ok) {
      const data = (await res.json()) as { text?: string; error?: string }
      return assertM3u(data.text || '')
    }
    // Static hosts may 404 the API — fall through to direct fetch.
    if (res.status !== 404) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(data.error || `HTTP ${res.status}`)
    }
  } catch (err) {
    if (err instanceof Error && !/Failed to fetch|NetworkError|404/i.test(err.message)) {
      // keep going to direct only for network/missing-proxy cases; rethrow app errors
      if (!/HTTP|رابط|قائمة|مهلة|السيرفر/i.test(err.message)) {
        // fall through
      } else if (!/Failed to fetch|NetworkError/i.test(err.message)) {
        throw err
      }
    }
  }

  try {
    return assertM3u(await fetchTextDirect(url))
  } catch {
    throw new Error(
      'تعذّر جلب القائمة من المتصفح. استخدم تبويب «رفع ملف» بعد تحميل M3U من المزود.',
    )
  }
}

export async function fetchJsonViaProxy(url: string): Promise<unknown> {
  const text = await (async () => {
    try {
      const res = await fetch('/api/fetch-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (res.ok) {
        const data = (await res.json()) as { text?: string }
        return data.text || ''
      }
      if (res.status !== 404) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || `HTTP ${res.status}`)
      }
    } catch (err) {
      if (err instanceof Error && /HTTP|مهلة|السيرفر|JSON/i.test(err.message)) {
        if (!/Failed to fetch|NetworkError/i.test(err.message)) throw err
      }
    }
    return fetchTextDirect(url)
  })()

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('رد المزود ليس JSON صالحاً')
  }
}

export async function loadXtreamChannels(
  server: string,
  username: string,
  password: string,
): Promise<Channel[]> {
  // 1) Prefer player_api JSON (smaller, structured)
  try {
    const catsUrl = buildXtreamApiUrl(server, username, password, 'get_live_categories')
    const streamsUrl = buildXtreamApiUrl(server, username, password, 'get_live_streams')
    const [cats, streams] = await Promise.all([
      fetchJsonViaProxy(catsUrl),
      fetchJsonViaProxy(streamsUrl),
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
    // fall through to M3U
  }

  // 2) Fallback: full M3U playlist (https first, then http if needed)
  const httpsUrl = buildXtreamM3uUrl(server, username, password, 'm3u8')
  try {
    const text = await fetchPlaylistText(httpsUrl)
    const channels = parseM3u(text)
    if (channels.length) return channels
  } catch (httpsErr) {
    const httpBase = normalizeServerBase(server).replace(/^https:/i, 'http:')
    if (httpBase === normalizeServerBase(server)) throw httpsErr
    const httpUrl = buildXtreamM3uUrl(httpBase, username, password, 'ts')
    const text = await fetchPlaylistText(httpUrl)
    const channels = parseM3u(text)
    if (channels.length) return channels
    throw httpsErr
  }

  throw new Error('لم يتم العثور على قنوات من المزود')
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
