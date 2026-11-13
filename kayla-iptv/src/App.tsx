import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { Channel } from './data/channels'
import { demoChannels } from './data/channels'
import { useTvNav } from './hooks/useTvNav'
import { Settings } from './components/Settings'
import { categoriesFromChannels } from './lib/m3u'
import { activeCatalog } from './lib/playlistStore'
import './index.css'

const Player = lazy(async () => {
  const mod = await import('./components/Player')
  return { default: mod.Player }
})

const PAGE_SIZE = 48
const GRID_COLS = 4

function App() {
  const [ready, setReady] = useState(false)
  const [channelList, setChannelList] = useState<Channel[]>(demoChannels)
  const [sourceLabel, setSourceLabel] = useState('تجريبي')
  const [isDemo, setIsDemo] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState('all')
  const [page, setPage] = useState(0)
  const [active, setActive] = useState<Channel | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    let cancelled = false
    void activeCatalog()
      .then((catalog) => {
        if (cancelled) return
        setChannelList(catalog.channels)
        setSourceLabel(catalog.sourceLabel)
        setIsDemo(catalog.isDemo)
        if (catalog.recovered) {
          setNotice('تم مسح قائمة ثقيلة كانت تعطل المتصفح. أعد رفع الملف إن لزم.')
        }
        setReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setChannelList(demoChannels)
        setReady(true)
        setNotice('تعذّر قراءة القائمة المحفوظة — تم فتح الوضع التجريبي.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const cats = useMemo(() => {
    const all = categoriesFromChannels(channelList)
    // Keep category chips manageable on mobile Safari.
    if (all.length <= 24) return all
    return [all[0]!, ...all.slice(1, 23), { id: '__more__', label: '…', labelAr: '…' }]
  }, [channelList])

  const filtered = useMemo(() => {
    if (categoryId === 'all' || categoryId === '__more__') return channelList
    return channelList.filter((c) => c.category === categoryId)
  }, [categoryId, channelList])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageItems = useMemo(() => {
    const start = safePage * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, safePage])

  const { focusIndex, setFocusIndex } = useTvNav({
    columns: GRID_COLS,
    itemCount: pageItems.length,
    enabled: ready && !active && !showSettings,
    onSelect: (index) => {
      const ch = pageItems[index]
      if (ch) setActive(ch)
    },
  })

  if (active) {
    return (
      <Suspense fallback={<div className="settings-screen">جاري فتح المشغّل…</div>}>
        <Player channel={active} onBack={() => setActive(null)} />
      </Suspense>
    )
  }

  if (showSettings) {
    return (
      <Settings
        onClose={() => setShowSettings(false)}
        onLoaded={(channels, label) => {
          setChannelList(channels)
          setSourceLabel(label)
          setIsDemo(false)
          setCategoryId('all')
          setPage(0)
          setFocusIndex(0)
          setShowSettings(false)
          setNotice(`تم الاشتراك — ${channels.length} قناة`)
        }}
        onCleared={() => {
          void activeCatalog().then((next) => {
            setChannelList(next.channels)
            setSourceLabel(next.sourceLabel)
            setIsDemo(next.isDemo)
            setCategoryId('all')
            setPage(0)
            setFocusIndex(0)
            setNotice(null)
          })
        }}
      />
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-row">
          <div className="brand">
            <span className="brand-mark">Kayla</span>
            <span className="brand-iptv">IPTV</span>
          </div>
          <p className="topbar-note">
            {!ready
              ? 'جاري التحميل…'
              : isDemo
                ? 'تجريبي — اضغط إضافة قنوات لاشتراكك'
                : `${channelList.length} قناة · ${sourceLabel}`}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary add-channels-btn"
          onClick={() => setShowSettings(true)}
        >
          إضافة قنوات / اشتراك المزود
        </button>
        {notice && <p className="settings-ok">{notice}</p>}
      </header>

      <nav className="cats" aria-label="التصنيفات">
        {cats.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`cat${categoryId === cat.id ? ' is-active' : ''}`}
            disabled={cat.id === '__more__'}
            onClick={() => {
              if (cat.id === '__more__') return
              setCategoryId(cat.id)
              setPage(0)
              setFocusIndex(0)
            }}
          >
            {cat.labelAr}
          </button>
        ))}
      </nav>

      <main className="grid" style={{ ['--cols' as string]: GRID_COLS }}>
        {pageItems.length === 0 && (
          <p className="empty-grid">لا قنوات في هذا التصنيف</p>
        )}
        {pageItems.map((channel, index) => {
          const focused = index === focusIndex
          return (
            <button
              key={channel.id}
              type="button"
              className={`tile${focused ? ' is-focused' : ''}`}
              style={{ ['--accent' as string]: channel.color }}
              onMouseEnter={() => setFocusIndex(index)}
              onFocus={() => setFocusIndex(index)}
              onClick={() => setActive(channel)}
            >
              <span className="tile-glow" aria-hidden />
              <span className="tile-cat">{channel.categoryAr}</span>
              <span className="tile-name">{channel.nameAr}</span>
              <span className="tile-play">تشغيل</span>
            </button>
          )
        })}
      </main>

      {pageCount > 1 && (
        <div className="pager">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            السابق
          </button>
          <span>
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            التالي
          </button>
        </div>
      )}

      <footer className="helpbar">
        <span>↑↓←→ تنقل</span>
        <span>Enter تشغيل</span>
        <span>Esc رجوع</span>
      </footer>
    </div>
  )
}

export default App
