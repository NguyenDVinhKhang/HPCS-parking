# Hybrid Parking Control System (HPCS) - Tài liệu kỹ thuật

> Tài liệu cấu trúc và vận hành cho team phát triển.

Toàn bộ tài liệu thanh toán và XGate được gom tại mục `=================THANH TOÁN====================` ở cuối file.

## Tech Stack

| Công nghệ | Mục đích |
|---|---|
| Next.js 16 (App Router) | Full-stack web framework |
| React 19 + TypeScript | Frontend và type safety |
| Tailwind CSS v4 + shadcn/ui | UI system |
| MariaDB (mysql2) | Cơ sở dữ liệu nghiệp vụ |
| NextAuth v5 (Credentials + JWT) | Xác thực và phân quyền |
| Python / FastAPI | Service nhận diện biển số |

## Cấu trúc thư mục chính

```
.
├── database/
│   ├── init.sql                        # Schema + seed user admin
│   └── migrations/
│       └── 2026-04-13_payments_compat.sql
├── backend/
│   ├── main.py                         # API Python cho nhận diện biển số
│   └── camera/scanner.py
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout + bootstrap scheduler sync
│   │   ├── page.tsx                    # Dashboard tổng quan
│   │   ├── (auth)/login/page.tsx
│   │   ├── (main)/
│   │   │   ├── vehicles/
│   │   │   ├── parking-slots/
│   │   │   ├── history/
│   │   │   ├── camera/
│   │   │   └── transactions/           # Trang thống kê doanh thu + set giá
│   │   ├── (pay)/payment/page.tsx      # Trang QR/payment demo đơn giản
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── vehicles/route.ts
│   │       ├── parking-slots/route.ts
│   │       ├── history/route.ts
│   │       ├── camera/route.ts
│   │       ├── dashboard/overview/route.ts
│   │       ├── reports/revenue/route.ts
│   │       ├── parking-rates/route.ts
│   │       └── payments/
│   │           ├── route.ts
│   │           ├── gate/route.ts
│   │           ├── reconcile/route.ts
│   │           └── sync/route.ts
│   ├── components/
│   ├── lib/
│   │   ├── db.ts
│   │   ├── reports.ts
│   │   ├── payments.ts
│   │   ├── xgate.ts
│   │   ├── payment-sync.ts
│   │   └── payment-sync-scheduler.ts
│   ├── auth.ts
│   └── proxy.ts                        # Bảo vệ route + RBAC API
└── public/
```

## Database model

Ngoài các bảng cũ (`users`, `vehicles`, `parking_slots`, `history`, `cameras`), hệ thống hiện có thêm:

- `parking_rates`: cấu hình giá theo loại xe (`vehicle_type`, `unit_price`, `is_active`)
- `payments`: lưu hóa đơn thanh toán (chi tiết trạng thái và đối soát xem mục THANH TOÁN)

Ghi chú thiết kế hiện tại:

- Không sử dụng bảng `transactions` riêng cho thống kê.
- Không dùng `payment_sync_logs` hoặc `payment_sync_state`.
- Thống kê lưu lượng lấy từ bảng `history`.

## API chính

### Core APIs

- `GET/POST /api/vehicles`
- `GET/POST/PATCH/DELETE /api/parking-slots`
- `GET/POST /api/history`
- `GET /api/camera` (bridge sang Python backend)

### Dashboard và báo cáo

- `GET /api/dashboard/overview`
	- Trả về KPI dashboard, recent history events, camera/system status.

- `GET /api/reports/revenue?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`
	- Trả về revenue timeseries, status distribution, traffic series, totals, parking rates.

### Ghi chú

- Toàn bộ API, logic và vận hành liên quan thanh toán/XGate: xem mục THANH TOÁN ở cuối tài liệu.

## Auth và RBAC

- Auth dùng NextAuth Credentials ở `src/auth.ts`.
- Route guard nằm tại `src/proxy.ts`.
- Với request chưa đăng nhập:
	- Route web: redirect về `/login`.
	- Route API: trả JSON `401 Unauthorized`.
