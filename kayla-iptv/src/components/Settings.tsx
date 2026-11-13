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

type Tab = 'xtream' | 'm3u-file' | 'm3u-paste' | 'm3u-url'

export function Settings({ onClose, onLoaded, onCleared }: Props) {
  const [tab, setTab] = useState<Tab>('xtream')
  const [m3uUrl, setM3uUrl] = useState('')
  const [m3uText, setM3uText] = useState('')
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
      } else if (tab === 'm3u-paste') {
        if (!m3uText.trim()) throw new Error('الصق محتوى ملف M3U')
        await applyChannels(parseM3u(m3uText), 'M3U (لصق)')
      } else if (tab === 'xtream') {
        if (!server.trim() || !username.trim() || !password.trim()) {
          throw new Error('أكمل بيانات Xtream')
        }
        const channels = await loadXtreamChannels(server, username, password)
        await applyChannels(channels, 'Xtream')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'فشل التحميل'
      setError(msg === 'Load failed' ? 'فشل التحميل من المزود' : msg)
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
          <p>الأضمن على الموبايل: افتح رابط القائمة ثم ارفع الملف.</p>
        </div>
      </header>

      <div className="settings-tabs" role="tablist">
        {(
          [
            ['xtream', 'Xtream'],
            ['m3u-file', 'رفع ملف'],
            ['m3u-paste', 'لصق M3U'],
            ['m3u-url', 'رابط M3U'],
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

        {tab === 'm3u-paste' && (
          <label className="field">
            <span>الصق محتوى ملف M3U</span>
            <textarea
              value={m3uText}
              onChange={(e) => setM3uText(e.target.value)}
              placeholder={'#EXTM3U\n#EXTINF:-1,قناة\nhttp://...'}
              rows={10}
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
                placeholder="https://host:port"
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
              <a
                className="btn btn-ghost"
                href={xtreamDownload}
                target="_blank"
                rel="noreferrer"
              >
                فتح رابط القائمة للتحميل
              </a>
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
          لا تشارك السيرفر أو كلمة المرور في الدردشة أو لقطات الشاشة. إن ظهرت في
          صورة، غيّر كلمة المرور عند المزود.
        </p>
      </div>
    </div>
  )
}
