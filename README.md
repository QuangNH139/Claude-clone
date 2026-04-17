# Claude Chat Web App

Web chat với Claude AI, có đăng nhập bảo mật. API key không bao giờ lộ ra frontend.

## Tính năng

- Đăng nhập bảo mật (JWT, 7 ngày)
- Streaming response (hiển thị từng chữ như Claude.ai)
- Hỗ trợ Markdown + syntax highlighting code
- Chọn model (Opus 4 / Sonnet 4 / Haiku 4)
- Responsive, sidebar ẩn/hiện

## Kiến trúc bảo mật

```
Browser → /api/auth (login)  → trả JWT token
Browser → /api/chat (chat)   → xác thực JWT → gọi Claude API (server-side)
                                                ↑
                              ANTHROPIC_API_KEY chỉ nằm ở server, không bao giờ ra browser
```

---

## 🔥 Deploy lên Firebase (Khuyến nghị)

### 1. Tạo Firebase project

1. Vào [console.firebase.google.com](https://console.firebase.google.com)
2. Tạo project mới
3. Bật **Hosting** và **Functions** (chọn Blaze plan – pay-as-you-go, Functions yêu cầu)

### 2. Cài Firebase CLI & đăng nhập

```bash
npm install -g firebase-tools
firebase login
```

### 3. Liên kết project

Sửa `.firebaserc`, thay `YOUR-FIREBASE-PROJECT-ID` bằng Project ID của bạn:

```json
{ "projects": { "default": "my-project-id" } }
```

Hoặc chạy:
```bash
firebase use --add
```

### 4. Thiết lập Environment Variables

Các biến này được lưu bảo mật trên Firebase (không commit vào git):

```bash
# Cài đặt từng biến (Firebase sẽ hỏi giá trị)
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase functions:secrets:set ADMIN_USERNAME
firebase functions:secrets:set ADMIN_PASSWORD
firebase functions:secrets:set JWT_SECRET
```

> Tạo JWT_SECRET ngẫu nhiên: `openssl rand -base64 32`

Sau đó cập nhật `functions/index.js` để dùng Secrets (thay vì `process.env`):

```js
// Nếu dùng Firebase Secret Manager, thêm vào đầu file:
import { defineSecret } from 'firebase-functions/params'
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')
const ADMIN_USERNAME    = defineSecret('ADMIN_USERNAME')
const ADMIN_PASSWORD    = defineSecret('ADMIN_PASSWORD')
const JWT_SECRET        = defineSecret('JWT_SECRET')

// Và truyền vào options của mỗi function:
export const auth = onRequest({ secrets: [ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET] }, ...)
export const chat = onRequest({ timeoutSeconds: 300, secrets: [ANTHROPIC_API_KEY, JWT_SECRET] }, ...)
// Trong function body dùng: ANTHROPIC_API_KEY.value() thay vì process.env.ANTHROPIC_API_KEY
```

**Hoặc đơn giản hơn** – dùng `.env` file cho Functions (không dùng Secret Manager):

```bash
# Tạo file functions/.env (không commit)
cp functions/.env.example functions/.env
# Điền giá trị vào functions/.env
```

### 5. Cài dependencies cho Functions

```bash
cd functions && npm install && cd ..
```

### 6. Build React và Deploy

```bash
# Build frontend
npm install
npm run build

# Deploy tất cả (Hosting + Functions)
firebase deploy

# Hoặc deploy riêng lẻ:
firebase deploy --only hosting
firebase deploy --only functions
```

### 7. Xem URL

Sau khi deploy xong, Firebase sẽ hiển thị:
```
Hosting URL: https://YOUR-PROJECT.web.app
```

---

## ▲ Deploy lên Vercel (Thay thế)

### 1. Deploy

```bash
npm install -g vercel
vercel
```

### 2. Environment Variables trên Vercel Dashboard

Vào **Settings → Environment Variables**:

| Tên | Giá trị |
|-----|---------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `ADMIN_USERNAME` | tên đăng nhập |
| `ADMIN_PASSWORD` | mật khẩu mạnh |
| `JWT_SECRET` | chuỗi random 32+ ký tự |

```bash
vercel --prod  # redeploy với env vars mới
```

---

## 💻 Chạy local (development)

Tạo file `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password123
JWT_SECRET=dev-secret-key-minimum-32-characters
```

```bash
# Terminal 1 – API server (port 3001)
node server.local.js

# Terminal 2 – Vite dev server
npm run dev
```

Mở http://localhost:5173

---

## Cấu trúc project

```
├── api/              # Vercel serverless functions
│   ├── auth.js
│   └── chat.js
├── functions/        # Firebase Cloud Functions
│   ├── index.js
│   └── package.json
├── src/              # React frontend
│   ├── App.jsx
│   └── components/
│       ├── LoginPage.jsx
│       └── ChatPage.jsx
├── firebase.json     # Firebase config
├── vercel.json       # Vercel config
└── server.local.js   # Local dev API server
```
