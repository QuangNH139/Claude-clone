import { useState, useRef, useEffect, useCallback } from 'react'
import { signOut } from 'firebase/auth'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { auth } from '../firebase'

const MODELS = [
  { id: 'claude-opus-4-7', label: 'Claude Opus 4' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4' },
]

const SYSTEM_PROMPT = `Bạn là Claude, một trợ lý AI hữu ích, thân thiện và thông minh được tạo bởi Anthropic. Trả lời bằng tiếng Việt trừ khi người dùng yêu cầu ngôn ngữ khác.`

function CodeBlock({ className, children }) {
  const [copied, setCopied] = useState(false)
  const language = /language-(\w+)/.exec(className || '')?.[1] || 'text'

  const copy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-lang">{language}</span>
        <button className="copy-btn" onClick={copy}>
          {copied ? '✓ Đã sao chép' : 'Sao chép'}
        </button>
      </div>
      <SyntaxHighlighter style={oneDark} language={language} PreTag="div">
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`message-row ${isUser ? 'user' : 'assistant'}`}>
      <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
        {isUser ? (
          <p className="user-text">{msg.content}</p>
        ) : (
          <div className="markdown-content">
            <ReactMarkdown
              components={{
                code({ inline, className, children }) {
                  if (inline) return <code className="inline-code">{children}</code>
                  return <CodeBlock className={className}>{children}</CodeBlock>
                },
              }}
            >
              {msg.content}
            </ReactMarkdown>
            {msg.streaming && <span className="cursor-blink" />}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatPage({ user }) {
  const onLogout = () => signOut(auth)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState('claude-sonnet-4-6')
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [conversations, setConversations] = useState([
    { id: 1, title: 'Cuộc trò chuyện mới', active: true },
  ])
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const adjustTextarea = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }

  const newConversation = () => {
    if (loading) abortRef.current?.abort()
    setMessages([])
    setError('')
    setInput('')
    const id = Date.now()
    setConversations((prev) => [
      ...prev.map((c) => ({ ...c, active: false })),
      { id, title: 'Cuộc trò chuyện mới', active: true },
    ])
  }

  const sendMessage = useCallback(
    async (text) => {
      const content = text.trim()
      if (!content || loading) return

      setError('')
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'

      const userMsg = { role: 'user', content }
      const newMessages = [...messages, userMsg]
      setMessages(newMessages)
      setLoading(true)

      // Update conversation title from first message
      if (messages.length === 0) {
        const title = content.slice(0, 40) + (content.length > 40 ? '…' : '')
        setConversations((prev) =>
          prev.map((c) => (c.active ? { ...c, title } : c))
        )
      }

      const assistantId = Date.now()
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', streaming: true },
      ])

      const controller = new AbortController()
      abortRef.current = controller

      try {
        // Lấy Firebase ID token mới nhất (tự động refresh khi hết hạn)
        const idToken = await user.getIdToken()

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            messages: newMessages,
            model,
            system: SYSTEM_PROMPT,
          }),
          signal: controller.signal,
        })

        if (res.status === 401) {
          await signOut(auth)
          return
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop()

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (!raw) continue

            try {
              const event = JSON.parse(raw)

              if (event.type === 'text') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + event.text }
                      : m
                  )
                )
              } else if (event.type === 'done') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, streaming: false } : m
                  )
                )
              } else if (event.type === 'error') {
                setError(event.message)
                setMessages((prev) => prev.filter((m) => m.id !== assistantId))
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Lỗi kết nối. Vui lòng thử lại.')
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m
          )
        )
      } finally {
        setLoading(false)
        abortRef.current = null
      }
    },
    [messages, loading, model, user, onLogout]
  )

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const stopGeneration = () => {
    abortRef.current?.abort()
    setLoading(false)
    setMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false } : m))
    )
  }

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="10" fill="#7c3aed" />
              <text x="24" y="33" fontSize="22" textAnchor="middle" fill="white" fontFamily="Arial" fontWeight="bold">C</text>
            </svg>
            {sidebarOpen && <span className="logo-text">Claude Chat</span>}
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen((v) => !v)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {sidebarOpen && (
          <>
            <button className="new-chat-btn" onClick={newConversation}>
              + Cuộc trò chuyện mới
            </button>

            <div className="conversations-list">
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={`conversation-item ${c.active ? 'active' : ''}`}
                  onClick={() => {}}
                >
                  <span className="conv-icon">💬</span>
                  <span className="conv-title">{c.title}</span>
                </div>
              ))}
            </div>

            <div className="sidebar-footer">
              <div className="model-selector">
                <label>Model</label>
                <select value={model} onChange={(e) => setModel(e.target.value)}>
                  {MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="user-info">
                {user.photoURL && (
                  <img src={user.photoURL} alt="avatar" className="user-avatar" />
                )}
                <span className="user-email" title={user.email}>
                  {user.displayName || user.email}
                </span>
              </div>

              <button className="logout-btn" onClick={onLogout}>
                ⎋ Đăng xuất
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Main chat area */}
      <main className="chat-main">
        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="64" height="64" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="14" fill="#7c3aed" fillOpacity="0.1" />
                  <text x="24" y="33" fontSize="22" textAnchor="middle" fill="#7c3aed" fontFamily="Arial" fontWeight="bold">C</text>
                </svg>
              </div>
              <h2>Xin chào! Tôi là Claude</h2>
              <p>Tôi có thể giúp bạn lập trình, viết lách, phân tích, dịch thuật và nhiều hơn nữa.</p>
              <div className="suggestion-chips">
                {[
                  'Giải thích một khái niệm kỹ thuật',
                  'Viết code cho tôi',
                  'Tóm tắt một văn bản',
                  'Trả lời câu hỏi về khoa học',
                ].map((s) => (
                  <button key={s} className="chip" onClick={() => sendMessage(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => <Message key={msg.id || i} msg={msg} />)
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="error-banner">
            ⚠️ {error}
            <button onClick={() => setError('')}>✕</button>
          </div>
        )}

        <div className="input-area">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                adjustTextarea()
              }}
              onKeyDown={handleKeyDown}
              placeholder="Nhắn tin với Claude... (Enter để gửi, Shift+Enter để xuống dòng)"
              rows={1}
              disabled={loading}
            />
            <div className="input-actions">
              {loading ? (
                <button className="stop-btn" onClick={stopGeneration} title="Dừng">
                  ⏹
                </button>
              ) : (
                <button
                  className="send-btn"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim()}
                  title="Gửi (Enter)"
                >
                  ➤
                </button>
              )}
            </div>
          </div>
          <p className="input-hint">
            Claude có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
          </p>
        </div>
      </main>
    </div>
  )
}
