# Hướng Dẫn Cài Đặt Môi Trường - Eat Clean API

Tài liệu này hướng dẫn chi tiết các bước cài đặt và cấu hình môi trường để chạy dự án **Eat Clean API**.

---

## Yêu Cầu Hệ Thống

- **Node.js**: >= 16.x (khuyến nghị 18.x hoặc cao hơn)
- **npm**: >= 8.x
- **MongoDB**: >= 5.0 (local hoặc Atlas)
- **LM Studio**: Phiên bản mới nhất (để chạy AI models)
- **Git**: Để clone/manage project

---

## Bước 1: Cài Đặt Node.js và npm

### macOS (sử dụng Homebrew)
```bash
brew install node
```

### Windows
Tải từ [https://nodejs.org/](https://nodejs.org/) và cài đặt

### Linux
```bash
sudo apt update
sudo apt install nodejs npm
```

### Kiểm tra cài đặt
```bash
node --version
npm --version
```

---

## Bước 2: Clone và Setup Project

### 1. Clone repository
```bash
cd Desktop/UIT-Project
git clone <repository-url>
cd eat-clean-api
```

### 2. Cài đặt dependencies
```bash
npm install
```

Lệnh này sẽ cài đặt tất cả các thư viện được liệt kê trong `package.json`:
- **express**: Web framework
- **mongoose**: MongoDB ODM
- **jsonwebtoken**: JWT authentication
- **bcrypt**: Mã hóa password
- **cors**: Cross-origin support
- **helmet**: Security middleware
- **morgan**: HTTP logging
- **swagger-ui-express**: API documentation
- **dotenv**: Environment variables
- Và các thư viện khác

---

## Bước 3: Cấu Hình MongoDB

### Tùy Chọn A: MongoDB Atlas (Nên dùng)

1. **Tạo tài khoản**
   - Truy cập [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Đăng ký tài khoản miễn phí

2. **Tạo Cluster**
   - Chọn "Build a Database"
   - Chọn Free tier
   - Chọn region gần Việt Nam (Singapore hoặc Tokyo)
   - Tên cluster: `eat-clean-cluster` (tùy chọn)

3. **Cấu hình Security**
   - Tạo Database User (username và password)
   - Whitelist IP address (thêm `0.0.0.0/0` cho dev)
   - Chọn "Allow access from anywhere"

4. **Lấy Connection String**
   - Chọn "Connect"
   - Sao chép connection string:
   ```
   mongodb+srv://<username>:<password>@<cluster-url>/eat-clean-db?retryWrites=true&w=majority
   ```

### Tùy Chọn B: MongoDB Local

1. **Cài MongoDB**
   
   **macOS:**
   ```bash
   brew install mongodb-community
   brew services start mongodb-community
   ```
   
   **Windows:** 
   - Tải từ [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
   - Cài đặt theo hướng dẫn
   - MongoDB sẽ chạy tại `mongodb://localhost:27017`

2. **Connection String:**
   ```
   mongodb://localhost:27017/eat-clean-db
   ```

---

## Bước 4: Cấu Hình Environment Variables

### 1. Tạo file `.env` trong thư mục gốc
```bash
cd eat-clean-api
touch .env
```

### 2. Thêm các biến sau vào `.env`
```env
# Server
PORT=4000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/eat-clean-db?retryWrites=true&w=majority
# Hoặc cho MongoDB local:
# MONGODB_URI=mongodb://localhost:27017/eat-clean-db

# JWT Secret (tạo string ngẫu nhiên dài)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_min_32_chars
JWT_EXPIRE=7d

# LM Studio (sẽ setup ở bước tiếp)
LM_STUDIO_BASE_URL=http://localhost:1234/v1
LM_STUDIO_API_KEY=your-api-key-if-needed
LM_STUDIO_MODEL=model-name

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Rate Limit
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Cập nhật các giá trị:
- `<username>` và `<password>`: Credentials MongoDB
- `<cluster-url>`: URL của MongoDB Atlas cluster
- `JWT_SECRET`: Tạo string random mạnh (ít nhất 32 ký tự)

---

## Bước 5: Setup LM Studio (Chạy AI Models)

### 1. Cài Đặt LM Studio

1. Tải LM Studio từ [https://lmstudio.ai/](https://lmstudio.ai/)
2. Cài đặt ứng dụng
3. Mở ứng dụng LM Studio

### 2. Download Model

1. Trong LM Studio, chọn tab **"Search models"** (biểu tượng search)
2. Tìm các model phổ biến:
   - **Mistral 7B** (khuyến nghị - nhẹ, nhanh)
   - **Neural Chat 7B** (tốt cho chat)
   - **Llama 2 7B** (đa năng)
   - **Phi 2** (nhỏ gọn, nhanh)

3. Ví dụ: Tìm "mistral" → Click **Download**
4. Chờ download hoàn tất (có thể mất 5-10 phút)

**Ví dụ: Cài Mistral 7B Instruct**
```
Model: mistral-7b-instruct-v0.2.Q4_K_M.gguf
Size: ~5 GB
```

### 3. Load Model để Chạy Server

1. Chuyển sang tab **"My Models"**
2. Tìm model vừa download
3. Chọn **"Load Model"** (biểu tượng mũi tên phải)
4. Chọn **"Local Server"**
5. Server sẽ chạy mặc định tại: `http://localhost:1234`

**Khi server khởi chạy, bạn sẽ thấy:**
```
Server listening on http://localhost:1234
Ready to accept requests
```

### 4. Cập nhật `.env` với Model được chọn

Mở file `.env` và cập nhật:
```env
LM_STUDIO_BASE_URL=http://localhost:1234/v1
LM_STUDIO_MODEL=mistral-7b-instruct-v0.2.Q4_K_M
```

### 5. Test LM Studio (Optional)
Truy cập: `http://localhost:1234/` để xem giao diện web

---

## Bước 6: Chạy Project

### Development Mode (với auto-reload)
```bash
npm run dev
```

**Output mong đợi:**
```
🚀 Server listening on http://localhost:4000
Connected to MongoDB
```

### Production Mode
```bash
npm start
```

---

## Kiểm Tra API

### 1. Swagger Documentation
Truy cập: `http://localhost:4000/api/docs`

### 2. Health Check
```bash
curl http://localhost:4000/api/health
```

Kết quả mong đợi:
```json
{
  "status": "ok",
  "message": "API is running",
  "timestamp": "2024-01-19T10:30:00.000Z"
}
```

### 3. LM Studio API Check
```bash
curl http://localhost:1234/v1/models
```

---

## Troubleshooting

### Lỗi: "Cannot find module 'express'"
**Giải pháp:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Lỗi: MongoDB Connection Refused
**Kiểm tra:**
```bash
# Kiểm tra MongoDB đang chạy hay chưa
# macOS
brew services list | grep mongodb

# Windows: Kiểm tra MongoDB service trong Services
# Linux
sudo systemctl status mongod
```

### Lỗi: LM Studio Server không kết nối
**Giải pháp:**
1. Mở LM Studio
2. Chắc chắn model đã được load
3. Kiểm tra `http://localhost:1234` có hoạt động không
4. Kiểm tra URL trong `.env` là `http://localhost:1234/v1`

### Lỗi: CORS Error
**Giải pháp:**
- Kiểm tra `CORS_ORIGIN` trong `.env` khớp với frontend URL
- Ví dụ: `CORS_ORIGIN=http://localhost:3000,http://localhost:5173`

### Lỗi: Port đang bị sử dụng
**Kiểm tra và giải phóng port:**
```bash
# macOS/Linux
lsof -i :4000
kill -9 <PID>

# Windows (PowerShell)
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

---

## Cấu Trúc Thư Mục

```
eat-clean-api/
├── src/
│   ├── index.js                    # Entry point
│   ├── config/
│   │   ├── db.js                  # MongoDB connection
│   │   └── swagger.js             # Swagger config
│   ├── controllers/               # Business logic
│   ├── models/                    # MongoDB schemas
│   ├── routes/                    # API routes
│   ├── middleware/                # Custom middleware
│   └── utils/                     # Helper functions
├── .env                           # Environment variables
├── .env.example                   # Template
├── package.json                   # Dependencies
└── SETUP_GUIDE.md                # Tài liệu này
```

---

## Bước Tiếp Theo

1. Chạy `npm install`
2. Cấu hình `.env` file
3. Kết nối MongoDB
4. Setup LM Studio
5. Chạy `npm run dev`
6. Test API tại `http://localhost:4000/api/docs`

---

## Hỗ Trợ

Nếu gặp vấn đề:
- Kiểm tra lại các bước trên
- Xem file logs trong terminal
- Liên hệ team development

---

**Cập nhật lần cuối:** 2024-01-19
**Phiên bản:** 1.0.0
