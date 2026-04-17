import { useState, useRef, useEffect, useCallback } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useConversations } from '../hooks/useConversations'
import { loadTheme, saveTheme, loadModel, saveModel } from '../utils/storage'
import Sidebar from './Sidebar'
import MessageItem from './MessageItem'
import ChatInput from './ChatInput'

const SYSTEM_PROMPT =
  'Bạn là Claude, một trợ lý AI thông minh, thân thiện và hữu ích được tạo bởi Anthropic. ' +
  'Trả lời bằng tiếng Việt trừ khi người dùng yêu cầu ngôn ngữ khác. ' +
  'Với code, luôn ghi rõ ngôn ngữ lập trình trong code block.'

const logout = () => signOut(auth)

// ── Empty state ───────────────────────────────────────────────
const SUGGESTIONS = [
  'Giải thích một khái niệm kỹ thuật',
  'Viết code Python cho tôi',
  'Dịch văn bản sang tiếng Anh',
  'Tóm tắt nội dung văn bản',
  'Gợi ý cách cải thiện code',
  'Giải bài toán lập trình',
]

function EmptyState({ onSend }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg width="56" height="56" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="14" fill="#7c3aed" fillOpacity="0.12"/>
          <text x="24" y="33" fontSize="22" textAnchor="middle" fill="#7c3aed" fontFamily="Arial" fontWeight="bold">C</text>
        </svg>
      </div>
      <h2>Xin chào! Tôi là Claude</h2>
      <p>Tôi có thể giúp bạn lập trình, viết lách, phân tích, dịch thuật và nhiều hơn nữa.</p>
      <div className="suggestion-chips">
        {SUGGESTIONS.map(s => (
          <button key={s} className="chip" onClick={() => onSend(s)}>{s}</button>
        ))}
      </div>
    </div>
  )
}

