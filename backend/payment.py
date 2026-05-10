"""
HPCS PayOS Payment Module
--------------------------
Xử lý tạo QR Code thanh toán động và nhận Webhook xác nhận thanh toán từ PayOS.
Dùng cho luồng Khách vãng lai (Guest) tại cổng ra - phí 4,000 VND.
"""

import os
import hmac
import hashlib
import json
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from payos import PayOS
from payos.types import ItemData, CreatePaymentLinkRequest
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/payment", tags=["Payment"])

# ─── Khởi tạo PayOS Client ───────────────────────────────────────────────────
payos_client = PayOS(
    client_id=os.getenv("PAYOS_CLIENT_ID"),
    api_key=os.getenv("PAYOS_API_KEY"),
    checksum_key=os.getenv("PAYOS_CHECKSUM_KEY"),
)

# ─── Lưu trạng thái thanh toán trong bộ nhớ (thay bằng DB sau) ──────────────
# key = order_code (session_id), value = "PENDING" | "PAID" | "CANCELLED"
_payment_status: dict[int, str] = {}


def get_payment_status(session_id: int) -> str:
    """Trả về trạng thái thanh toán của 1 phiên. Mặc định là PENDING."""
    return _payment_status.get(session_id, "PENDING")


# ─── API 1: Tạo QR Code thanh toán cho Khách vãng lai ───────────────────────
@router.post("/guest/create-qr")
async def create_guest_qr(session_id: int, plate_number: str):
    """
    Nhận session_id (từ DB phiên xe) và biển số xe.
    Trả về QR Code link và checkoutUrl để frontend hiển thị trên màn hình Kiosk.

    Gọi khi: Bảo vệ quẹt thẻ RFID Guest ở cổng ra và hệ thống cần hiển thị QR cho khách quét.
    """
    try:
        if _payment_status.get(session_id) == "PAID":
            raise HTTPException(status_code=400, detail="Phien nay da duoc thanh toan roi!")

        description = f"HPCS {session_id}"  # PayOS giới hạn 25 ký tự

        item = ItemData(
            name=f"Gui xe - Bien {plate_number}",
            quantity=1,
            price=4000
        )

        payment_data = CreatePaymentLinkRequest(
            orderCode=session_id,
            amount=4000,
            description=description,
            items=[item],
            cancelUrl="http://localhost:3000/payment/cancel",
            returnUrl="http://localhost:3000/payment/success",
        )

        response = payos_client.payment_requests.create(payment_data)
        _payment_status[session_id] = "PENDING"

        return {
            "status": "ok",
            "session_id": session_id,
            "plate_number": plate_number,
            "amount": 4000,
            "qr_code_url": response.qr_code,
            "checkout_url": response.checkout_url,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Loi tao QR PayOS: {str(e)}")


# ─── API 2: Webhook nhận xác nhận thanh toán từ PayOS ───────────────────────
@router.post("/webhook")
async def payos_webhook(request: Request):
    """
    PayOS tự động gọi API này mỗi khi có giao dịch thành công hoặc huỷ.
    Tự động đóng phiên và gửi lệnh mở Barrier khi thanh toán thành công.
    """
    try:
        body = await request.json()
        print(f"[PayOS Webhook] Nhan payload: {body}")

        # ── Xử lý PayOS test ping (gọi khi bạn bấm Lưu Webhook URL lần đầu) ──
        # PayOS gửi {"code": "00", "desc": "success", "data": null, "signature": "..."}
        # Chỉ cần trả 200 là PayOS xác nhận Webhook URL đang hoạt động.
        data = body.get("data")
        if not data:
            print("[PayOS Webhook] Test ping tu PayOS — xac nhan OK!")
            return JSONResponse(content={"success": True})

        # ── Bước 1: Xác thực chữ ký HMAC-SHA256 ─────────────────────────────
        received_signature = body.get("signature", "")
        checksum_key = os.getenv("PAYOS_CHECKSUM_KEY", "")

        # PayOS sort các field của data theo alphabet, nối thành key=value&...
        sorted_str = "&".join(
            f"{k}={v}" for k, v in sorted(data.items())
            if v is not None
        )

        expected_signature = hmac.new(
            checksum_key.encode("utf-8"),
            sorted_str.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

        if received_signature and received_signature != expected_signature:
            print(f"[PayOS Webhook] Chu ky khong khop!")
            # Trả 200 để PayOS không retry vô hạn
            return JSONResponse(content={"success": False, "reason": "invalid_signature"})

        # ── Bước 2: Đọc kết quả giao dịch ────────────────────────────────────
        order_code = data.get("orderCode")   # = session_id của xe
        payment_status = data.get("status")  # "PAID" hoặc "CANCELLED"

        print(f"[PayOS Webhook] Session {order_code} -> {payment_status}")

        if payment_status == "PAID":
            _payment_status[order_code] = "PAID"
            # TODO: Cập nhật DB ParkingSessions.status = 'CLOSED'
            # TODO: Kích Relay mở Barrier
            print(f"[BARRIER] Mo Barrier cho Session {order_code} tu dong!")

        elif payment_status == "CANCELLED":
            _payment_status[order_code] = "CANCELLED"
            print(f"[PayOS Webhook] Session {order_code} bi huy thanh toan.")

        return JSONResponse(content={"success": True})

    except Exception as e:
        print(f"[PayOS Webhook Error] {str(e)}")
        # Luôn trả 200 để PayOS không retry vô hạn
        return JSONResponse(content={"success": False, "error": str(e)})


# ─── API 3: Frontend polling kiểm tra trạng thái thanh toán ─────────────────
@router.get("/status/{session_id}")
async def check_payment_status(session_id: int):
    """
    Frontend Kiosk gọi API này mỗi 2 giây để biết khách đã quét mã QR chưa.
    Khi trả về "PAID", Frontend ẩn QR và hiển thị màn hình 'Cam on - Barrier dang mo'.
    """
    status = get_payment_status(session_id)
    return {
        "session_id": session_id,
        "payment_status": status,
        "barrier_open": status == "PAID"
    }
