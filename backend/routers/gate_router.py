from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import re

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import database, models
from camera.scanner import camera_manager, scan_plate

router = APIRouter(prefix="/api/gate", tags=["Gate"])

class EntryRequest(BaseModel):
    rfid_code: str

@router.post("/entry")
def handle_entry(request: EntryRequest, db: Session = Depends(database.get_db)):
    """
    Xử lý xe vào: Nhận RFID -> Nhận diện AI -> So khớp -> Mở Barrier
    """
    rfid = request.rfid_code
    session_type = None
    
    # ==========================================
    # Bước 1: Phân loại thẻ (Sinh viên hay Guest)
    # ==========================================
    user = db.query(models.User).filter(models.User.rfid_card_code == rfid).first()
    if user:
        session_type = "STUDENT"
    else:
        guest_card = db.query(models.GuestCard).filter(models.GuestCard.rfid_card_code == rfid).first()
        if guest_card:
            if guest_card.status == "IN_USE":
                raise HTTPException(status_code=400, detail="Thẻ Guest này đang được sử dụng trong bãi, chưa được trả ra!")
            session_type = "GUEST"
        else:
            raise HTTPException(status_code=404, detail="Thẻ không hợp lệ (Không có trong hệ thống).")

    # ==========================================
    # Bước 2: Gọi AI quét biển số từ Camera
    # ==========================================
    base64_img = camera_manager.capture_frame()
    if not base64_img:
        raise HTTPException(status_code=500, detail="Lỗi Camera: Không thể lấy khung hình.")
    
    ocr_result = scan_plate(base64_img)
    plate_number = ocr_result["plate_number"]
    
    if not plate_number or plate_number == "Khong thay bien so":
         raise HTTPException(status_code=400, detail="Không nhìn rõ biển số, yêu cầu lùi xe lại.")

    # ==========================================
    # Bước 3: So khớp bảo mật (Dành riêng Sinh Viên)
    # ==========================================
    if session_type == "STUDENT":
        # Xóa các ký tự đặc biệt (dấu chấm, gạch ngang) để so sánh cho chuẩn xác
        clean_scanned_plate = re.sub(r'[^A-Z0-9]', '', plate_number.upper())
        
        user_vehicles = db.query(models.Vehicle).filter(models.Vehicle.user_id == user.id).all()
        matched = False
        
        for v in user_vehicles:
            clean_db_plate = re.sub(r'[^A-Z0-9]', '', v.plate_number.upper())
            if clean_scanned_plate == clean_db_plate:
                matched = True
                break
                
        if not matched:
            raise HTTPException(
                status_code=400, 
                detail=f"CẢNH BÁO: Biển số xe [{plate_number}] không khớp với danh sách xe của sinh viên [{user.full_name}]!"
            )

    # ==========================================
    # Bước 4: Lưu thông tin vào Database & Mở cổng
    # ==========================================
    # Nếu là khách, khóa thẻ này lại
    if session_type == "GUEST":
        guest_card.status = "IN_USE"
        db.commit()

    # Tạo phiên gửi xe mới
    new_session = models.ParkingSession(
        rfid_code=rfid,
        session_type=session_type,
        entry_plate_number=plate_number,
        entry_plate_image="", # Có thể lưu file ảnh vào ổ cứng ở đây nếu muốn
        status="OPEN"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return {
        "success": True,
        "message": f"Mở Barrier cổng VÀO thành công!",
        "session_id": new_session.session_id,
        "session_type": session_type,
        "plate_number": plate_number,
        "name": user.full_name if user else "Khách Vãng Lai"
    }

class ExitRequest(BaseModel):
    rfid_code: str

@router.post("/exit")
async def handle_exit(request: ExitRequest, db: Session = Depends(database.get_db)):
    """
    Xử lý xe ra: Nhận RFID -> So khớp lúc vào -> Xử lý thanh toán -> Mở Barrier
    """
    rfid = request.rfid_code
    
    # ==========================================
    # Bước 1: Tìm phiên gửi xe đang OPEN
    # ==========================================
    session = db.query(models.ParkingSession).filter(
        models.ParkingSession.rfid_code == rfid,
        models.ParkingSession.status == "OPEN"
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy xe trong bãi hoặc thẻ chưa được quẹt lúc vào!")

    # ==========================================
    # Bước 2: Gọi AI quét biển số lúc ra
    # ==========================================
    base64_img = camera_manager.capture_frame()
    if not base64_img:
        raise HTTPException(status_code=500, detail="Lỗi Camera: Không thể lấy khung hình.")
    
    ocr_result = scan_plate(base64_img)
    exit_plate = ocr_result["plate_number"]
    
    if not exit_plate or exit_plate == "Khong thay bien so":
         raise HTTPException(status_code=400, detail="Không nhìn rõ biển số, yêu cầu lùi xe lại.")

    # ==========================================
    # Bước 3: Đối chiếu biển số Vào - Ra
    # ==========================================
    clean_exit = re.sub(r'[^A-Z0-9]', '', exit_plate.upper())
    clean_entry = re.sub(r'[^A-Z0-9]', '', session.entry_plate_number.upper())

    if clean_exit != clean_entry:
        raise HTTPException(status_code=400, detail=f"CẢNH BÁO GIAN LẬN: Biển số lúc ra [{exit_plate}] không khớp với lúc vào [{session.entry_plate_number}]!")

    import datetime
    session.exit_plate_number = exit_plate
    session.exit_time = datetime.datetime.utcnow()

    # ==========================================
    # Bước 4: Xử lý thu phí tùy theo loại vé
    # ==========================================
    if session.session_type == "STUDENT":
        # Sinh viên: Trừ tiền tự động và đóng phiên
        session.fee_amount = 2000
        session.payment_method = "BANK_AUTO"
        session.status = "CLOSED"
        db.commit()

        return {
            "success": True,
            "message": "Trừ 2000 VND tự động thành công. Đã mở Barrier cổng RA!",
            "session_id": session.session_id,
            "fee": 2000,
            "payment": "BANK_AUTO",
            "barrier_open": True
        }

    elif session.session_type == "GUEST":
        # Khách vãng lai: Tạo QR Code qua PayOS
        session.fee_amount = 4000
        session.payment_method = "PENDING"
        # status vẫn giữ là OPEN chờ PayOS Webhook báo về mới CLOSED
        
        # Trả thẻ Guest về trạng thái RẢNH để bảo vệ đưa cho khách khác
        guest_card = db.query(models.GuestCard).filter(models.GuestCard.rfid_card_code == rfid).first()
        if guest_card:
            guest_card.status = "AVAILABLE"

        db.commit()

        # Gọi hàm tạo QR từ file payment.py
        from payment import create_guest_qr
        qr_data = await create_guest_qr(session_id=session.session_id, plate_number=exit_plate)

        return {
            "success": True,
            "message": "Vui lòng quét mã QR để thanh toán 4000 VND.",
            "session_id": session.session_id,
            "fee": 4000,
            "payment": "PENDING",
            "barrier_open": False,
            "qr_data": qr_data
        }
