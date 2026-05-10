# HPCS Parking System — Hướng dẫn chạy dự án

> Cập nhật: 2026-05-10 23:46 — Phản ánh đúng cấu hình sau khi debug

---

## Yêu cầu phần mềm

| Phần mềm | Phiên bản | Dùng cho |
|---|---|---|
| Node.js | 18+ | Next.js Frontend |
| Python | 3.10+ | FastAPI Backend + Bridge |
| XAMPP | Mới nhất | MariaDB (MySQL) |
| PlatformIO | CLI hoặc VS Code | Nạp firmware ESP32 |

---

## Cấu trúc dự án

```
HPCS-main/
├── src/                  ← Next.js Frontend (port 3000)
├── backend/
│   ├── bridge/           ← Bridge ESP32 (serial + HTTP port 5001)
│   ├── camera/           ← OCR biển số (scanner.py)
│   ├── payment/          ← Strategy Pattern (base, student, guest)
│   ├── routers/          ← API handlers (gate_router, students)
│   ├── utils/            ← Tiện ích (image_store.py lưu ảnh)
│   ├── static/plates/    ← Ảnh biển số (tự tạo khi chạy)
│   ├── payos_router.py   ← PayOS QR webhook router
│   ├── main.py           ← FastAPI entry point
│   ├── database.py       ← SQLAlchemy engine
│   ├── models.py         ← ORM models
│   └── .env              ← Biến môi trường (đã có sẵn)
├── database/
│   └── schema_v2.sql     ← Schema DB đầy đủ (dùng file này)
└── ESP32_1/Test1/        ← Firmware ESP32 (PlatformIO)
```

---

## Bước 1 — Cài đặt Database (MariaDB)

### 1.1 Khởi động XAMPP
1. Mở **XAMPP Control Panel**
2. Bấm **Start** cho **MySQL** (Apache không bắt buộc)
3. Mở trình duyệt → vào `http://localhost/phpmyadmin`

### 1.2 Tạo DB và chạy Schema
1. phpMyAdmin → Click **"New"** ở cột trái → Tên: `parking_management` → Create
2. Click vào `parking_management` → tab **SQL**
3. Mở file `database/schema_v2.sql` → copy toàn bộ → paste → **Go**

### 1.3 Kiểm tra
```sql
SELECT 'users' as tbl, COUNT(*) as n FROM users
UNION SELECT 'students', COUNT(*) FROM students
UNION SELECT 'guest_cards', COUNT(*) FROM guest_cards;
-- Kết quả: users=2, students=2, guest_cards=3
```

> **Nếu đã có DB cũ** và muốn tạo lại từ đầu:
> phpMyAdmin → chọn `parking_management` → Operations → Drop → rồi làm lại từ đầu

---

## Bước 2 — Cài đặt Backend (Python / FastAPI)

### 2.1 Cài dependencies (lần đầu — mất ~5 phút do torch/easyocr)

```powershell
cd E:\Data\Work\Capstone1_Test\Document\HPCS-main\backend

# Cài tất cả packages cần thiết
pip install fastapi uvicorn sqlalchemy pymysql python-dotenv
pip install numpy opencv-python easyocr aiofiles
pip install payos requests flask pyserial
```

> **Lưu ý:** `torch` (~114MB) sẽ được cài tự động theo `easyocr`. Cần chờ vài phút.

### 2.2 Kiểm tra file `.env`

File `backend/.env` đã có sẵn với cấu hình mặc định XAMPP:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=        ← để trống nếu XAMPP không đặt password
DB_NAME=parking_management

PAYOS_CLIENT_ID=    ← để trống khi chưa có, backend vẫn chạy
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=

CAMERA_ENABLED=false   ← false = không cần camera để chạy demo
```

> **Khi có camera thật:** đổi `CAMERA_ENABLED=true`
> **Khi có PayOS:** điền 3 biến PAYOS_* lấy từ `dashboard.payos.vn`

---

## Bước 3 — Cài đặt Frontend (Next.js)

```powershell
cd E:\Data\Work\Capstone1_Test\Document\HPCS-main

# Cài dependencies (lần đầu)
npm install
```

Tạo file `.env.local` trong thư mục gốc:

```env
# Database (cho NextAuth đăng nhập)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=parking_management

# NextAuth
NEXTAUTH_SECRET=hpcs-secret-key-2026
NEXTAUTH_URL=http://localhost:3000
```

---

## Bước 4 — Nạp Firmware ESP32

```powershell
cd E:\Data\Work\Capstone1_Test\ESP32_1\Test1

# Build và upload
pio run --target upload

# Xem serial monitor
pio device monitor --baud 115200
```

---

## Chạy hệ thống (Thứ tự quan trọng!)

### ① Terminal 1 — Backend FastAPI (port 8000)

```powershell
cd E:\Data\Work\Capstone1_Test\Document\HPCS-main\backend
uvicorn main:app --reload --port 8000
```

Kết quả bình thường khi khởi động:
```
[Camera] CAMERA_ENABLED=false → Dùng STUB mode, plate='UNKNOWN'.
[Camera] Stub CameraManager được khởi tạo.
PayOS client KHÔNG khởi tạo được (...). API QR sẽ trả 503.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

> Các dòng WARNING về Camera và PayOS là **bình thường** khi chưa cấu hình.
> Miễn có `Application startup complete` là backend đã sẵn sàng.

### ② Terminal 2 — Frontend Next.js (port 3000)

```powershell
cd E:\Data\Work\Capstone1_Test\Document\HPCS-main
npm run dev
```

