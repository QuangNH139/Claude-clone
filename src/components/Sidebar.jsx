import { useState, useRef, useEffect } from 'react'

const MODELS = [
  { id: 'claude-opus-4-7',          label: 'Claude Opus 4'   },
  { id: 'claude-sonnet-4-6',        label: 'Claude Sonnet 4' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4' },
]

// ── Group conversations by date ───────────────────────────────
function groupByDate(conversations) {
  const today     = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  const week      = new Date(today); week.setDate(today.getDate() - 7)
  const month     = new Date(today); month.setDate(today.getDate() - 30)

  const groups = [
    { label: 'Hôm nay',     items: [] },
    { label: 'Hôm qua',     items: [] },
    { label: '7 ngày qua',  items: [] },
    { label: '30 ngày qua', items: [] },
    { label: 'Cũ hơn',      items: [] },
  ]

  for (const conv of conversations) {
    const d = new Date(conv.createdAt)
    if      (d >= today)     groups[0].items.push(conv)
    else if (d >= yesterday) groups[1].items.push(conv)
    else if (d >= week)      groups[2].items.push(conv)
    else if (d >= month)     groups[3].items.push(conv)
    else                     groups[4].items.push(conv)
  }

  return groups.filter(g => g.items.length > 0)
}

// ── Single conversation row ───────────────────────────────────
function ConvItem({ conv, active, onSelect, onDelete, onRename }) {
  const [editing, setEditing]  = useState(false)
  const [value, setValue]      = useState(conv.title)
  const [hovered, setHovered]  = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const startEdit = (e) => {
    e.stopPropagation()
    setValue(conv.title)
    setEditing(true)
  }

  const submitEdit = () => {
    const t = value.trim()
    if (t && t !== conv.title) onRename(t)
    setEditing(false)
  }

  return (
    <div
      className={`conv-item ${active ? 'active' : ''}`}
      onClick={() => !editing && onSelect()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {editing ? (
        <input
          ref={inputRef}
          className="conv-edit-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={submitEdit}
          onKeyDown={e => {
            if (e.key === 'Enter')  submitEdit()
            if (e.key === 'Escape') setEditing(false)
          }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <>
          <span className="conv-title">{conv.title}</span>
          {(hovered || active) && (
            <div className="conv-actions">
              <button
                className="conv-action-btn"
                title="Đổi tên"
                onClick={startEdit}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button
                className="conv-action-btn delete"
                title="Xóa"
                onClick={e => { e.stopPropagation(); onDelete() }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main Sidebar ──────────────────────────────────────────────
export default function Sidebar({
  conversations, activeId,
  onSelect, onCreate, onDelete, onRename,
  model, onModelChange,
  theme, onThemeToggle,
  user, onLogout,
  open, onToggle,
}) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : conversations

  const groups = groupByDate(filtered)

  return (
    <aside className={`sidebar ${open ? 'open' : 'closed'}`}>
      {/* Header */}
      <div className="sidebar-header">
        {open && (
          <div className="sidebar-logo">
            <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="10" fill="#7c3aed"/>
              <text x="24" y="33" fontSize="22" textAnchor="middle" fill="white" fontFamily="Arial" fontWeight="bold">C</text>
            </svg>
            <span className="logo-text">Claude Chat</span>
          </div>
        )}
        <button className="sidebar-toggle" onClick={onToggle} title={open ? 'Thu gọn' : 'Mở rộng'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open
              ? <path d="M15 18l-6-6 6-6"/>
              : <path d="M9 18l6-6-6-6"/>
            }
          </svg>
        </button>
      </div>

      {open && (
        <>
          <button className="new-chat-btn" onClick={onCreate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Cuộc trò chuyện mới
          </button>

          {/* Search */}
          <div className="search-wrapper">
            <svg className="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="search-input"
              placeholder="Tìm kiếm hội thoại..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {/* Conversations */}
          <div className="conversations-list">
            {groups.length > 0 ? groups.map(group => (
              <div key={group.label} className="conv-group">
                <div className="conv-group-label">{group.label}</div>
                {group.items.map(conv => (
                  <ConvItem
                    key={conv.id}
                    conv={conv}
                    active={conv.id === activeId}
                    onSelect={() => onSelect(conv.id)}
                    onDelete={() => onDelete(conv.id)}
                    onRename={title => onRename(conv.id, title)}
                  />
                ))}
              </div>
            )) : (
              <p className="no-results">Không tìm thấy hội thoại</p>
            )}
          </div>

          {/* Footer */}
          <div className="sidebar-footer">
            <div className="model-selector">
              <label>Model</label>
              <select value={model} onChange={e => onModelChange(e.target.value)}>
                {MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="sidebar-footer-actions">
              <button className="icon-action-btn" onClick={onThemeToggle} title="Đổi giao diện">
                {theme === 'dark'
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                }
              </button>
            </div>

            <div className="user-row">
              {user.photoURL
                ? <img src={user.photoURL} alt="" className="user-avatar"/>
                : <div className="user-avatar-placeholder">{(user.displayName || user.email || '?')[0].toUpperCase()}</div>
              }
              <span className="user-email" title={user.email}>
                {user.displayName || user.email}
              </span>
              <button className="user-logout-btn" onClick={onLogout} title="Đăng xuất">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
