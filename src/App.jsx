import { useState, useEffect } from 'react'
import LoginPage from './components/LoginPage'
import ChatPage from './components/ChatPage'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('claude_token'))

  useEffect(() => {
    if (token) localStorage.setItem('claude_token', token)
    else localStorage.removeItem('claude_token')
  }, [token])

  const handleLogout = () => setToken(null)

  return token ? (
    <ChatPage token={token} onLogout={handleLogout} />
  ) : (
    <LoginPage onLogin={setToken} />
  )
}