// ── Main ChatPage ─────────────────────────────────────────────
export default function ChatPage({ user }) {
  const {
    conversations, activeId, activeConv,
    setActiveId, create, remove, rename, updateMessages, autoTitle,
  } = useConversations()

  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [model,       setModel]       = useState(loadModel)
  const [theme,       setTheme]       = useState(loadTheme)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const messagesEndRef = useRef(null)
  const abortRef       = useRef(null)

  // Apply theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    saveTheme(theme)
  }, [theme])

  // Persist model choice
  useEffect(() => { saveModel(model) }, [model])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv?.messages?.length])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  // ── Core streaming function ─────────────────────────────────
  // Appends a streaming assistant message to convId and fills it via SSE.
  const doStream = useCallback(async (convId, apiMessages) => {
    const msgId = crypto.randomUUID()

    updateMessages(convId, prev => [
      ...prev,
      { id: msgId, role: 'assistant', content: '', streaming: true, createdAt: Date.now() },
    ])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const idToken = await user.getIdToken()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ messages: apiMessages, model, system: SYSTEM_PROMPT }),
        signal: controller.signal,
      })

      if (res.status === 401) { await logout(); return }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'text') {
              updateMessages(convId, prev =>
                prev.map(m => m.id === msgId ? { ...m, content: m.content + event.text } : m)
              )
            } else if (event.type === 'done') {
              updateMessages(convId, prev =>
                prev.map(m => m.id === msgId ? { ...m, streaming: false } : m)
              )
            } else if (event.type === 'error') {
              setError(event.message)
              updateMessages(convId, prev => prev.filter(m => m.id !== msgId))
            }
          } catch { /* skip malformed SSE line */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') setError('Lỗi kết nối. Vui lòng thử lại.')
      updateMessages(convId, prev =>
        prev.map(m => m.id === msgId ? { ...m, streaming: false } : m)
      )
    } finally {
      setLoading(false)
      abortRef.current = null
    }
  }, [user, model, updateMessages])

  // ── Send new message ────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const content = text?.trim()
    if (!content || loading) return

    setError('')
    setInput('')

    const convId   = activeId
    const prevMsgs = (activeConv?.messages || [])
      .filter(m => !m.streaming && m.content)

    const userMsg = { id: crypto.randomUUID(), role: 'user', content, createdAt: Date.now() }

    updateMessages(convId, [...prevMsgs, userMsg])
    if (prevMsgs.length === 0) autoTitle(convId, content)

    setLoading(true)
    await doStream(convId, [...prevMsgs.map(({ role, content }) => ({ role, content })), { role: 'user', content }])
  }, [loading, activeId, activeConv, updateMessages, autoTitle, doStream])

  // ── Edit a user message ─────────────────────────────────────
  const editMessage = useCallback(async (msgId, newContent) => {
    if (loading || !newContent.trim()) return

    const messages = activeConv?.messages || []
    const idx = messages.findIndex(m => m.id === msgId)
    if (idx === -1) return

    // Keep conversation history before the edited message
    const before = messages.slice(0, idx).filter(m => !m.streaming && m.content)
    const userMsg = { id: crypto.randomUUID(), role: 'user', content: newContent.trim(), createdAt: Date.now() }

    updateMessages(activeId, [...before, userMsg])
    setLoading(true)
    await doStream(
      activeId,
      [...before.map(({ role, content }) => ({ role, content })), { role: 'user', content: newContent.trim() }]
    )
  }, [loading, activeId, activeConv, updateMessages, doStream])

  // ── Regenerate last assistant message ───────────────────────
  const regenerate = useCallback(async () => {
    if (loading) return

    const messages = activeConv?.messages || []
    // Find the last user message index
    let lastUserIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { lastUserIdx = i; break }
    }
    if (lastUserIdx === -1) return

    const before  = messages.slice(0, lastUserIdx).filter(m => !m.streaming && m.content)
    const userMsg = messages[lastUserIdx]

    updateMessages(activeId, [...before, { ...userMsg, streaming: false }])
    setLoading(true)
    await doStream(
      activeId,
      [...before.map(({ role, content }) => ({ role, content })), { role: 'user', content: userMsg.content }]
    )
  }, [loading, activeId, activeConv, updateMessages, doStream])

  // ── Stop streaming ──────────────────────────────────────────
  const stop = () => {
    abortRef.current?.abort()
    setLoading(false)
    updateMessages(activeId, prev => prev.map(m => m.streaming ? { ...m, streaming: false } : m))
  }

  // ── New conversation ────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    if (loading) { abortRef.current?.abort(); setLoading(false) }
    create()
  }, [loading, create])

  // ── Switch conversation ─────────────────────────────────────
  const handleSelect = useCallback((id) => {
    if (loading) { abortRef.current?.abort(); setLoading(false) }
    setActiveId(id)
  }, [loading, setActiveId])

  // ── Render ──────────────────────────────────────────────────
  const messages       = activeConv?.messages || []
  const lastAssistantId = messages.reduceRight((found, m) => found || (m.role === 'assistant' ? m.id : null), null)

  return (
    <div className="chat-layout">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onCreate={handleNewChat}
        onDelete={remove}
        onRename={rename}
        model={model}
        onModelChange={setModel}
        theme={theme}
        onThemeToggle={toggleTheme}
        user={user}
        onLogout={logout}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(v => !v)}
      />

      <main className="chat-main">
        <div className="messages-area">
          {messages.length === 0 ? (
            <EmptyState onSend={sendMessage} />
          ) : (
            messages.map(msg => (
              <MessageItem
                key={msg.id}
                msg={msg}
                isLastAssistant={msg.id === lastAssistantId}
                onEdit={newContent => editMessage(msg.id, newContent)}
                onRegenerate={regenerate}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="error-banner">
            <span>⚠ {error}</span>
            <button onClick={() => setError('')}>✕</button>
          </div>
        )}

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => sendMessage(input)}
          onStop={stop}
          loading={loading}
        />
      </main>
    </div>
  )
}