### ③ Terminal 3 — Bridge (sau khi cắm ESP32)

```powershell
cd E:\Data\Work\Capstone1_Test\Document\HPCS-main\backend

# Cổng VÀO (mặc định)
python -m bridge --port COM9

# Cổng RA
python -m bridge --port COM9 --mode OUT
```

> Bridge sẽ tự động khởi động **CommandServer HTTP trên port 5001**.
> Kiểm tra ESP32 đang ở COM nào: Device Manager → Ports (COM & LPT)

---

## Kiểm tra hệ thống

| Địa chỉ | Mô tả | Kết quả mong đợi |
|---|---|---|
| `http://localhost:8000/docs` | FastAPI Swagger UI | Danh sách API |
| `http://localhost:8000/api/students/` | Danh sách SV | JSON list 2 SV |
| `http://localhost:3000` | Web dashboard | Trang đăng nhập |
| `http://localhost:5001/health` | Bridge status | `{"status":"ok"}` |

---

## Test API nhanh (không cần ESP32)

Mở `http://localhost:8000/docs` và thử từng API:

### 1. Xem danh sách SV
```
GET /api/students/
```
Kết quả: 2 SV với balance = 50,000đ

### 2. Xem số dư theo RFID
```
GET /api/students/balance/698D2B3F
```

### 3. Nạp tiền demo
```
POST /api/students/topup?rfid_code=698D2B3F&amount=50000
```

### 4. Giả lập xe vào (CAMERA_ENABLED=false → plate=UNKNOWN)
```
POST /api/gate/entry
Body: {"rfid_code": "698D2B3F"}
```

### 5. Giả lập xe ra (sinh viên trả 2,000đ tự động)
```
POST /api/gate/exit
Body: {"rfid_code": "698D2B3F", "method": "QR"}
```

### 6. Test push lệnh Bridge (cần bridge đang chạy)
```powershell
Invoke-RestMethod -Uri "http://localhost:5001/send" -Method POST `
  -ContentType "application/json" `
  -Body '{"cmd": "OPEN-OUT"}'
```

---

## Tài khoản đăng nhập mặc định

| Loại | Username | Password | Vai trò |
|---|---|---|---|
| Web dashboard | `admin` | `admin123` | admin |
| Web dashboard | `guard` | `guard123` | staff |

---

## Xử lý sự cố thường gặp

### Port 8000 đang bị chiếm
```powershell
# Tìm process đang dùng port 8000
netstat -ano | findstr :8000
# Kill process (thay PID)
taskkill /PID <PID> /F
```

### XAMPP MySQL không Start được
- Port 3306 bị chiếm → đổi port trong XAMPP Config
- Hoặc dùng: `net stop MySQL80` để dừng MySQL Windows service

### Bridge không kết nối COM9
```powershell
# Liệt kê tất cả COM port đang có
python -c "import serial.tools.list_ports; [print(p) for p in serial.tools.list_ports.comports()]"
# Thay COM9 bằng cổng đúng trong lệnh chạy bridge
```

### Backend lỗi DB connection
```
OperationalError: (2003) Can't connect to MySQL server
```
→ Kiểm tra XAMPP MySQL đang Start
→ Kiểm tra `DB_NAME=parking_management` trong `backend/.env`
→ Kiểm tra đã chạy `schema_v2.sql` chưa

### Muốn bật camera thật
```env
# Trong backend/.env
CAMERA_ENABLED=true
```
Yêu cầu: webcam kết nối, `cv2` + `easyocr` đã cài (đã cài ở Bước 2)

---

## API Endpoints đầy đủ

### Đã hoạt động ✅
| Endpoint | Method | Mô tả |
|---|---|---|
| `/api/gate/entry` | POST | Xe vào (RFID) |
| `/api/gate/exit` | POST | Xe ra (RFID + method=QR/CASH) |
| `/api/students/` | GET | Danh sách sinh viên |
| `/api/students/register` | POST | Đăng ký SV mới |
| `/api/students/balance/{rfid}` | GET | Xem số dư theo RFID |
| `/api/students/topup` | POST | Nạp tiền demo |
| `/api/payment/guest/create-qr` | POST | Tạo QR PayOS (cần credentials) |
| `/api/payment/webhook` | POST | PayOS callback |
| `/api/payment/status/{id}` | GET | Polling trạng thái QR |
| `localhost:5001/send` | POST | Bridge: push lệnh ESP32 |
| `localhost:5001/health` | GET | Bridge: health check |

### Chưa làm (Phase 3) 🔵
| Endpoint | Mô tả |
|---|---|
| `POST /api/payment/cash-confirm/{id}` | Bảo vệ xác nhận tiền mặt thủ công |
| `POST /api/gate/manual-checkin` | Tạo session khách thủ công |

---

## Cổng kết nối tóm tắt

| Service | Địa chỉ | Ghi chú |
|---|---|---|
| Next.js Frontend | `localhost:3000` | Web dashboard |
| FastAPI Backend | `localhost:8000` | REST API + Swagger |
| Bridge CommandServer | `localhost:5001` | Push lệnh xuống ESP32 |
| MariaDB | `localhost:3306` | Database |
| ESP32 Serial | `COM9` (115200 baud) | Kiểm tra Device Manager |

---

## Git — Quy trình cập nhật code

```powershell
cd E:\Data\Work\Capstone1_Test\Document\HPCS-main
git add .
git commit -m "feat: mô tả thay đổi"
git push origin main
```

> ⚠️ **KHÔNG commit** file `backend/.env` — chứa thông tin nhạy cảm!
> File này đã được thêm vào `.gitignore`.
