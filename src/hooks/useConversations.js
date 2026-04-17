import { useState, useEffect, useCallback } from 'react'
import { loadConversations, saveConversations } from '../utils/storage'

function makeConversation() {
  return {
    id: crypto.randomUUID(),
    title: 'Cuộc trò chuyện mới',
    createdAt: Date.now(),
    messages: [],
  }
}

export function useConversations() {
  const [conversations, setConversations] = useState(() => {
    const stored = loadConversations()
    return stored.length > 0 ? stored : [makeConversation()]
  })

  const [activeId, setActiveId] = useState(() => {
    const stored = loadConversations()
    return stored.length > 0 ? stored[0].id : null
  })

  // Keep activeId valid when conversations change
  useEffect(() => {
    if (conversations.length > 0 && !conversations.find(c => c.id === activeId)) {
      setActiveId(conversations[0].id)
    }
  }, [conversations, activeId])

  useEffect(() => { saveConversations(conversations) }, [conversations])

  const activeConv = conversations.find(c => c.id === activeId) ?? conversations[0]

  const create = useCallback(() => {
    const conv = makeConversation()
    setConversations(prev => [conv, ...prev])
    setActiveId(conv.id)
    return conv.id
  }, [])

  const remove = useCallback((id) => {
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id)
      if (next.length === 0) {
        const fresh = makeConversation()
        setActiveId(fresh.id)
        return [fresh]
      }
      setActiveId(cur => cur === id ? next[0].id : cur)
      return next
    })
  }, [])

  const rename = useCallback((id, title) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c))
  }, [])

  const updateMessages = useCallback((id, updater) => {
    setConversations(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, messages: typeof updater === 'function' ? updater(c.messages) : updater }
          : c
      )
    )
  }, [])

  const autoTitle = useCallback((id, firstMessage) => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '…' : '')
    setConversations(prev =>
      prev.map(c => c.id === id && c.title === 'Cuộc trò chuyện mới' ? { ...c, title } : c)
    )
  }, [])

  return { conversations, activeId, activeConv, setActiveId, create, remove, rename, updateMessages, autoTitle }
}
