import { onRequest } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import admin from 'firebase-admin'
import Anthropic from '@anthropic-ai/sdk'

// Đặt region gần Việt Nam nhất
setGlobalOptions({ region: 'asia-southeast1' })

// Firebase Admin tự khởi tạo credentials khi chạy trên Cloud Functions
if (!admin.apps.length) admin.initializeApp()

function setCors(res) {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

async function verifyFirebaseToken(req) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) throw new Error('No token')
  const idToken = header.split('Bearer ')[1]
  return admin.auth().verifyIdToken(idToken) // throws nếu token không hợp lệ
}

// ─── POST /api/chat ────────────────────────────────────────────
export const chat = onRequest({ timeoutSeconds: 300 }, async (req, res) => {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Xác thực Firebase ID token
  try {
    await verifyFirebaseToken(req)
  } catch {
    return res.status(401).json({ error: 'Unauthorized – vui lòng đăng nhập lại' })
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
