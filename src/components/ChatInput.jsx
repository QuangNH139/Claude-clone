import { useRef, useEffect } from 'react'

export default function ChatInput({ value, onChange, onSend, onStop, loading }) {
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 220) + 'px'
  }, [value])

  // Focus on mount
  useEffect(() => { textareaRef.current?.focus() }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!loading && value.trim()) onSend()
    }
  }

  return (
    <div className="input-area">
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhắn tin với Claude... (Enter để gửi, Shift+Enter xuống dòng)"
          rows={1}
          disabled={false}
        />

        <div className="input-actions">
          {loading ? (
            <button className="stop-btn" onClick={onStop} title="Dừng tạo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
              </svg>
            </button>
          ) : (
            <button
              className="send-btn"
              onClick={onSend}
              disabled={!value.trim()}
              title="Gửi (Enter)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <p className="input-hint">
        Claude có thể mắc lỗi. Kiểm tra thông tin quan trọng.
      </p>
    </div>
  )
}
