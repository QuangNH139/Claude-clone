# Claude Chat Web App

Web chat với Claude AI, có đăng nhập bảo mật, API key không bao giờ lộ ra frontend.

## Tính năng

- Đăng nhập bảo mật (JWT, 7 ngày)
- Streaming response (hiển thị từng chữ như Claude.ai)
- Hỗ trợ Markdown + syntax highlighting code
- Chọn model (Opus 4 / Sonnet 4 / Haiku 4)
- Responsive, sidebar ẩn/hiện
- Không bao giờ lộ API key ra browser

## Bảo mật

```
Browser → /api/auth (login)  → trả JWT token
Browser → /api/chat (chat)   → xác thực JWT → gọi Claude API
                                                ↑
                              ANTHROPIC_API_KEY chỉ nằm ở server (Vercel env)
```

## Deploy lên Vercel

### 1. Clone & cài dependencies

```bash
git clone <repo>
cd claude-chatbot
npm install
```

### 2. Deploy

```bash
npm i -g vercel
vercel
```

### 3. Thiết lập Environment Variables trên Vercel

Vào **Vercel Dashboard → Project → Settings → Environment Variables** và thêm:

| Tên | Giá trị |
|-----|---------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `ADMIN_USERNAME` | tên đăng nhập bạn muốn |
| `ADMIN_PASSWORD` | mật khẩu mạnh |
| `JWT_SECRET` | chuỗi ngẫu nhiên 32+ ký tự |

Tạo JWT_SECRET: `openssl rand -base64 32`

### 4. Redeploy sau khi thêm env vars

```bash
vercel --prod
```

## Chạy local (development)

Tạo file `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password123
JWT_SECRET=dev-secret-key-32chars-minimum
```

Chạy server API local (port 3001) và Vite dev server:
```bash
# Terminal 1: API server
node server.local.js

# Terminal 2: Vite
npm run dev
```
