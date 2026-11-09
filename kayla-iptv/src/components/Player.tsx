import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import type { Channel } from '../data/channels'

type Props = {
  channel: Channel
  onBack: () => void
}

export function Player({ channel, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'loading' | 'playing' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    setStatus('loading')
    setErrorMsg('')
    let hls: Hls | null = null

    const onPlaying = () => setStatus('playing')
    const onError = () => {
      setStatus('error')
      setErrorMsg('تعذّر تشغيل البث التجريبي')
    }

    video.addEventListener('playing', onPlaying)
    video.addEventListener('error', onError)

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true })
      hls.loadSource(channel.streamUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        void video.play().catch(() => {
          setStatus('error')
          setErrorMsg('اضغط تشغيل على الشاشة أو Enter')
        })
      })
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          setStatus('error')
          setErrorMsg('فشل تحميل البث التجريبي')
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = channel.streamUrl
      void video.play().catch(() => {
        setStatus('error')
        setErrorMsg('اضغط تشغيل على الشاشة أو Enter')
      })
    } else {
      setStatus('error')
      setErrorMsg('المتصفح لا يدعم HLS')
    }

    return () => {
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('error', onError)
      hls?.destroy()
      video.removeAttribute('src')
      video.load()
    }
  }, [channel])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'BrowserBack') {
        e.preventDefault()
        onBack()
        return
      }
      if (e.key === 'Enter' || e.key === ' ') {
        const video = videoRef.current
        if (!video) return
        e.preventDefault()
        if (video.paused) void video.play()
        else video.pause()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  return (
    <div className="player-screen">
      <video
        ref={videoRef}
        className="player-video"
        controls
        playsInline
        autoPlay
        poster=""
      />

      <div className="player-chrome">
        <button type="button" className="tv-btn" onClick={onBack} autoFocus>
          رجوع
        </button>
        <div className="player-meta">
          <p className="player-brand">Kayla IPTV</p>
          <h1>{channel.nameAr}</h1>
          <p>{channel.description}</p>
        </div>
        {status === 'loading' && <p className="player-status">جاري التحميل…</p>}
        {status === 'error' && <p className="player-status is-error">{errorMsg}</p>}
      </div>

      <p className="player-hint">Enter تشغيل/إيقاف · Esc رجوع · أسهم للتنقل في القائمة</p>
    </div>
  )
}