- Danh sách API cần quyền `admin` theo từng nghiệp vụ được ghi tại mục chức năng tương ứng.

## Biến môi trường

```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=parking_management

# NextAuth
AUTH_SECRET=replace-with-secure-random-string

# Python backend scanner
PYTHON_API_URL=http://localhost:8000
```

Biến môi trường cho XGate và VietQR được ghi tập trung tại mục THANH TOÁN.

## Setup development

### 1) Cài dependencies

```bash
npm install
```

### 2) Khởi tạo hoặc nâng cấp database

Khởi tạo mới:

```bash
mysql -u root -p < database/init.sql
```

Nếu DB đã tồn tại từ phiên bản cũ, cần đảm bảo có đủ bảng/cột mới (`parking_rates`, `payments`, `payments.synced_at`) trước khi chạy tính năng payment sync.

Có thể chạy migration compatibility:

```bash
mysql -u root -p parking_management < database/migrations/2026-04-13_payments_compat.sql
```

Nếu DB chạy trong Docker (ví dụ container `hpcs-mariadb`):

```bash
Get-Content database/migrations/2026-04-13_payments_compat.sql | docker exec -i hpcs-mariadb mariadb -uroot -proot parking_management
```

### 3) Chạy web app

```bash
npm run dev
```

### 4) Chạy Python backend (camera scanner)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## Validation trước khi merge

```bash
npm run lint
npm run build
```
=================THANH TOÁN====================

## Tài liệu thanh toán (chuẩn dùng cho team)

Toàn bộ logic và hướng dẫn liên quan đến thanh toán được chuẩn hóa trong phần này.
Tài liệu luồng chi tiết nâng cao: xem `PAYMENT_FLOW.md`.

### 1) Mục tiêu nghiệp vụ

- Tạo hóa đơn thanh toán cho lượt xe theo đúng loại xe và đơn giá đang active trong `parking_rates`.
- Sinh QR chuyển khoản thật (VietQR) để người dùng quét thanh toán.
- Đối soát giao dịch chuyển khoản qua XGate để cập nhật trạng thái hóa đơn theo thời gian thực.
- Cung cấp API thống nhất cho team nhận diện biển số để tạo hóa đơn và xác minh mở cổng.

### 2) Luồng chuẩn trên trang `/payment`

1. Người dùng chọn loại xe từ dữ liệu thật trong DB (`parking_rates`).
2. Frontend gọi `POST /api/payments` để tạo hóa đơn trạng thái `pending`.
3. Backend trả về thông tin hóa đơn kèm `paymentQr` (URL QR thật).
4. UI hiển thị QR, đợi 10 giây, sau đó tự đối soát mỗi 5 giây bằng `POST /api/payments/reconcile`.
5. Khi hóa đơn chuyển `paid`, UI hiển thị popup thành công và tự tắt sau khoảng 5 giây (vẫn cho phép đóng tay).

### 3) Logic đối soát XGate

- Chỉ xử lý các hóa đơn đang `pending`.
- Điều kiện match: nội dung giao dịch chuyển khoản chứa `invoice_number`.
- Khi match thành công, cập nhật các trường:
	- `status = paid`
	- `paid_at`
	- `synced_at`
	- `xgate_reference`
	- `matched_content`
- Giới hạn bắt buộc theo gói XGate:
	- Tối đa 5 request/phút.
	- Tối đa 50 giao dịch/trang.

### 4) API thanh toán cần dùng

- `GET /api/payments?limit=20`
- `GET /api/payments?invoice_number=HPCS-...`

- `POST /api/payments`
	- Tạo hóa đơn thanh toán.
	- Nếu không truyền `amount`, backend tự lấy giá active theo `vehicleType`.

- `POST /api/payments/reconcile`
	- Đối soát theo từng `invoiceNumber`, dùng cho trang `/payment`.

- `POST /api/payments/sync`
	- Trigger đối soát thủ công (thường dùng cho admin hoặc tác vụ vận hành).

