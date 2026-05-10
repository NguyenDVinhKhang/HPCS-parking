# HPCS Parking System — Đặc tả & Tiến độ Triển khai

> Cập nhật lần cuối: 2026-05-10 23:55 (Phase 3 backend hoàn thành)
> File này được cập nhật song song với quá trình phát triển.

---

## Mục lục
1. [Kiến trúc hệ thống](#1-kiến-trúc-hệ-thống)
2. [Giao thức ESP32 ↔ Bridge](#2-giao-thức-esp32--bridge)
3. [Kiến trúc Layer Backend](#3-kiến-trúc-layer-backend)
4. [Cấu trúc thư mục thực tế](#4-cấu-trúc-thư-mục-thực-tế)
5. [Tiến độ triển khai](#5-tiến-độ-triển-khai)
6. [Luồng hoạt động đầy đủ](#6-luồng-hoạt-động-đầy-đủ)
7. [Môi trường Demo](#7-môi-trường-demo)
8. [Hướng dẫn chạy hệ thống](#8-hướng-dẫn-chạy-hệ-thống)
9. [Checklist Test](#9-checklist-test)

---

## 1. Kiến trúc hệ thống

```
┌──────────────────────────────────────────────────────────────────┐
│                    HPCS Parking System                           │
│                                                                  │
│  [ESP32 Hardware]                                                │
│   • RFID RC522 (quẹt thẻ)                                       │
│   • Servo (đóng/mở barrier)                                     │
│   • IR Sensor E18-D80NK (chống kẹp xe)                          │
│        │ USB Serial (COM9, 115200 baud)                          │
│        ▼                                                         │
│  [Python Bridge — backend/bridge/]          port 5001            │
│   • Thread 1: SerialManager + GateController  ┌──────────┐      │
│     (đọc serial, gọi API, gửi OPEN/DENIED)    │CMD Server│      │
│   • Thread 2: CommandServer (Flask)   ◄────── │POST /send│      │
│     (nhận lệnh từ backend, push ESP32)        └──────────┘      │
│        │ HTTP POST                                ▲              │
│        ▼                                          │              │
│  [FastAPI Backend — port 8000]                    │              │
│   • gate_router.py (HTTP only)                    │              │
│   • PAYMENT_REGISTRY (Strategy Pattern)           │              │
│   • Camera OCR (nhận diện biển số)                │              │
│   • payment.py (PayOS Webhook) ───────────────────┘              │
│        │                                                         │
│        ▼                                                         │
│  [MariaDB — parking_management]                                  │
│   • users     (username/password — Next.js login)                │
│   • students  (rfid_card_code, balance — FastAPI)                │
│   • vehicles  (biển số xe của SV)                                │
│   • guest_cards (thẻ trắng khách)                                │
│   • parking_sessions (OPEN → CLOSED)                             │
│        │                                                         │
│        ▼                                                         │
│  [Next.js Frontend — port 3000]                                  │
│   • Dashboard admin (quản lý thẻ, thống kê)                     │
│   • UI bảo vệ (hiển thị QR, xác nhận tiền mặt)                  │
│   • Kết nối trực tiếp MariaDB (NextAuth login)                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Giao thức ESP32 ↔ Bridge

### ESP32 → Bridge (serial output)
| Message | Ý nghĩa |
|---|---|
| `IN:{UID}` | Xe vào, quẹt thẻ |
| `OUT:{UID}` | Xe ra, quẹt thẻ |
| `STATUS:...` | Trạng thái barrier |
| `IR:...` | Trạng thái cảm biến hồng ngoại |
| `PONG` | Phản hồi PING heartbeat |
| `GATE_MODE:IN/OUT` | Xác nhận chế độ cổng |
| `TEST_MODE:ON/OFF` | Xác nhận chế độ test |

### Bridge → ESP32 (serial input)
| Lệnh | Kết quả |
|---|---|
| `OPEN-IN` | Mở barrier cổng vào |
| `OPEN-OUT` | Mở barrier cổng ra |
| `DENIED` | Từ chối, nháy đèn đỏ |
| `PING` | Heartbeat kiểm tra kết nối |
| `MODE:IN` / `MODE:OUT` | Đổi chế độ cổng |
| `TEST:OFF` | Tắt test mode (gửi khi bridge kết nối) |

### Bridge CommandServer HTTP (port 5001)
| Endpoint | Method | Mục đích | Ai gọi |
|---|---|---|---|
| `/send` | POST | Push lệnh xuống ESP32 | Backend sau thanh toán |
| `/health` | GET | Kiểm tra trạng thái bridge | Monitoring |

---

## 3. Kiến trúc Layer Backend

### Strategy + Adapter Pattern

```
Request HTTP
    │
    ▼
gate_router.py      ← CHỈ: nhận request, validate, trả response
    │
    ├── _capture_plate()         ← camera OCR với fallback UNKNOWN cho guest
    │
    ▼
PAYMENT_REGISTRY = {             ← dict lookup O(1), không if/elif
    "STUDENT"    → StudentBankPayment()
    "GUEST_QR"   → GuestQRPayment()
    "GUEST_CASH" → GuestCashPayment()
    # Thêm mới ở đây, không sửa gì khác
}
    │
    ▼
strategy.process(session, db)   ← interface chung PaymentStrategy
    │
    ▼
PaymentResult(success, barrier_open, message, extra)
    │
    ▼
models / database               ← lưu trữ
```

### Quy tắc thêm payment mới
```
1. Tạo payment/guest_momo.py kế thừa PaymentStrategy
2. Thêm "GUEST_MOMO": GuestMomoPayment() vào PAYMENT_REGISTRY
3. Bridge gửi request với method="MOMO" → tự động dùng strategy mới
→ KHÔNG sửa gì ở gate_router.py, gate_service.py hay bất kỳ file nào khác
```

---

## 4. Cấu trúc thư mục thực tế

```
backend/
├── bridge/                     ✅ HOÀN THÀNH (Phase 1 + 2D)
│   ├── __init__.py
│   ├── __main__.py             ← Entry point + CommandServer (Flask port 5001)
│   ├── config.py               ← BridgeConfig từ bridge_config.json
│   ├── api_adapter.py          ← Adapter bọc FastAPI endpoints
│   ├── serial_manager.py       ← Serial connect/reconnect/read/write
│   └── gate_controller.py      ← Parse serial → gọi API → gửi response
│
├── payment/                    ✅ HOÀN THÀNH (Phase 2B)
│   ├── __init__.py
│   ├── base.py                 ← PaymentResult + PaymentStrategy (abstract)
│   ├── student_bank.py         ← Trừ balance SV tự động
│   ├── guest_qr.py             ← Tạo QR PayOS, barrier_open=False
│   └── guest_cash.py           ← Thu tiền mặt, push OPEN-OUT qua bridge
│
├── routers/
│   ├── gate_router.py          ✅ REFACTORED (Phase 2C) — PAYMENT_REGISTRY
│   ├── students.py             ✅ MỚI (Phase 2C) — thay users.py
│   └── users.py                ⚠️ LEGACY — không dùng nữa (giữ để tham khảo)
│
├── database/
│   ├── init.sql                ⚠️ LEGACY (schema cũ, không dùng)
│   └── migrations/
│       ├── 2026-04-13_payments_compat.sql   (legacy)
│       ├── 2026-05-10_add_balance.sql       (superseded)
│       └── 2026-05-10_restructure_students.sql  ✅ DÙNG CÁI NÀY
│
├── bridge_config.json          ✅ HOÀN THÀNH
├── models.py                   ✅ REFACTORED (Student/Vehicle/GuestCard/ParkingSession)
├── database.py                 ✅ Giữ nguyên
├── main.py                     ✅ Cập nhật (dùng students router)
├── payment.py                  ✅ Cập nhật (PayOS webhook push OPEN-OUT)
├── requirements.txt            ✅ Thêm flask, pyserial
└── serial_bridge.py            ✅ Legacy/fallback (giữ nguyên)
```

---

## 5. Tiến độ triển khai

### ✅ Phase 1 — Bridge Modular (HOÀN THÀNH)
- [x] Tạo `bridge_config.json`
- [x] Tạo `bridge/__init__.py`
- [x] Tạo `bridge/config.py`
- [x] Tạo `bridge/api_adapter.py`
- [x] Tạo `bridge/serial_manager.py`
- [x] Tạo `bridge/gate_controller.py`
- [x] Tạo `bridge/__main__.py`
- [x] Verify: all modules import cleanly

### ✅ Phase 1.5 — Git Setup (HOÀN THÀNH)
- [x] Git init HPCS-main
- [x] Tạo `.gitignore`
- [x] Initial commit + push lên GitHub (HPCS-parking)

### ✅ Phase 2A — Database (HOÀN THÀNH)
- [x] Tạo `database/migrations/2026-05-10_restructure_students.sql`
- [x] Chạy migration trong phpMyAdmin → DB có đủ 5 bảng cần thiết
- [ ] Cập nhật rfid_card_code của 2 SV còn lại (khi có thẻ thật)
- [ ] Verify balance: `SELECT rfid_card_code, full_name, balance FROM students;`

### ✅ Phase 2B — Payment Module (HOÀN THÀNH)
- [x] Tạo `payment/__init__.py`
- [x] Tạo `payment/base.py` — `PaymentResult` + `PaymentStrategy` interface
- [x] Tạo `payment/student_bank.py` — trừ balance, đóng session, barrier=True
- [x] Tạo `payment/guest_cash.py` — tiền mặt, push OPEN-OUT qua bridge
- [x] Tạo `payment/guest_qr.py` — tạo QR PayOS, barrier=False, chờ webhook

### ✅ Phase 2C — Refactor Router + Models (HOÀN THÀNH)
- [x] Viết lại `models.py` — `Student`, `Vehicle`, `GuestCard`, `ParkingSession`
- [x] Tạo `routers/students.py` — thay `users.py`, có `/balance/{rfid}`, `/topup`
- [x] Cập nhật `main.py` — mount `students_router` thay `users_router`
- [x] Refactor `gate_router.py` — dùng `PAYMENT_REGISTRY` + `_capture_plate()`
- [x] Fix camera fallback: guest OCR fail → `UNKNOWN`, không crash
- [x] Fix lưu ảnh: `entry_plate_image` + `exit_plate_image` = `base64_img`

### ✅ Phase 2D — Bridge HTTP Push (HOÀN THÀNH)
- [x] Thêm `CommandServer` (Flask daemon thread) vào `bridge/__main__.py`
- [x] Endpoint `POST /send` — nhận lệnh, push xuống ESP32 qua serial
- [x] Endpoint `GET /health` — kiểm tra serial connected
- [x] Thêm `is_connected()` vào `SerialManager`
- [x] `payment.py` PayOS webhook push `OPEN-OUT` sau thanh toán thành công
- [x] Thêm `flask>=3.0.0` + `pyserial>=3.5` vào `requirements.txt`

### 🟡 Phase 3 — Demo UI & Wallet (BACKEND XONG, FRONTEND CHƯA LÀM)
- [x] API `/api/students/balance/{rfid}` — ✅ ĐÃ CÓ trong `students.py`
- [x] API `/api/students/topup` — ✅ ĐÃ CÓ trong `students.py`
- [x] `POST /api/gate/cash-confirm/{session_id}` — bảo vệ xác nhận tiền mặt + push OPEN-OUT
- [x] `POST /api/gate/manual-checkin` — bảo vệ tạo session thủ công + push OPEN-IN
- [ ] Trang web Next.js hiển thị balance 4 SV (dashboard)

### 🔵 Phase 4 — Demo Mode & Auto-detect (CHƯA LÀM)
- [ ] `CAMERA_ENABLED` flag — bypass OCR khi demo không có camera
- [ ] `POST /api/gate/scan` — auto-detect IN/OUT cho demo 1 ESP32

---

## 6. Luồng hoạt động đầy đủ

### Sinh viên vào
```
Quẹt thẻ SV → ESP32 → IN:{UID} → Bridge
    → POST /api/gate/entry {rfid_code}
    → Tra students DB → STUDENT
    → Camera OCR biển số → so khớp vehicles
    → Lưu entry_plate_image + ParkingSession(OPEN)
    → {barrier_open: true}
Bridge → OPEN-IN → ESP32 mở barrier ✅
```

### Sinh viên ra
```
Quẹt thẻ SV → ESP32 → OUT:{UID} → Bridge
    → POST /api/gate/exit {rfid_code, method:"QR"}
    → Tìm session OPEN
    → Camera OCR biển ra → so khớp biển vào/ra
    → PAYMENT_REGISTRY["STUDENT"] → StudentBankPayment.process()
       → Check balance >= 2000 → trừ 2000đ → session CLOSED
    → {barrier_open: true}
Bridge → OPEN-OUT → ESP32 mở barrier ✅
```

### Khách vào
```
Quẹt thẻ trắng → ESP32 → IN:{UID} → Bridge
    → POST /api/gate/entry {rfid_code}
    → Tra guest_cards → GUEST, AVAILABLE
    → Camera OCR → OK hoặc UNKNOWN (không crash)
    → guest_card.status = IN_USE + ParkingSession(OPEN)
    → {barrier_open: true}
Bridge → OPEN-IN → ESP32 mở barrier ✅
```

### Khách ra — Tiền mặt
```
Quẹt thẻ trắng → ESP32 → OUT:{UID} → Bridge
    → POST /api/gate/exit {rfid_code, method:"CASH"}
    → PAYMENT_REGISTRY["GUEST_CASH"] → GuestCashPayment.process()
       → session CLOSED + POST localhost:5001/send {cmd:"OPEN-OUT"}
CommandServer (thread 2) → serial.send("OPEN-OUT") → ESP32 mở barrier ✅
```

### Khách ra — QR PayOS
```
Quẹt thẻ trắng → ESP32 → OUT:{UID} → Bridge
    → POST /api/gate/exit {rfid_code, method:"QR"}
    → PAYMENT_REGISTRY["GUEST_QR"] → GuestQRPayment.process()
       → Tạo QR PayOS → session PENDING
    → {barrier_open: false}
Bridge → DENIED → ESP32 nháy đỏ
UI hiển thị QR → Khách quét → PayOS gọi POST /api/payment/webhook
    → session CLOSED + POST localhost:5001/send {cmd:"OPEN-OUT"}
CommandServer (thread 2) → serial.send("OPEN-OUT") → ESP32 mở barrier ✅
```

---

## 7. Môi trường Demo

### Vấn đề khi demo & giải pháp
| Vấn đề | Giải pháp hiện tại |
|---|---|
| Camera offline | Fix: guest OCR fail → UNKNOWN (không crash). SV vẫn cần camera |
| Balance SV hết | `POST /api/students/topup?rfid_code=X&amount=50000` |
| Thêm payment mới | Thêm 1 file + 1 dòng PAYMENT_REGISTRY |
| Bridge mất kết nối | SerialManager tự reconnect sau `reconnect_delay_s` giây |

### Seed data mặc định (đã chạy)
| rfid_card_code | Tên | Balance |
|---|---|---|
| `698D2B3F` | Sinh Viên 1 | 50,000đ |
| `04B13910030180` | Sinh Viên 2 | 50,000đ |
| `GUEST_01`, `GUEST_02`, `GUEST_03` | Thẻ khách | AVAILABLE |

---

## 8. Hướng dẫn chạy hệ thống

### Thứ tự khởi động
```bash
# 1. Database
# Mở XAMPP → Start MySQL

# 2. Frontend (Next.js — port 3000)
cd E:\Data\Work\Capstone1_Test\Document\HPCS-main
npm run dev

# 3. Backend AI (FastAPI — port 8000)
cd E:\Data\Work\Capstone1_Test\Document\HPCS-main\backend
venv\Scripts\activate
pip install -r requirements.txt       # lần đầu hoặc sau khi thêm package
uvicorn main:app --reload --port 8000

# 4. Bridge (sau khi cắm ESP32)
cd E:\Data\Work\Capstone1_Test\Document\HPCS-main\backend
python -m bridge --port COM9
# Bridge sẽ tự khởi động CommandServer trên port 5001
```

### API Endpoints đã có
| Endpoint | Method | Trạng thái | Mô tả |
|---|---|---|---|
| `/api/gate/entry` | POST | ✅ | Xe vào (RFID) |
| `/api/gate/exit` | POST | ✅ | Xe ra (RFID + method=QR/CASH) |
| `/api/students/` | GET | ✅ | Danh sách sinh viên |
| `/api/students/register` | POST | ✅ | Đăng ký sinh viên mới |
| `/api/students/balance/{rfid}` | GET | ✅ | Xem số dư theo RFID |
| `/api/students/topup` | POST | ✅ | Nạp tiền demo |
| `/api/payment/guest/create-qr` | POST | ✅ | Tạo QR PayOS |
| `/api/payment/webhook` | POST | ✅ | PayOS callback |
| `/api/payment/status/{id}` | GET | ✅ | Polling trạng thái thanh toán |
| `localhost:5001/send` | POST | ✅ | Bridge: push lệnh ESP32 |
| `localhost:5001/health` | GET | ✅ | Bridge: health check |

### API chưa có
| Endpoint | Phase |
|---|---|
| `POST /api/payment/cash-confirm/{id}` | Phase 3 |
| `POST /api/gate/manual-checkin` | Phase 3 |
| `POST /api/gate/scan` | Phase 4 |

---

## 9. Checklist Test

### Test Backend API (không cần ESP32)
```bash
# Khởi động backend
cd backend && uvicorn main:app --reload --port 8000
# Mở http://localhost:8000/docs (Swagger UI)
```

- [ ] **T1** — `GET /api/students/` → thấy 2 SV với balance=50000
- [ ] **T2** — `GET /api/students/balance/698D2B3F` → `{"balance": 50000}`
- [ ] **T3** — `POST /api/gate/entry {"rfid_code": "698D2B3F"}` → success (nếu camera online) hoặc lỗi 500 camera
- [ ] **T4** — `POST /api/gate/entry {"rfid_code": "GUEST_01"}` → success, plate=UNKNOWN (nếu camera offline)
- [ ] **T5** — `POST /api/students/topup?rfid_code=698D2B3F&amount=10000` → balance tăng thêm 10000
- [ ] **T6** — `POST /api/gate/exit {"rfid_code": "698D2B3F", "method": "QR"}` → barrier_open:true, balance giảm 2000
- [ ] **T7** — `POST localhost:5001/send {"cmd": "OPEN-OUT"}` → `{"ok": true}` (cần bridge đang chạy)

### Test Bridge (cần ESP32 cắm)
- [ ] **B1** — Chạy `python -m bridge --port COM9` → thấy log kết nối thành công
- [ ] **B2** — Serial Monitor ESP32 thấy `TEST_MODE:OFF` và `GATE_MODE:IN`
- [ ] **B3** — Quẹt thẻ SV → log bridge thấy `IN:698D2B3F` → API OK → ESP32 mở barrier
- [ ] **B4** — Rút USB → bridge log reconnect attempt → cắm lại → tự reconnect

### Test toàn hệ thống
- [ ] **E2E-1** — SV vào → ra → balance giảm đúng 2000đ
- [ ] **E2E-2** — Khách vào → ra tiền mặt → barrier mở
- [ ] **E2E-3** — Khách vào → ra QR → quét QR → barrier mở (cần PayOS)

---

*File này được cập nhật cùng với tiến trình phát triển.*
