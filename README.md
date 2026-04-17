# Claude Chat Web App

Web chat với Claude AI. Đăng nhập qua **Firebase Authentication**, deploy trên **Firebase Hosting** (static only – không cần Cloud Functions).

## Kiến trúc

```
Browser ── Firebase Auth ──► Google (quản lý đăng nhập)
    │
    │  (chỉ user đã đăng nhập mới vào được)
    │
    └── Claude API ──────────► api.anthropic.com (gọi trực tiếp từ browser)
```

- `VITE_ANTHROPIC_API_KEY` được nhúng vào bundle lúc build – **chỉ phù hợp cho app cá nhân/nhóm nhỏ**.
- Firebase Auth đảm bảo chỉ người được cấp tài khoản mới dùng được.

## Tính năng

- Đăng nhập Email/Password + Google Sign-In
- Nhiều hội thoại – lưu localStorage, phân nhóm theo ngày
- Tìm kiếm, đổi tên, xóa hội thoại
- Chỉnh sửa tin nhắn user, tạo lại câu trả lời
- Sao chép tin nhắn, timestamp khi hover
- Streaming response (từng chữ như Claude.ai)
- Markdown + syntax highlighting
- Dark / Light mode (lưu preference)
- Chọn model (Opus 4 / Sonnet 4 / Haiku 4)

---

## 🔥 Deploy lên Firebase Hosting

### Bước 1 – Tạo Firebase project

1. [console.firebase.google.com](https://console.firebase.google.com) → Tạo project
2. Bật **Hosting** (không cần Functions hay Blaze plan)
3. Bật **Authentication** → Email/Password và/hoặc Google
4. Thêm user: **Authentication → Users → Add user**

### Bước 2 – Cài Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # chọn project, tạo .firebaserc
```

### Bước 3 – Build và deploy thủ công (lần đầu)

Tạo `.env.local`:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

```bash
npm install
npm run build
firebase deploy --only hosting
```

URL sẽ là: `https://your-project.web.app`

---

## ⚡ Tự động deploy với GitHub Actions

Mỗi khi push lên `main` → tự build và deploy.

### Thiết lập GitHub Secrets & Variables

**Settings → Secrets and variables → Actions**

| Loại | Tên | Lấy ở đâu |
|------|-----|-----------|
| **Secret** | `VITE_ANTHROPIC_API_KEY` | console.anthropic.com |
| **Secret** | `FIREBASE_SERVICE_ACCOUNT` | Firebase Console → Project Settings → Service accounts → Generate key (JSON) |
| **Variable** | `FIREBASE_PROJECT_ID` | Firebase Console → Project settings |
| **Variable** | `VITE_FIREBASE_API_KEY` | Firebase Console → Your apps → Web |
| **Variable** | `VITE_FIREBASE_AUTH_DOMAIN` | ↑ |
| **Variable** | `VITE_FIREBASE_PROJECT_ID` | ↑ |
| **Variable** | `VITE_FIREBASE_STORAGE_BUCKET` | ↑ |
| **Variable** | `VITE_FIREBASE_MESSAGING_SENDER_ID` | ↑ |
| **Variable** | `VITE_FIREBASE_APP_ID` | ↑ |

Push lên `main` → GitHub Actions tự build + deploy.

---

## 💻 Chạy local

```bash
cp .env.example .env.local
# Điền giá trị vào .env.local
npm install
npm run dev
```
