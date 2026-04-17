import Anthropic from '@anthropic-ai/sdk'
import jwt from 'jsonwebtoken'

function verifyToken(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('No token')
  const token = authHeader.split(' ')[1]
  jwt.verify(token, process.env.JWT_SECRET)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    verifyToken(req)
  } catch {
    return res.status(401).json({ error: 'Unauthorized - please login again' })
  }

  const { messages, model = 'claude-sonnet-4-6', system } = req.body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array required' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Stream response via SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const streamParams = {
      model,
      max_tokens: 8096,
      messages,
    }
    if (system) streamParams.system = system

    const stream = client.messages.stream(streamParams)

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`)
      }
      if (event.type === 'message_stop') {
        const finalMsg = await stream.finalMessage()
        res.write(
          `data: ${JSON.stringify({
            type: 'done',
            usage: finalMsg.usage,
            stop_reason: finalMsg.stop_reason,
          })}\n\n`
        )
      }
    }
  } catch (error) {
    const message =
      error.status === 529
        ? 'Claude API đang quá tải, vui lòng thử lại.'
        : error.message || 'Unknown error'
    res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`)
  } finally {
    res.end()
  }
}
