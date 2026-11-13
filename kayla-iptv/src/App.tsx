import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { Channel } from './data/channels'
import { demoChannels } from './data/channels'
import { useTvNav } from './hooks/useTvNav'
import { Player } from './components/Player'
import { Settings } from './components/Settings'
import { categoriesFromChannels } from './lib/m3u'
import { activeCatalog } from './lib/playlistStore'
import './index.css'

const GRID_COLS = 4

function App() {
  const [ready, setReady] = useState(false)
  const [channelList, setChannelList] = useState<Channel[]>(demoChannels)
  const [sourceLabel, setSourceLabel] = useState('تجريبي')
  const [isDemo, setIsDemo] = useState(true)
  const [categoryId, setCategoryId] = useState('all')
  const [active, setActive] = useState<Channel | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    let cancelled = false
    void activeCatalog().then((catalog) => {
      if (cancelled) return
      setChannelList(catalog.channels)
      setSourceLabel(catalog.sourceLabel)
      setIsDemo(catalog.isDemo)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const cats = useMemo(() => categoriesFromChannels(channelList), [channelList])

  const filtered = useMemo(() => {
    if (categoryId === 'all') return channelList
    return channelList.filter((c) => c.category === categoryId)
  }, [categoryId, channelList])

  const { focusIndex, setFocusIndex } = useTvNav({
    columns: GRID_COLS,
    itemCount: filtered.length,
    enabled: ready && !active && !showSettings,
    onSelect: (index) => {
      const ch = filtered[index]
      if (ch) setActive(ch)
    },
  })

  if (active) {
    return <Player channel={active} onBack={() => setActive(null)} />
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
          setFocusIndex(0)
          setShowSettings(false)
        }}
        onCleared={() => {
          void activeCatalog().then((next) => {
            setChannelList(next.channels)
            setSourceLabel(next.sourceLabel)
            setIsDemo(next.isDemo)
            setCategoryId('all')
            setFocusIndex(0)
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
      </header>

      <nav className="cats" aria-label="التصنيفات">
        {cats.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`cat${categoryId === cat.id ? ' is-active' : ''}`}
            onClick={() => {
              setCategoryId(cat.id)
              setFocusIndex(0)
            }}
          >
            {cat.labelAr}
          </button>
        ))}
      </nav>

      <main className="grid" style={{ ['--cols' as string]: GRID_COLS }}>
        {filtered.length === 0 && (
          <p className="empty-grid">لا قنوات في هذا التصنيف</p>
        )}
        {filtered.map((channel, index) => {
          const focused = index === focusIndex
          return (
            <motion.button
              key={channel.id}
              type="button"
              className={`tile${focused ? ' is-focused' : ''}`}
              style={{ ['--accent' as string]: channel.color }}
              onMouseEnter={() => setFocusIndex(index)}
              onFocus={() => setFocusIndex(index)}
              onClick={() => setActive(channel)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(index, 24) * 0.02 }}
            >
              <span className="tile-glow" aria-hidden />
              <span className="tile-cat">{channel.categoryAr}</span>
              <span className="tile-name">{channel.nameAr}</span>
              <span className="tile-play">تشغيل</span>
            </motion.button>
          )
        })}
      </main>

      <footer className="helpbar">
        <span>↑↓←→ تنقل</span>
        <span>Enter تشغيل</span>
        <span>Esc رجوع</span>
        <span>إضافة قنوات ← قائمتك</span>
      </footer>
    </div>
  )
}

export default App
