# Claude Chat Web App

Web chat với Claude AI – đăng nhập qua **Firebase Authentication** (Email/Password + Google). API key không bao giờ lộ ra browser.

## Kiến trúc bảo mật

```
Browser ──── Firebase Auth ────► Firebase (Google quản lý)
                                        │
                                        │ ID Token (1h, tự refresh)
                                        ▼
Browser ──── POST /api/chat ──►  Cloud Function
                                        │
                                        │ verify ID Token (firebase-admin)
                                        │ gọi Claude API
                                        ▼
                               ANTHROPIC_API_KEY (chỉ trên server)
```

---

## 🔥 Deploy lên Firebase (tự động qua GitHub Actions)

### Bước 1 – Tạo Firebase project

1. Vào [console.firebase.google.com](https://console.firebase.google.com) → Tạo project
2. Bật **Hosting** và **Functions** (yêu cầu **Blaze plan**)
3. Bật **Authentication** → Sign-in method → bật **Email/Password** và/hoặc **Google**
4. Thêm user: **Authentication → Users → Add user**

### Bước 2 – Tạo Service Account cho GitHub Actions

1. Firebase Console → Project Settings → **Service accounts**
2. Click **Generate new private key** → tải file JSON
3. Giữ file này bí mật (không commit)

### Bước 3 – Cấu hình GitHub Secrets & Variables

Vào **GitHub repo → Settings → Secrets and variables → Actions**

#### Secrets (bí mật):
| Tên | Giá trị |
|-----|---------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `FIREBASE_SERVICE_ACCOUNT` | Toàn bộ nội dung file JSON service account |

#### Variables (công khai – lấy từ Firebase Console → Project Settings → Your apps):
| Tên | Giá trị |
|-----|---------|
| `FIREBASE_PROJECT_ID` | `your-project-id` |
| `VITE_FIREBASE_API_KEY` | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789` |
| `VITE_FIREBASE_APP_ID` | `1:123:web:abc` |

### Bước 4 – Cập nhật .firebaserc

Sửa file `.firebaserc`:
```json
{ "projects": { "default": "your-project-id" } }
```

### Bước 5 – Push lên main → tự động deploy

```bash
git push origin main
```

GitHub Actions sẽ tự động:
1. Cài dependencies
2. Inject `ANTHROPIC_API_KEY` vào `functions/.env`
3. Build React (với Firebase config từ vars)
4. Deploy Hosting + Functions lên Firebase

---

## 💻 Chạy local

Tạo `.env.local` (cho Vite):
```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
```

Tạo `functions/.env` (cho Cloud Functions emulator):
```
ANTHROPIC_API_KEY=sk-ant-...
```

Chạy Firebase emulator + Vite:
```bash
# Terminal 1
npm install && cd functions && npm install && cd ..
firebase emulators:start --only functions,hosting

# Terminal 2
npm run dev
```

---

## Cấu trúc project

```
├── .github/workflows/
│   └── deploy.yml        # GitHub Actions – tự động deploy khi push main
├── api/
│   └── chat.js           # Vercel serverless (dùng Firebase token)
├── functions/
│   ├── index.js          # Firebase Cloud Functions (auth + chat)
│   └── package.json
├── src/
│   ├── firebase.js       # Firebase SDK init
│   ├── App.jsx           # Firebase Auth state observer
│   └── components/
│       ├── LoginPage.jsx # Email/Password + Google Sign-In
│       └── ChatPage.jsx  # SSE streaming chat
├── firebase.json         # Firebase Hosting + Functions config
└── vercel.json           # Vercel config (thay thế)
```
