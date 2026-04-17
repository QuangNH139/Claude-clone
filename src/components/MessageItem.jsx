import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

// ── Code block with copy button ───────────────────────────────
function CodeBlock({ className, children }) {
  const [copied, setCopied] = useState(false)
  const lang = /language-(\w+)/.exec(className || '')?.[1] || 'text'

  const copy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-lang">{lang}</span>
        <button className="copy-btn" onClick={copy}>{copied ? '✓ Đã sao chép' : 'Sao chép'}</button>
      </div>
      <SyntaxHighlighter style={oneDark} language={lang} PreTag="div">
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  )
}

// ── Markdown renderer ─────────────────────────────────────────
function Markdown({ content }) {
  return (
    <ReactMarkdown
      components={{
        code({ inline, className, children }) {
          if (inline) return <code className="inline-code">{children}</code>
          return <CodeBlock className={className}>{children}</CodeBlock>
        },
        a({ href, children }) {
          return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

// ── Relative time ─────────────────────────────────────────────
function relativeTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 60_000)       return 'vừa xong'
  if (diff < 3_600_000)    return `${Math.floor(diff / 60_000)} phút trước`
  if (diff < 86_400_000)   return `${Math.floor(diff / 3_600_000)} giờ trước`
  return new Date(ts).toLocaleDateString('vi-VN')
}

// ── Action button ─────────────────────────────────────────────
function ActionBtn({ title, onClick, children }) {
  return (
    <button className="msg-action-btn" title={title} onClick={onClick}>
      {children}
    </button>
  )
}

// ── Main MessageItem ──────────────────────────────────────────
export default function MessageItem({ msg, isLastAssistant, onEdit, onRegenerate }) {
  const [hovered, setHovered]    = useState(false)
  const [editing, setEditing]    = useState(false)
  const [editValue, setEditValue] = useState(msg.content)
  const [copied, setCopied]      = useState(false)
  const textareaRef = useRef(null)
  const isUser = msg.role === 'user'

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [editing])

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const submitEdit = () => {
    const text = editValue.trim()
    if (text && text !== msg.content) onEdit(text)
    setEditing(false)
  }

  // ── Edit mode ─────────────────────────────────────────────
  if (editing) {
    return (
      <div className="message-row user editing">
        <div className="edit-wrapper">
          <textarea
            ref={textareaRef}
            className="edit-textarea"
            value={editValue}
            onChange={e => {
              setEditValue(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = e.target.scrollHeight + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit() }
              if (e.key === 'Escape') setEditing(false)
            }}
          />
          <div className="edit-actions">
            <button className="edit-cancel-btn" onClick={() => setEditing(false)}>Hủy</button>
            <button className="edit-submit-btn" onClick={submitEdit}>Gửi lại</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Normal mode ───────────────────────────────────────────
  return (
    <div
      className={`message-row ${isUser ? 'user' : 'assistant'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {!isUser && (
        <div className="assistant-avatar" aria-hidden>C</div>
      )}

      <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
        {isUser ? (
          <p className="user-text">{msg.content}</p>
        ) : (
          <div className="markdown-content">
            <Markdown content={msg.content} />
            {msg.streaming && <span className="cursor-blink" />}
          </div>
        )}

        {/* Timestamp on hover */}
        {hovered && msg.createdAt && (
          <span className="msg-timestamp">{relativeTime(msg.createdAt)}</span>
        )}
      </div>

      {/* Hover actions (outside the bubble) */}
      {hovered && !msg.streaming && (
        <div className={`msg-actions ${isUser ? 'user-actions' : 'assistant-actions'}`}>
          <ActionBtn title={copied ? 'Đã sao chép!' : 'Sao chép'} onClick={handleCopy}>
            {copied
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            }
          </ActionBtn>

          {isUser && (
            <ActionBtn title="Chỉnh sửa" onClick={() => { setEditValue(msg.content); setEditing(true) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </ActionBtn>
          )}

          {!isUser && isLastAssistant && (
            <ActionBtn title="Tạo lại" onClick={onRegenerate}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
              </svg>
            </ActionBtn>
          )}
        </div>
      )}
    </div>
  )
}
