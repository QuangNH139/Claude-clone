const API_URL     = 'https://api.anthropic.com/v1/messages'
const API_VERSION = '2023-06-01'

/**
 * Stream a Claude response directly from the browser.
 * API key must be set in VITE_ANTHROPIC_API_KEY (build-time env var).
 * Access is gated by Firebase Auth – only logged-in users reach this code.
 */
export async function streamClaude({ messages, model, system, signal, onText, onDone, onError }) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) {
    onError('VITE_ANTHROPIC_API_KEY chưa được cấu hình.')
    return
  }

  const body = { model, max_tokens: 8096, messages, stream: true }
  if (system) body.system = system

  let res
  try {
    res = await fetch(API_URL, {
      method:  'POST',
      headers: {
        'Content-Type':                          'application/json',
        'x-api-key':                             apiKey,
        'anthropic-version':                     API_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body:   JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (err.name !== 'AbortError') onError('Không thể kết nối tới Claude API.')
    return
  }

  if (!res.ok) {
    try {
      const data = await res.json()
      onError(data.error?.message || `Lỗi API: ${res.status}`)
    } catch {
      onError(`Lỗi API: ${res.status}`)
    }
    return
  }

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let   buffer  = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw || raw === '[DONE]') continue

        try {
          const event = JSON.parse(raw)
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            onText(event.delta.text)
          }
          if (event.type === 'message_stop') {
            onDone()
          }
          if (event.type === 'error') {
            onError(event.error?.message || 'Lỗi stream')
          }
        } catch { /* skip malformed SSE */ }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') onError(err.message)
  }
}
