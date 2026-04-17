import { onRequest } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import Anthropic from '@anthropic-ai/sdk'
import jwt from 'jsonwebtoken'

// Đặt region gần Việt Nam nhất
setGlobalOptions({ region: 'asia-southeast1' })

function setCors(res) {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

// ─── POST /api/auth ────────────────────────────────────────────
export const auth = onRequest(async (req, res) => {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }

  const { ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET } = process.env
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !JWT_SECRET) {
    return res.status(500).json({ error: 'Server not configured – set env vars on Firebase' })
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' })
  }

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' })
  return res.status(200).json({ token })
})

// ─── POST /api/chat ────────────────────────────────────────────
export const chat = onRequest({ timeoutSeconds: 300 }, async (req, res) => {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Xác thực JWT
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Unauthorized – please login again' })
  }

  const { messages, model = 'claude-sonnet-4-6', system } = req.body
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array required' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Stream SSE
  res.set('Content-Type', 'text/event-stream')
  res.set('Cache-Control', 'no-cache')
  res.set('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const params = { model, max_tokens: 8096, messages }
    if (system) params.system = system

    const stream = client.messages.stream(params)

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`)
      }
      if (event.type === 'message_stop') {
        const final = await stream.finalMessage()
        res.write(
          `data: ${JSON.stringify({ type: 'done', usage: final.usage, stop_reason: final.stop_reason })}\n\n`
        )
      }
    }
  } catch (error) {
    const message = error.status === 529 ? 'Claude API đang quá tải, thử lại sau.' : error.message
    res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`)
  } finally {
    res.end()
  }
})
