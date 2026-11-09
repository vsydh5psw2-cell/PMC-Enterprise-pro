import { useState } from 'react'
import {
  buildXtreamM3uUrl,
  fetchPlaylistText,
  parseM3u,
} from '../lib/m3u'
import { clearPlaylist, savePlaylist } from '../lib/playlistStore'
import type { Channel } from '../data/channels'

type Props = {
  onClose: () => void
  onLoaded: (channels: Channel[], label: string) => void
  onCleared: () => void
}

type Tab = 'm3u-url' | 'm3u-paste' | 'xtream'

export function Settings({ onClose, onLoaded, onCleared }: Props) {
  const [tab, setTab] = useState<Tab>('m3u-url')
  const [m3uUrl, setM3uUrl] = useState('')
  const [m3uText, setM3uText] = useState('')
  const [server, setServer] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function applyText(text: string, label: string) {
    const channels = parseM3u(text)
    if (!channels.length) {
      throw new Error('لم يتم العثور على قنوات في القائمة')
    }
    savePlaylist(label, channels)
    onLoaded(channels, label)
    setMessage(`تم تحميل ${channels.length} قناة`)
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
        await applyText(text, 'M3U')
      } else if (tab === 'm3u-paste') {
        if (!m3uText.trim()) throw new Error('الصق محتوى ملف M3U')
        await applyText(m3uText, 'M3U (لصق)')
      } else {
        if (!server.trim() || !username.trim() || !password.trim()) {
          throw new Error('أكمل بيانات Xtream')
        }
        const url = buildXtreamM3uUrl(server, username, password)
        const text = await fetchPlaylistText(url)
        await applyText(text, 'Xtream')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'فشل التحميل'
      const corsHint =
        /Failed to fetch|NetworkError|CORS|HTTP/i.test(msg)
          ? ' — جرّب تبويب «لصق M3U» إذا منع السيرفر التحميل من المتصفح (CORS).'
          : ''
      setError(msg + corsHint)
    } finally {
      setBusy(false)
    }
  }

  function handleClear() {
    clearPlaylist()
    onCleared()
    setMessage('تمت إعادة القنوات التجريبية')
    setError(null)
  }

  return (
    <div className="settings-screen">
      <header className="settings-head">
        <button type="button" className="tv-btn" onClick={onClose}>
          رجوع
        </button>
        <div>
          <h1>إضافة قنوات IPTV</h1>
          <p>استخدم قائمة M3U أو اشتراك Xtream الخاص بك (مصدر مرخّص).</p>
        </div>
      </header>

      <div className="settings-tabs" role="tablist">
        {(
          [
            ['m3u-url', 'رابط M3U'],
            ['m3u-paste', 'لصق M3U'],
            ['xtream', 'Xtream'],
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
            <span>محتوى ملف M3U</span>
            <textarea
              value={m3uText}
              onChange={(e) => setM3uText(e.target.value)}
              placeholder={'#EXTM3U\n#EXTINF:-1,قناة\nhttp://...'}
              rows={10}
              spellCheck={false}
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
                placeholder="http://host:port"
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
          </div>
        )}

        <div className="settings-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void handleLoad()}
          >
            {busy ? 'جاري التحميل…' : 'تحميل القنوات'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleClear}>
            مسح والاكتفاء بالتجريبي
          </button>
        </div>

        {message && <p className="settings-ok">{message}</p>}
        {error && <p className="settings-err">{error}</p>}

        <p className="settings-note">
          لا تشارك رابط الاشتراك أو كلمة المرور في الدردشة. البيانات تُحفظ على هذا
          الجهاز فقط. بعض السيرفرات تمنع التشغيل من متصفح الويب بسبب CORS.
        </p>
      </div>
    </div>
  )
}
