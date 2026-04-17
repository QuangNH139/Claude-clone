/**
 * Local development server for API routes.
 * Usage: node server.local.js
 * Then run: npm run dev (Vite proxies /api to this server)
 */
import { createServer } from 'http'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

// Load .env.local
try {
  const env = readFileSync(join(__dir, '.env.local'), 'utf-8')
  for (const line of env.split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim()
  }
  console.log('✅ Loaded .env.local')
} catch {
  console.warn('⚠️  No .env.local found – set env vars manually')
}

const PORT = 3001

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const body = await new Promise((resolve) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) }
    })
  })

  const mockReq = { method: req.method, headers: req.headers, body, url: req.url }

  const chunks = []
  const mockRes = {
    status(code) { res.statusCode = code; return this },
    setHeader(k, v) { res.setHeader(k, v); return this },
    flushHeaders() { res.flushHeaders?.(); return this },
    json(data) { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(data)) },
    write(data) { res.write(data) },
    end() { res.end() },
  }

  try {
    if (url.pathname === '/api/auth') {
      const { default: handler } = await import('./api/auth.js')
      await handler(mockReq, mockRes)
    } else if (url.pathname === '/api/chat') {
      const { default: handler } = await import('./api/chat.js')
      await handler(mockReq, mockRes)
    } else {
      res.statusCode = 404
      res.end('Not found')
    }
  } catch (e) {
    console.error(e)
    res.statusCode = 500
    res.end('Internal error')
  }
})

server.listen(PORT, () => console.log(`🚀 API server running on http://localhost:${PORT}`))
