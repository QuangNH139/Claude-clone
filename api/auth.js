import jwt from 'jsonwebtoken'

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }

  const validUsername = process.env.ADMIN_USERNAME
  const validPassword = process.env.ADMIN_PASSWORD
  const jwtSecret = process.env.JWT_SECRET

  if (!validUsername || !validPassword || !jwtSecret) {
    return res.status(500).json({ error: 'Server not configured' })
  }

  if (username !== validUsername || password !== validPassword) {
    return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' })
  }

  const token = jwt.sign({ username }, jwtSecret, { expiresIn: '7d' })
  return res.status(200).json({ token })
}
