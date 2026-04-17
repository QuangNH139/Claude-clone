/**
 * Local dev API server – proxied by Vite on port 3001.
 * Loads env from .env.local (VITE_ vars + FIREBASE_SERVICE_ACCOUNT)
 * and from functions/.env (ANTHROPIC_API_KEY).
 *
 * Usage:
 *   node server.local.js   # terminal 1
 *   npm run dev             # terminal 2
 */
import { createServer } from 'http'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

function loadEnvFile(path) {
  try {
    for (const line of readFileSync(path, 'utf-8').split('\n')) {
      const [k, ...v] = line.split('=')
      if (k?.trim() && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim()
    }
    console.log(`✅ Loaded ${path}`)
  } catch {
    console.warn(`⚠️  ${path} not found`)
  }
}

loadEnvFile(join(__dir, '.env.local'))           // FIREBASE_SERVICE_ACCOUNT
loadEnvFile(join(__dir, 'functions', '.env'))    // ANTHROPIC_API_KEY

const PORT = 3001

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  const body = await new Promise((resolve) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) } })
  })

  const mockReq = { method: req.method, headers: req.headers, body }
  const mockRes = {
    status(code) { res.statusCode = code; return this },
    setHeader(k, v) { res.setHeader(k, v); return this },
    flushHeaders() { res.flushHeaders?.(); return this },
    json(data) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)) },
    write(data) { res.write(data) },
    end() { res.end() },
  }

  try {
    if (url.pathname === '/api/chat') {
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

server.listen(PORT, () => {
  console.log(`🚀 API server → http://localhost:${PORT}`)
  console.log('   Auth is handled by Firebase – set FIREBASE_SERVICE_ACCOUNT in .env.local')
})
