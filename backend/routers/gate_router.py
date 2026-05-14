"""
gate_router.py — HTTP endpoints cho cổng vào/ra
=================================================
Router này CHỈ làm 3 việc:
  1. Nhận HTTP request, validate dữ liệu
  2. Gọi logic nghiệp vụ (camera, DB, payment)
  3. Trả HTTP response

Toàn bộ logic payment nằm trong payment/ package.
Để thêm phương thức thanh toán mới → chỉ cần thêm vào PAYMENT_REGISTRY.
Không cần sửa bất kỳ dòng nào trong file này.

─────────────────────────────────────────────────────────
HOW PAYMENT_REGISTRY WORKS (đọc trước khi sửa file này):

  PAYMENT_REGISTRY = {
      "STUDENT":    StudentBankPayment(),   ← key → strategy object
      "GUEST_QR":   GuestQRPayment(),
      "GUEST_CASH": GuestCashPayment(),
  }

  strategy = PAYMENT_REGISTRY["STUDENT"]   ← lấy strategy theo key
  result   = await strategy.process(session, db)  ← gọi interface chung

  Muốn thêm Momo:
    1. Tạo payment/guest_momo.py kế thừa PaymentStrategy
    2. Thêm 1 dòng: PAYMENT_REGISTRY["GUEST_MOMO"] = GuestMomoPayment()
    3. Xong — không sửa gì ở đây cả

  Muốn đổi phí SV từ 2000 → 3000:
    → Sửa FEE trong payment/student_bank.py
    → Không sửa file này

─────────────────────────────────────────────────────────
"""
import re
import datetime
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

import database
import models
from camera.scanner import camera_manager, scan_plate, _CAMERA_ENABLED
from payment.student_bank import StudentBankPayment
from payment.guest_qr import GuestQRPayment
from payment.guest_cash import GuestCashPayment
from utils.image_store import save_plate_image

router = APIRouter(prefix="/api/gate", tags=["Gate"])

# ─────────────────────────────────────────────────────────────
#  PAYMENT_REGISTRY
#  ─────────────────
#  Dict ánh xạ: strategy_key (string) → strategy object
#
#  Quy tắc đặt key:
#    "STUDENT"     → SV (mọi SV dùng 1 strategy)
#    "GUEST_QR"    → Khách thanh toán QR PayOS
#    "GUEST_CASH"  → Khách thanh toán tiền mặt
#    "GUEST_MOMO"  → (ví dụ tương lai) Khách thanh toán Momo
#
#  Bridge gửi request với field "method": "QR" | "CASH" | "MOMO"
#  Router ghép thành key: f"GUEST_{method.upper()}"
# ─────────────────────────────────────────────────────────────
PAYMENT_REGISTRY = {
    "STUDENT":    StudentBankPayment(),
    "GUEST_QR":   GuestQRPayment(),
    "GUEST_CASH": GuestCashPayment(),
    # Thêm mới ở đây — không cần sửa gì khác:
    # "GUEST_MOMO": GuestMomoPayment(),
}
#  POST /api/gate/entry — Xe vào
# ─────────────────────────────────────────────────────────────
class EntryRequest(BaseModel):
    rfid_code: str

