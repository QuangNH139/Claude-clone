import { useState } from 'react'
import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

function mapFirebaseError(code) {
  const map = {
    'auth/invalid-credential':   'Email hoặc mật khẩu không đúng',
    'auth/user-not-found':       'Email không tồn tại',
    'auth/wrong-password':       'Mật khẩu không đúng',
    'auth/invalid-email':        'Email không hợp lệ',
    'auth/user-disabled':        'Tài khoản đã bị vô hiệu hóa',
    'auth/too-many-requests':    'Quá nhiều lần thử, vui lòng thử lại sau',
    'auth/popup-closed-by-user': 'Đăng nhập bị hủy',
    'auth/network-request-failed': 'Lỗi mạng, kiểm tra kết nối internet',
  }
  return map[code] || 'Đăng nhập thất bại, vui lòng thử lại'
}

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setError(mapFirebaseError(err.code))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(mapFirebaseError(err.code))
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="12" fill="#7c3aed" />
            <text x="24" y="33" fontSize="22" textAnchor="middle" fill="white" fontFamily="Arial" fontWeight="bold">C</text>
          </svg>
        </div>

        <h1 className="login-title">Claude Chat</h1>
        <p className="login-subtitle">Đăng nhập để bắt đầu trò chuyện</p>

        {/* Google Sign-In */}
        <button
          className="google-btn"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          type="button"
        >
          {googleLoading ? (
            <span className="spinner-inline" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
          )}
          Đăng nhập với Google
        </button>

        <div className="divider"><span>hoặc</span></div>

        {/* Email / Password */}
        <form onSubmit={handleEmailLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading || googleLoading} className="login-btn">
            {loading ? <span className="spinner-inline" /> : 'Đăng nhập'}
          </button>
        </form>

        <p className="login-note">
          Liên hệ quản trị viên để được cấp tài khoản.
        </p>
      </div>
    </div>
  )
}