- `POST /api/payments/gate`
	- `action=create`: tạo hóa đơn từ `plateNumber` + `vehicleType`.
	- `action=verify`: kiểm tra hóa đơn đã `paid` chưa để quyết định mở cổng (`allowPass`).

- `GET /api/parking-rates`
- `PATCH /api/parking-rates`
	- Cập nhật loạt đơn giá.
	- Yêu cầu quyền `admin`.

RBAC liên quan thanh toán:

- `POST /api/payments/sync`: yêu cầu quyền `admin`.

### 5) Hướng dẫn team nhận diện biển số (ANPR)

Luồng chuẩn:

- `create` -> hiển thị QR thanh toán -> `verify` -> nếu `allowPass=true` thì mở cổng.
- Nếu `vehicleType` chưa có giá active trong `parking_rates`, API trả `400` để yêu cầu cấu hình giá trước.

Mẫu tạo payment từ biển số:

```json
{
	"action": "create",
	"plateNumber": "30A12345",
	"vehicleType": "car",
	"paymentMethod": "bank_transfer"
}
```

Mẫu verify để quyết định cho xe qua:

```json
{
	"action": "verify",
	"invoiceNumber": "HPCS-20260413-123000-1234",
	"plateNumber": "30A12345"
}
```

Kết quả cần dùng để mở cổng:

- `data.allowPass = true` hoặc `data.decision = "ALLOW_PASS"` -> cho xe qua.
- `data.allowPass = false` -> chưa cho qua.

### 6) Cấu hình QR và XGate qua biến môi trường

```bash
# XGate
XGATE_API_KEY=your-xgate-api-key
XGATE_API_URL=https://xgate.vn/api/v1/transactions
XGATE_ACCOUNT=9394441571
XGATE_SYNC_ENABLED=false
XGATE_SYNC_INTERVAL_MS=300000
XGATE_MAX_REQUESTS_PER_RUN=1
XGATE_PAGE_LIMIT=50
XGATE_TYPE=in

# VietQR
PAYMENT_QR_BANK_CODE=mb
PAYMENT_QR_ACCOUNT_NUMBER=9394441571
PAYMENT_QR_ACCOUNT_NAME=LE VAN NHAT
PAYMENT_QR_TEMPLATE=compact2
```

### 7) Quy ước trạng thái thanh toán

- `pending`: đã tạo hóa đơn, chưa xác nhận thanh toán.
- `paid`: đã match giao dịch và xác nhận thanh toán thành công.
- `failed`: thanh toán lỗi hoặc hủy theo nghiệp vụ.

### 8) Nguồn triển khai và nguyên tắc đồng bộ

Nguồn triển khai:

- `src/lib/xgate.ts`: gọi API XGate và normalize payload.
- `src/lib/payment-sync.ts`: đối soát payment pending.
- `src/lib/payment-sync-scheduler.ts`: scheduler định kỳ.

Nguyên tắc:

- Giới hạn gọi XGate tối đa `5 requests/phút` (rate limit cục bộ process).
- Chỉ cập nhật payment đang `pending`.
- Khi match thành công: cập nhật `status=paid`, `paid_at`, `synced_at`, `xgate_reference`, `matched_content`.
- Scheduler bootstrap tại `src/app/layout.tsx`.
- Scheduler không chạy trong phase build production để tránh side effect build-time.

### 9) Checklist vận hành nhanh

- Đảm bảo có đơn giá active cho từng loại xe trong `parking_rates` trước khi tạo hóa đơn.
- Kiểm tra đúng tài khoản nhận tiền qua ENV (`XGATE_ACCOUNT`, `PAYMENT_QR_ACCOUNT_NUMBER`).
- Nếu cần đồng bộ nền định kỳ, bật `XGATE_SYNC_ENABLED=true` và cấu hình interval phù hợp.
- Team ANPR tích hợp chuẩn theo thứ tự: `create` -> hiển thị QR -> `verify` -> mở cổng khi `allowPass=true`.

=================END THANH TOÁN====================