@router.post("/entry")
def handle_entry(request: EntryRequest, db: Session = Depends(database.get_db)):
    """
    MODE 1 — CAMERA_ENABLED=true (triển khai thực tế):
      - Thẻ SV : OCR biển số → kiểm tra UID + biển trong DB → đúng → mở | sai → từ chối
      - Thẻ trắng (có trong DB, AVAILABLE) : cho vào không cần kiểm biển
      - Thẻ trắng (không có trong DB)         : từ chối

    MODE 2 — CAMERA_ENABLED=false (demo, không có camera):
      - Thẻ SV  : kiểm tra UID trong DB → có → mở (không kiểm biển)
      - Thẻ trắng (có trong DB) : cho vào
      - Thẻ không có trong DB    : từ chối
    """
    rfid       = request.rfid_code
    student    = None
    guest_card = None

    # ── Bước 1: Phân loại thẻ ──────────────────────────────────
    student = db.query(models.Student).filter(
        models.Student.rfid_card_code == rfid
    ).first()

    if student:
        session_type = "STUDENT"
    else:
        guest_card = db.query(models.GuestCard).filter(
            models.GuestCard.rfid_card_code == rfid
        ).first()
        if not guest_card:
            raise HTTPException(status_code=404,
                detail="Thẻ không hợp lệ — không có trong hệ thống.")
        if guest_card.status == "IN_USE":
            raise HTTPException(status_code=400,
                detail="Thẻ khách này đang được sử dụng trong bãi!")
        session_type = "GUEST"

    # ── Bước 2+3: Camera OCR ──────────────────────────────────────
    plate_number = "UNKNOWN"
    base64_img   = None

    if _CAMERA_ENABLED:
        # Camera bật: chụp ảnh cho TẤT CẢ loại thẻ (SV + khách)
        base64_img = camera_manager.capture_frame()

        if base64_img:
            result       = scan_plate(base64_img)
            plate_number = result.get("plate_number", "")
            if not plate_number or plate_number in ("Khong thay bien so", "KHÔNG THẤY BIỂN SỐ"):
                plate_number = "UNKNOWN"

        if session_type == "STUDENT":
            # SV: bắt buộc đọc được biển và khớp với xe đăng ký
            if not base64_img:
                raise HTTPException(status_code=500,
                    detail="Lỗi Camera: Không lấy được hình ảnh.")
            if plate_number == "UNKNOWN":
                raise HTTPException(status_code=400,
                    detail="Không nhìn rõ biển số — yêu cầu lùi xe lại.")

            clean_scan = re.sub(r'[^A-Z0-9]', '', plate_number.upper())
            vehicles   = db.query(models.Vehicle).filter(
                models.Vehicle.student_id == student.id
            ).all()
            matched = any(
                clean_scan == re.sub(r'[^A-Z0-9]', '', v.plate_number.upper())
                for v in vehicles
            )
            if not matched:
                raise HTTPException(status_code=400,
                    detail=f"CẢNH BÁO: Biển [{plate_number}] không khớp xe của SV [{student.full_name}]!")

        # GUEST: chụp + lưu biển số để tra cứu — KHÔNG cần khớp (thẻ trắng không có xe đăng ký)

    # MODE 2 (camera tắt): bỏ qua OCR cho tất cả thẻ — plate_number = "UNKNOWN"

    # ── Bước 4: Lưu DB & mở cổng ──────────────────────────────────
    if guest_card:
        guest_card.status = "IN_USE"

    entry_image_path = save_plate_image(base64_img, rfid, direction="entry")

    new_session = models.ParkingSession(
        rfid_code          = rfid,
        session_type       = session_type,
        entry_plate_number = plate_number,
        entry_plate_image  = entry_image_path,
        status             = "OPEN",
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    mode_label = "Camera ON" if _CAMERA_ENABLED else "Demo (Camera OFF)"
    return {
        "success":      True,
        "message":      f"Mở Barrier cổng VÀO thành công! [{mode_label}]",
        "session_id":   new_session.session_id,
        "session_type": session_type,
        "plate_number": plate_number,
        "name":         student.full_name if student else "Khách Vãng Lai",
        "barrier_open": True,
        "image_path":   entry_image_path,
        "camera_mode":  _CAMERA_ENABLED,
    }


# ─────────────────────────────────────────────────────────────
#  POST /api/gate/exit — Xe ra
# ─────────────────────────────────────────────────────────────
class ExitRequest(BaseModel):
    rfid_code: str
    method: str = "QR"   # "QR" | "CASH" — phương thức thanh toán khách

@router.post("/exit")
async def handle_exit(request: ExitRequest, db: Session = Depends(database.get_db)):
    """
    Luồng xe ra:
      1. Tìm phiên OPEN
      2. Camera OCR biển ra
      3. So khớp biển vào/ra (chỉ SV và guest biết biển)
      4. Chọn PaymentStrategy từ PAYMENT_REGISTRY
      5. Gọi strategy.process() → PaymentResult
      6. Trả response chuẩn

    Để thêm phương thức thanh toán mới:
      → Thêm vào PAYMENT_REGISTRY ở trên, không sửa gì ở đây.
    """
    rfid   = request.rfid_code
    method = request.method.upper()   # "QR" | "CASH"

    # ── Bước 1: Tìm phiên OPEN ───────────────────────────────
    session = db.query(models.ParkingSession).filter(
        models.ParkingSession.rfid_code == rfid,
        models.ParkingSession.status    == "OPEN",
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy xe trong bãi!")

    # ── Bước 2: Camera OCR biển ra ────────────────────────────
    base64_img, exit_plate = _capture_plate(session.session_type)

    # ── Bước 3: So khớp biển vào/ra ──────────────────────────
    if (session.session_type == "STUDENT"
            and session.entry_plate_number
            and session.entry_plate_number != "UNKNOWN"):
        clean_exit  = re.sub(r'[^A-Z0-9]', '', exit_plate.upper())
        clean_entry = re.sub(r'[^A-Z0-9]', '', session.entry_plate_number.upper())
        if exit_plate != "UNKNOWN" and clean_exit != clean_entry:
            raise HTTPException(
                status_code=400,
                detail=f"CẢNH BÁO GIAN LẬN: Biển ra [{exit_plate}] ≠ Biển vào [{session.entry_plate_number}]!"
            )

    # Lưu ảnh ra ra file, DB chỉ lưu đường dẫn
    exit_image_path = save_plate_image(base64_img, rfid, direction="exit")

    # Cập nhật thông tin ra vào session
    session.exit_plate_number = exit_plate
    session.exit_plate_image  = exit_image_path   # "plates/exit/20260510_224500_X.jpg"
    session.exit_time         = datetime.datetime.utcnow()

    # ── Bước 4+5: Chọn strategy & xử lý thanh toán ───────────
    #
    #  Đây là toàn bộ logic chọn payment — CHỈ 3 DÒNG:
    #    - Ghép key từ loại session + method của request
    #    - Lấy strategy từ registry (dict lookup — O(1))
    #    - Gọi process() — interface chung, không biết bên trong làm gì
    #
    if session.session_type == "STUDENT":
        strategy_key = "STUDENT"
    else:
        strategy_key = f"GUEST_{method}"   # "GUEST_QR" | "GUEST_CASH"

    strategy = PAYMENT_REGISTRY.get(strategy_key)
    if not strategy:
        raise HTTPException(
            status_code=400,
            detail=f"Phương thức thanh toán không hợp lệ: {strategy_key}. "
                   f"Các phương thức hỗ trợ: {list(PAYMENT_REGISTRY.keys())}"
        )

    result = await strategy.process(session, db)

    # ── Bước 6: Trả response chuẩn ───────────────────────────
    return {
        "success":      result.success,
        "barrier_open": result.barrier_open,
        "message":      result.message,
        "session_id":   session.session_id,
        **result.extra,   # fee, remaining, qr_data... tùy strategy
    }


# ─────────────────────────────────────────────────────────────
#  POST /api/gate/cash-confirm/{session_id}
#  Bảo vệ xác nhận khách đã trả tiền mặt → đóng session + mở barrier
#
#  Dùng khi:
#    - Khách ra, chọn phương thức CASH
#    - Bảo vệ nhận tiền mặt → bấm nút "Xác nhận" trên dashboard
#    - Backend đóng session và push OPEN-OUT xuống ESP32
#
#  Khác với /exit?method=CASH:
#    /exit        → bridge gọi tự động khi ESP32 nhận tín hiệu
#    /cash-confirm → người dùng (bảo vệ) gọi thủ công từ web UI
# ─────────────────────────────────────────────────────────────
GUEST_FEE    = 4000   # phí khách vãng lai (VND)
STUDENT_FEE  = 2000   # phí sinh viên (VND)
BRIDGE_URL   = "http://localhost:5001/send"

@router.post("/cash-confirm/{session_id}", tags=["Gate — Admin"])
def cash_confirm(session_id: int, db: Session = Depends(database.get_db)):
    """
    Bảo vệ xác nhận đã thu tiền mặt cho phiên xe.
    Đóng session + push OPEN-OUT xuống ESP32 qua bridge.

    Args:
        session_id: ID phiên gửi xe (lấy từ bảng parking_sessions)
    """
    import requests as http_req

    # ── Tìm phiên cần đóng ───────────────────────────────────
    session = db.query(models.ParkingSession).filter(
        models.ParkingSession.session_id == session_id,
        models.ParkingSession.status     == "OPEN",
    ).first()
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Không tìm thấy phiên #{session_id} đang mở. "
                   "Có thể đã đóng hoặc session_id sai."
        )

    # ── Tính phí theo loại thẻ ───────────────────────────────
    fee = STUDENT_FEE if session.session_type == "STUDENT" else GUEST_FEE

    # ── Đóng session ─────────────────────────────────────────
    session.fee_amount     = fee
    session.payment_method = "CASH"
    session.status         = "CLOSED"
    session.exit_time      = datetime.datetime.utcnow()

    # Nếu là khách → trả thẻ về AVAILABLE
    if session.session_type == "GUEST":
        guest_card = db.query(models.GuestCard).filter(
            models.GuestCard.rfid_card_code == session.rfid_code
        ).first()
        if guest_card:
            guest_card.status = "AVAILABLE"

    db.commit()

    # ── Push OPEN-OUT xuống ESP32 qua bridge ─────────────────
    bridge_ok = False
    try:
        resp = http_req.post(BRIDGE_URL, json={"cmd": "OPEN-OUT"}, timeout=3)
        bridge_ok = resp.ok
    except Exception:
        pass   # Bridge chưa chạy → barrier mở thủ công

    return {
        "success":     True,
        "message":     f"Phiên #{session_id} đã đóng. Barrier {'mở tự động' if bridge_ok else 'mở thủ công'}.",
        "session_id":  session_id,
        "fee":         fee,
        "bridge_open": bridge_ok,
    }


# ─────────────────────────────────────────────────────────────
#  POST /api/gate/manual-checkin
#  Bảo vệ tạo thủ công phiên xe vào khi RFID không quét được
#
#  Dùng khi:
#    - Thẻ RFID bị lỗi không đọc được
#    - Khách vào nhưng hệ thống không nhận tín hiệu
#    - Demo cần tạo session giả để test
#
#  Khác với /entry:
#    /entry         → bridge gọi tự động khi ESP32 nhận IN:{UID}
#    /manual-checkin → bảo vệ gọi thủ công từ web UI
# ─────────────────────────────────────────────────────────────
class ManualCheckinRequest(BaseModel):
    rfid_code:    str           # RFID thẻ SV hoặc thẻ khách
    plate_number: str = "UNKNOWN"   # biển số (nhập tay hoặc UNKNOWN)
    note:         str = ""          # ghi chú tùy chọn (vd: "Camera mờ")

@router.post("/manual-checkin", tags=["Gate — Admin"])
def manual_checkin(req: ManualCheckinRequest, db: Session = Depends(database.get_db)):
    """
    Bảo vệ tạo thủ công phiên xe vào.
    Hệ thống tự phân loại RFID (SV hay khách) và tạo session OPEN.
    Không cần camera — biển số nhập tay hoặc để UNKNOWN.

    Body:
        rfid_code:    mã thẻ RFID
        plate_number: biển số xe (mặc định UNKNOWN)
        note:         ghi chú (không bắt buộc)
    """
    import requests as http_req

    rfid = req.rfid_code

    # ── Kiểm tra xem xe này đã trong bãi chưa ────────────────
    existing = db.query(models.ParkingSession).filter(
        models.ParkingSession.rfid_code == rfid,
        models.ParkingSession.status    == "OPEN",
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Thẻ {rfid} đang có phiên mở (session #{existing.session_id}). "
                   "Không thể tạo phiên mới."
        )

    # ── Phân loại thẻ ────────────────────────────────────────
    student   = db.query(models.Student).filter(
        models.Student.rfid_card_code == rfid
    ).first()

    if student:
        session_type = "STUDENT"
        display_name = student.full_name
    else:
        guest_card = db.query(models.GuestCard).filter(
            models.GuestCard.rfid_card_code == rfid
        ).first()
        if not guest_card:
            raise HTTPException(
                status_code=404,
                detail=f"Thẻ {rfid} không có trong hệ thống (không phải SV, không phải thẻ khách)."
            )
        if guest_card.status == "IN_USE":
            raise HTTPException(
                status_code=400,
                detail=f"Thẻ khách {rfid} đang được sử dụng!"
            )
        guest_card.status = "IN_USE"
        session_type = "GUEST"
        display_name = "Khách Vãng Lai"

    # ── Tạo session ───────────────────────────────────────────
    new_session = models.ParkingSession(
        rfid_code          = rfid,
        session_type       = session_type,
        entry_plate_number = req.plate_number,
        entry_plate_image  = "",   # không có ảnh — nhập tay
        status             = "OPEN",
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    # ── Push OPEN-IN xuống ESP32 ─────────────────────────────
    bridge_ok = False
    try:
        resp = http_req.post(BRIDGE_URL, json={"cmd": "OPEN-IN"}, timeout=3)
        bridge_ok = resp.ok
    except Exception:
        pass

    return {
        "success":     True,
        "message":     f"Đã tạo phiên vào cho {display_name}. Barrier {'mở tự động' if bridge_ok else 'mở thủ công'}.",
        "session_id":  new_session.session_id,
        "session_type": session_type,
        "name":        display_name,
        "plate_number": req.plate_number,
        "bridge_open": bridge_ok,
        "note":        req.note,
    }

