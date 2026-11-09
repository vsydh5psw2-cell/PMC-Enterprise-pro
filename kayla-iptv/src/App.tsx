import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { categories, channels, type Channel } from './data/channels'
import { useTvNav } from './hooks/useTvNav'
import { Player } from './components/Player'
import './index.css'

const GRID_COLS = 4

function App() {
  const [categoryId, setCategoryId] = useState('all')
  const [active, setActive] = useState<Channel | null>(null)

  const filtered = useMemo(() => {
    if (categoryId === 'all') return channels
    return channels.filter((c) => c.category === categoryId)
  }, [categoryId])

  const { focusIndex, setFocusIndex } = useTvNav({
    columns: GRID_COLS,
    itemCount: filtered.length,
    enabled: !active,
    onSelect: (index) => {
      const ch = filtered[index]
      if (ch) setActive(ch)
    },
  })

  if (active) {
    return <Player channel={active} onBack={() => setActive(null)} />
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">Kayla</span>
          <span className="brand-iptv">IPTV</span>
        </div>
        <p className="topbar-note">واجهة تلفزيون · بث تجريبي عام فقط</p>
      </header>

      <nav className="cats" aria-label="التصنيفات">
        {categories.map((cat) => (
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
              transition={{ duration: 0.35, delay: index * 0.03 }}
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
      </footer>
    </div>
  )
}

export default App
