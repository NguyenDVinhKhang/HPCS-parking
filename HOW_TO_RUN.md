# HPCS Parking System — Hướng dẫn chạy dự án

> Cập nhật: May 14, 2026 — Thêm start_hpcs.ps1 quick-start và File Reference

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

**Cách nhanh — dùng `start_hpcs.ps1` (khởi động Backend + Bridge cùng lúc):**
```powershell
cd E:\Data\Work\Capstone1_Test\Document\HPCS-main\backend
.\start_hpcs.ps1              # mặc định COM9, cổng VÀO
.\start_hpcs.ps1 -Port COM3  # đổi cổng
.\start_hpcs.ps1 -Port COM9 -GateMode OUT  # cổng RA
```
> Ctrl+C → tự động dừng cả uvicorn lẫn bridge, giải phóng COM port.

**Cách thủ công (tách Terminal):**
```powershell
cd E:\Data\Work\Capstone1_Test\Document\HPCS-main\backend
python -m bridge --port COM9           # cổng VÀO
python -m bridge --port COM9 --mode OUT  # cổng RA
```

> Bridge tự động khởi động **CommandServer HTTP trên port 5001**.
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

---

## File Reference — Công dụng từng file code

### 🟦 Next.js Frontend (`src/`)

| File | Công dụng |
|---|---|
| `src/auth.ts` | NextAuth v5 config — xác thực session guard/admin |
| `src/proxy.ts` | Proxy HTTP từ Next.js đến Bridge CommandServer (port 5001) |
| `src/app/layout.tsx` | Root layout — bootstrap `payment-sync-scheduler` khi server khởi động |
| `src/app/page.tsx` | Trang chủ dashboard — tổng quan + nút Sync XGate |
| `src/app/(auth)/login/` | Trang đăng nhập (guard / admin) |
| `src/app/(main)/` | Các trang dashboard được bảo vệ (camera, students, vehicles, transactions...) |
| `src/app/(pay)/payment/` | Trang thanh toán Guest — hiển thị QR + đối soát XGate |
| `src/app/api/gate/` | API route gọi Bridge: mở/đóng cổng |
| `src/app/api/payments/gate/` | Tạo PayOS invoice + QR code |
| `src/app/api/payments/sync/` | Trigger đối soát XGate thủ công |
| `src/app/api/payments/reconcile/` | Kiểm tra trạng thái 1 invoice cụ thể qua XGate |
| `src/app/api/students/topup/` | Nạp tiền cho sinh viên |
| `src/lib/db.ts` | MySQL2 connection pool (dùng cho tất cả DB query) |
| `src/lib/payments.ts` | PAYMENT_REGISTRY — query payments table, update trạng thái |
| `src/lib/payment-qr.ts` | Helper tạo PayOS QR (gọi PayOS API, lưu invoice) |
| `src/lib/payment-sync.ts` | Đối soát XGate: fetch giao dịch ngân hàng → match invoice → cập nhật DB |
| `src/lib/payment-sync-scheduler.ts` | Auto-chạy `payment-sync` mỗi 5 phút (bootstrapped trong layout.tsx) |
| `src/lib/xgate.ts` | XGate API client — fetch danh sách giao dịch ngân hàng thực tế |
| `src/lib/camera.ts` | Gọi FastAPI `/api/camera/scan` để chụp ảnh + OCR từ frontend |
| `src/lib/reports.ts` | Query doanh thu, thống kê theo ngày |
| `src/lib/utils.ts` | Shared utilities (format tiền, ngày...) |

---

### 🟩 Python Backend (`backend/`)

| File | Công dụng |
|---|---|
| `main.py` | FastAPI app entry point — mount routers, static files, load env |
| `models.py` | SQLAlchemy ORM models (Student, GuestCard, ParkingSession, Payment...) |
| `database.py` | DB engine + `get_db()` dependency cho FastAPI |
| `payos_router.py` | PayOS webhook endpoint — nhận callback khi QR được thanh toán |
| `bridge_config.json` | Cấu hình Bridge: COM port, timeout, retry, log level |
| `start_hpcs.ps1` | PowerShell script khởi động Bridge (background) + Uvicorn (foreground) cùng lúc |

#### Routers
| File | Công dụng |
|---|---|
| `routers/gate_router.py` | `POST /api/gate/entry` và `/exit` — xử lý xe vào/ra: RFID → OCR → DB → barrier |
| `routers/students.py` | CRUD sinh viên, xem số dư, nạp tiền |
| `routers/users.py` | Đăng nhập guard/admin |

#### Payment Strategy Pattern
| File | Công dụng |
|---|---|
| `payment/base.py` | Abstract class `PaymentStrategy` |
| `payment/student_bank.py` | Luồng sinh viên: tự động trừ số dư tài khoản |
| `payment/guest_qr.py` | Luồng khách VietQR: tạo PayOS invoice → chờ XGate xác nhận |
| `payment/guest_cash.py` | Luồng khách tiền mặt: guard xác nhận thủ công → mở cổng |

#### Bridge (`bridge/`) — chạy độc lập với Uvicorn
| File | Công dụng |
|---|---|
| `bridge/__main__.py` | Entry point: `python -m bridge` — parse CLI args, khởi động 2 thread |
| `bridge/gate_controller.py` | Thread 1: đọc Serial ESP32 (IN:{UID}, OUT:{UID}) → gọi ApiAdapter |
| `bridge/api_adapter.py` | Gọi FastAPI `/api/gate/entry|exit` — xử lý response → trả `GateDecision` |
| `bridge/serial_manager.py` | Quản lý kết nối COM: auto-reconnect khi mất kết nối |
| `bridge/config.py` | Load `bridge_config.json` + apply CLI overrides |

#### Camera & Utils
| File | Công dụng |
|---|---|
| `camera/scanner.py` | EasyOCR + OpenCV ALPR: nhận base64 ảnh → trả `plate_number` (hoặc stub khi CAMERA_ENABLED=false) |
| `utils/image_store.py` | Lưu ảnh biển số vào `static/plates/entry|exit/` — trả đường dẫn tương đối |

---

### 🟧 Database (`database/`)

| File | Công dụng |
|---|---|
| `database/schema_v2.sql` | Schema đầy đủ hiện tại — chạy file này để tạo DB từ đầu |
| `migrations/2026-04-13_payments_compat.sql` | Thêm cột `xgate_reference` vào bảng payments |
| `migrations/2026-05-10_add_balance.sql` | Thêm cột `balance` vào bảng students |
| `migrations/2026-05-10_image_path_columns.sql` | Thêm cột `entry_plate_image`, `exit_plate_image` vào parking_sessions |
| `migrations/2026-05-10_restructure_students.sql` | Đổi cấu trúc bảng students (tách `rfid_card_code` riêng) |

> **Lưu ý:** Migration chỉ cần chạy nếu bạn đang **nâng cấp DB cũ**.
> Nếu tạo DB mới từ đầu → chỉ cần chạy `schema_v2.sql` là đủ.

---

### 🔵 Luồng dữ liệu tóm tắt

```
ESP32 Serial
  └─► bridge/gate_controller.py  (Thread 1, đọc serial)
        └─► bridge/api_adapter.py (HTTP POST → FastAPI)
              └─► routers/gate_router.py
                    ├─► camera/scanner.py  (OCR biển số)
                    ├─► payment/ (Strategy Pattern)
                    └─► DB (ParkingSession)

Guest QR Payment:
  PayOS QR → Khách chuyển khoản → XGate poll ngân hàng
    └─► payment-sync.ts → match invoice → PAID → OPEN-OUT signal
```
