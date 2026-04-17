import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import LoginPage from './components/LoginPage'
import ChatPage from './components/ChatPage'

export default function App() {
  // undefined = đang kiểm tra trạng thái, null = chưa đăng nhập, object = đã đăng nhập
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser)
    return unsub
  }, [])

  if (user === undefined) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    )
  }

  return user ? <ChatPage user={user} /> : <LoginPage />
}
