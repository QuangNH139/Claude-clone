/**
 * Vercel serverless function – dùng Firebase Admin để verify ID token
 * Cần env var: ANTHROPIC_API_KEY, FIREBASE_SERVICE_ACCOUNT (JSON string)
 */
import Anthropic from '@anthropic-ai/sdk'
import admin from 'firebase-admin'

// Khởi tạo Firebase Admin với service account từ env var
if (!admin.apps.length) {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!sa) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is required')
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(sa)) })
}

async function verifyToken(req) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) throw new Error('No token')
  return admin.auth().verifyIdToken(header.split('Bearer ')[1])
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    await verifyToken(req)
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { messages, model = 'claude-sonnet-4-6', system } = req.body
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array required' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
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
    const message = error.status === 529 ? 'Claude API đang quá tải.' : error.message
    res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`)
  } finally {
    res.end()
  }
}
