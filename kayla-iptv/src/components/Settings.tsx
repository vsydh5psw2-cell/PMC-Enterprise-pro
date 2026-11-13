import { useState } from 'react'
import {
  buildXtreamM3uUrl,
  fetchPlaylistText,
  loadXtreamChannels,
  parseM3u,
} from '../lib/m3u'
import { clearPlaylist, savePlaylist } from '../lib/playlistStore'
import type { Channel } from '../data/channels'

type Props = {
  onClose: () => void
  onLoaded: (channels: Channel[], label: string) => void
  onCleared: () => void
}

type Tab = 'm3u-url' | 'm3u-file' | 'xtream'

export function Settings({ onClose, onLoaded, onCleared }: Props) {
  const [tab, setTab] = useState<Tab>('xtream')
  const [m3uUrl, setM3uUrl] = useState('')
  const [server, setServer] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function applyChannels(channels: Channel[], label: string) {
    if (!channels.length) {
      throw new Error('لم يتم العثور على قنوات في القائمة')
    }
    await savePlaylist(label, channels)
    onLoaded(channels, label)
    setMessage(`تم الاشتراك — ${channels.length} قناة`)
    setError(null)
  }

  async function handleLoad() {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      if (tab === 'm3u-url') {
        const url = m3uUrl.trim()
        if (!url) throw new Error('أدخل رابط M3U')
        const text = await fetchPlaylistText(url)
        await applyChannels(parseM3u(text), 'M3U')
      } else if (tab === 'xtream') {
        if (!server.trim() || !username.trim() || !password.trim()) {
          throw new Error('أكمل بيانات Xtream')
        }
        const channels = await loadXtreamChannels(server, username, password)
        await applyChannels(channels, 'Xtream')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل التحميل')
    } finally {
      setBusy(false)
    }
  }

  async function handleFile(file: File | null) {
    if (!file) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const text = await file.text()
      await applyChannels(parseM3u(text), `ملف ${file.name}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل قراءة الملف')
    } finally {
      setBusy(false)
    }
  }

  async function handleClear() {
    await clearPlaylist()
    onCleared()
    setMessage('تمت إعادة القنوات التجريبية')
    setError(null)
  }

  const xtreamDownload =
    server.trim() && username.trim() && password.trim()
      ? buildXtreamM3uUrl(server, username, password, 'm3u8')
      : null

  return (
    <div className="settings-screen">
      <header className="settings-head">
        <button type="button" className="tv-btn" onClick={onClose}>
          رجوع
        </button>
        <div>
          <h1>اشتراك المزود</h1>
          <p>أدخل Xtream أو ارفع/الصق قائمة M3U الخاصة بك.</p>
        </div>
      </header>

      <div className="settings-tabs" role="tablist">
        {(
          [
            ['xtream', 'Xtream'],
            ['m3u-url', 'رابط M3U'],
            ['m3u-file', 'رفع ملف'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`cat${tab === id ? ' is-active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="settings-body">
        {tab === 'm3u-url' && (
          <label className="field">
            <span>رابط القائمة (.m3u / .m3u8)</span>
            <input
              value={m3uUrl}
              onChange={(e) => setM3uUrl(e.target.value)}
              placeholder="https://example.com/playlist.m3u"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        )}

        {tab === 'm3u-file' && (
          <label className="field">
            <span>اختر ملف M3U من الجوال</span>
            <input
              type="file"
              accept=".m3u,.m3u8,audio/x-mpegurl,application/vnd.apple.mpegurl,text/plain"
              onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
            />
          </label>
        )}

        {tab === 'xtream' && (
          <div className="xtream-fields">
            <label className="field">
              <span>السيرفر</span>
              <input
                value={server}
                onChange={(e) => setServer(e.target.value)}
                placeholder="host:port أو https://host:port"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <label className="field">
              <span>اسم المستخدم</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </label>
            <label className="field">
              <span>كلمة المرور</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            {xtreamDownload && (
              <p className="settings-note">
                إذا فشل التحميل:{' '}
                <a href={xtreamDownload} target="_blank" rel="noreferrer">
                  افتح رابط القائمة
                </a>{' '}
                ثم استخدم تبويب «رفع ملف».
              </p>
            )}
          </div>
        )}

        {tab !== 'm3u-file' && (
          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void handleLoad()}
            >
              {busy ? 'جاري الاشتراك…' : 'تفعيل الاشتراك'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void handleClear()}
            >
              مسح والاكتفاء بالتجريبي
            </button>
          </div>
        )}

        {tab === 'm3u-file' && (
          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void handleClear()}
            >
              مسح والاكتفاء بالتجريبي
            </button>
          </div>
        )}

        {message && <p className="settings-ok">{message}</p>}
        {error && <p className="settings-err">{error}</p>}

        <p className="settings-note">
          لا ترسل بيانات الاشتراك في الدردشة. التحميل يمر عبر بروكسي التطبيق لتجاوز
          حظر المتصفح (CORS).
        </p>
      </div>
    </div>
  )
}
