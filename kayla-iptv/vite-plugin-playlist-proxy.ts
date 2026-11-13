import type { Plugin } from 'vite'

async function readBody(req: import('http').IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

/** Dev-only same-origin proxy so browser CORS does not block provider playlists. */
export function playlistProxyPlugin(): Plugin {
  return {
    name: 'kayla-playlist-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] !== '/api/fetch-playlist' || req.method !== 'POST') {
          next()
          return
        }
        try {
          const raw = await readBody(req)
          const body = JSON.parse(raw || '{}') as { url?: string }
          const target = String(body.url || '').trim()
          if (!/^https?:\/\//i.test(target)) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'رابط غير صالح' }))
            return
          }
          const upstream = await fetch(target, {
            redirect: 'follow',
            headers: { 'User-Agent': 'KaylaIPTV/1.0', Accept: '*/*' },
          })
          const text = await upstream.text()
          if (!upstream.ok) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                error: `السيرفر أرجع HTTP ${upstream.status}`,
                status: upstream.status,
              }),
            )
            return
          }
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ text, contentType: upstream.headers.get('content-type') }))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : 'فشل جلب القائمة',
            }),
          )
        }
      })
    },
  }
}
