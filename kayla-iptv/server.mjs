import http from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const distDir = join(__dirname, 'dist')
const port = Number(process.env.PORT || 3000)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(data)
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

async function proxyPlaylist(targetUrl) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45000)
  try {
    const upstream = await fetch(targetUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'KaylaIPTV/1.0',
        Accept: '*/*',
      },
    })
    const text = await upstream.text()
    return {
      ok: upstream.ok,
      status: upstream.status,
      text,
      contentType: upstream.headers.get('content-type') || '',
    }
  } finally {
    clearTimeout(timer)
  }
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0] || '/')
  const safe = normalize(urlPath).replace(/^(\.\.[/\\])+/, '')
  let filePath = join(distDir, safe === '/' ? 'index.html' : safe)

  if (!filePath.startsWith(distDir)) {
    res.writeHead(403).end('Forbidden')
    return
  }

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(distDir, 'index.html')
  }

  if (!existsSync(filePath)) {
    res.writeHead(404).end('Not found')
    return
  }

  const type = MIME[extname(filePath)] || 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': type })
  createReadStream(filePath).pipe(res)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (url.pathname === '/api/fetch-playlist' && req.method === 'POST') {
    try {
      const raw = await readBody(req)
      const body = JSON.parse(raw || '{}')
      const target = String(body.url || '').trim()
      if (!/^https?:\/\//i.test(target)) {
        sendJson(res, 400, { error: 'رابط غير صالح' })
        return
      }
      const result = await proxyPlaylist(target)
      if (!result.ok) {
        sendJson(res, 502, {
          error: `السيرفر أرجع HTTP ${result.status}`,
          status: result.status,
        })
        return
      }
      sendJson(res, 200, {
        text: result.text,
        contentType: result.contentType,
      })
    } catch (err) {
      const message =
        err?.name === 'AbortError'
          ? 'انتهت مهلة الاتصال بالمزود'
          : err instanceof Error
            ? err.message
            : 'فشل جلب القائمة'
      sendJson(res, 500, { error: message })
    }
    return
  }

  if (url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true })
    return
  }

  serveStatic(req, res)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Kayla IPTV listening on http://0.0.0.0:${port}`)
})
