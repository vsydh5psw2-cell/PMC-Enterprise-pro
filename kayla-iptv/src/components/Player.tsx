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

function toTsUrl(url: string) {
  if (/\.ts(\?|$)/i.test(url)) return url
  return url.replace(/\.m3u8(?=\?|$)/i, '.ts')
}

function toM3u8Url(url: string) {
  if (/\.m3u8(\?|$)/i.test(url)) return url
  return url.replace(/\.ts(?=\?|$)/i, '.m3u8')
}

function mixedContentBlocked(url: string) {
  return (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    /^http:\/\//i.test(url)
  )
}

const BROWSER_LIMIT_MSG =
  'المتصفح منع تشغيل بث المزود (CORS أو HTTP على موقع HTTPS). القائمة تعمل، لكن كثير من قنوات IPTV تحتاج تطبيق مثل TiviMate للمشاهدة.'

export function Player({ channel, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'loading' | 'playing' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let cancelled = false
    let hls: Hls | null = null
    let tsPlayer: mpegts.Player | null = null

    setStatus('loading')
    setErrorMsg('')

    const cleanupPlayers = () => {
      hls?.destroy()
      hls = null
      if (tsPlayer) {
        try {
          tsPlayer.pause()
          tsPlayer.unload()
          tsPlayer.detachMediaElement()
          tsPlayer.destroy()
        } catch {
          // ignore
        }
        tsPlayer = null
      }
      video.removeAttribute('src')
      video.load()
    }

    const onPlaying = () => {
      if (!cancelled) setStatus('playing')
    }

    const fail = (msg: string) => {
      if (cancelled) return
      setStatus('error')
      setErrorMsg(msg)
    }

    video.addEventListener('playing', onPlaying)

    const playNative = (url: string) =>
      new Promise<void>((resolve, reject) => {
        const onError = () => {
          video.removeEventListener('error', onError)
          reject(new Error('native'))
        }
        video.addEventListener('error', onError)
        video.src = url
        void video
          .play()
          .then(() => {
            video.removeEventListener('error', onError)
            resolve()
          })
          .catch(() => {
            video.removeEventListener('error', onError)
            reject(new Error('play'))
          })
      })

    const playHls = (url: string) =>
      new Promise<void>((resolve, reject) => {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          playNative(url).then(resolve).catch(reject)
          return
        }
        if (!Hls.isSupported()) {
          reject(new Error('no-hls'))
          return
        }
        hls = new Hls({
          enableWorker: true,
          xhrSetup(xhr) {
            try {
              xhr.withCredentials = false
            } catch {
              // ignore
            }
          },
        })
        hls.loadSource(url)
        hls.attachMedia(video)
        const onParsed = () => {
          void video.play().then(resolve).catch(() => reject(new Error('play')))
        }
        const onError = (_e: unknown, data: { fatal?: boolean }) => {
          if (data.fatal) {
            hls?.off(Hls.Events.ERROR, onError)
            reject(new Error('hls'))
          }
        }
        hls.on(Hls.Events.MANIFEST_PARSED, onParsed)
        hls.on(Hls.Events.ERROR, onError)
      })

    const playMpegTs = (url: string) =>
      new Promise<void>((resolve, reject) => {
        if (!mpegts.isSupported() || !mpegts.getFeatureList().mseLivePlayback) {
          reject(new Error('no-ts'))
          return
        }
        tsPlayer = mpegts.createPlayer(
          {
            type: 'mpegts',
            isLive: true,
            url,
            cors: true,
            withCredentials: false,
          },
          {
            enableWorker: false,
            liveBufferLatencyChasing: true,
          },
        )
        tsPlayer.attachMediaElement(video)
        tsPlayer.load()
        const onError = () => {
          tsPlayer?.off(mpegts.Events.ERROR, onError)
          reject(new Error('ts'))
        }
        tsPlayer.on(mpegts.Events.ERROR, onError)
        void video
          .play()
          .then(resolve)
          .catch(() => reject(new Error('play')))
      })

    const tryUrl = async (url: string) => {
      cleanupPlayers()
      if (isHlsUrl(url)) {
        try {
          await playHls(url)
          return true
        } catch {
          cleanupPlayers()
          const ts = toTsUrl(url)
          if (ts !== url) {
            try {
              await playMpegTs(ts)
              return true
            } catch {
              cleanupPlayers()
            }
          }
          try {
            await playMpegTs(url)
            return true
          } catch {
            cleanupPlayers()
            return false
          }
        }
      }

      try {
        await playMpegTs(url)
        return true
      } catch {
        cleanupPlayers()
        const m3u8 = toM3u8Url(url)
        if (m3u8 !== url) {
          try {
            await playHls(m3u8)
            return true
          } catch {
            cleanupPlayers()
          }
        }
        try {
          await playNative(url)
          return true
        } catch {
          cleanupPlayers()
          return false
        }
      }
    }

    void (async () => {
      const primary = channel.streamUrl
      if (mixedContentBlocked(primary)) {
        // Still attempt; Safari usually blocks. Prefer clear guidance.
        const ok = await tryUrl(primary)
        if (!ok && !cancelled) {
          fail(
            'البث يستخدم HTTP بينما التطبيق على HTTPS، فـ Safari يمنعه. جرّب قناة أخرى أو شاهد عبر تطبيق IPTV مخصص.',
          )
        }
        return
      }

      const ok = await tryUrl(primary)
      if (!ok && !cancelled) fail(BROWSER_LIMIT_MSG)
    })()

    return () => {
      cancelled = true
      video.removeEventListener('playing', onPlaying)
      cleanupPlayers()
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
