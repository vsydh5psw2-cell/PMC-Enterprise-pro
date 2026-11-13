import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import mpegts from 'mpegts.js'
import type { Channel } from '../data/channels'

type Props = {
  channel: Channel
  onBack: () => void
}

function isHlsUrl(url: string) {
  return /\.m3u8(\?|$)/i.test(url) || /\/hls\//i.test(url)
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
    let tsPlayer: mpegts.Player | null = null

    const onPlaying = () => setStatus('playing')
    const fail = (msg: string) => {
      setStatus('error')
      setErrorMsg(msg)
    }

    video.addEventListener('playing', onPlaying)

    const playNative = () => {
      video.src = channel.streamUrl
      void video.play().catch(() => fail('اضغط تشغيل أو Enter'))
    }

    const playHls = () => {
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true })
        hls.loadSource(channel.streamUrl)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          void video.play().catch(() => fail('اضغط تشغيل أو Enter'))
        })
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) fail('فشل تشغيل بث HLS')
        })
        return
      }
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        playNative()
        return
      }
      fail('المتصفح لا يدعم HLS')
    }

    const playMpegTs = () => {
      if (!mpegts.getFeatureList().mseLivePlayback) {
        playNative()
        return
      }
      tsPlayer = mpegts.createPlayer(
        {
          type: 'mpegts',
          isLive: true,
          url: channel.streamUrl,
        },
        {
          enableWorker: true,
          liveBufferLatencyChasing: true,
        },
      )
      tsPlayer.attachMediaElement(video)
      tsPlayer.load()
      void video.play().catch(() => fail('اضغط تشغيل أو Enter'))
      tsPlayer.on(mpegts.Events.ERROR, () => fail('فشل تشغيل بث MPEG-TS'))
    }

    try {
      if (isHlsUrl(channel.streamUrl)) playHls()
      else playMpegTs()
    } catch {
      fail('تعذّر تهيئة المشغّل')
    }

    return () => {
      video.removeEventListener('playing', onPlaying)
      hls?.destroy()
      if (tsPlayer) {
        tsPlayer.pause()
        tsPlayer.unload()
        tsPlayer.detachMediaElement()
        tsPlayer.destroy()
      }
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

      <p className="player-hint">Enter تشغيل/إيقاف · Esc رجوع</p>
    </div>
  )
}
