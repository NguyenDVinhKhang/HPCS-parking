from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

# Trỏ ngược ra ngoài thư mục cha để lấy database và models
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import database, models

router = APIRouter(prefix="/api/users", tags=["Users"])

# ---- Khai báo cấu trúc JSON nhận từ Frontend ----
class VehicleCreate(BaseModel):
    plate_number: str

class UserCreate(BaseModel):
    full_name: str
    rfid_card_code: str
    role: str = "STUDENT"
    vehicles: List[VehicleCreate] = []

# ---- API: Đăng ký User và Biển số xe ----
@router.post("/register")
def register_user(user: UserCreate, db: Session = Depends(database.get_db)):
    """
    API dùng cho Admin đăng ký sinh viên mới. 
    Nhận vào tên, mã RFID và danh sách tối đa 3 biển số.
    """
    # 1. Kiểm tra RFID đã tồn tại chưa
    db_user = db.query(models.User).filter(models.User.rfid_card_code == user.rfid_card_code).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Mã thẻ RFID này đã được sử dụng!")
    
    # 2. Kiểm tra số lượng xe
    if len(user.vehicles) > 3:
        raise HTTPException(status_code=400, detail="Mỗi tài khoản chỉ được đăng ký tối đa 3 biển số xe!")

    # 3. Tạo User lưu vào DB
    new_user = models.User(
        full_name=user.full_name,
        rfid_card_code=user.rfid_card_code,
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user) # Để lấy lại ID UUID vừa sinh ra

    # 4. Thêm từng xe vào bảng Vehicles
    for v in user.vehicles:
        # Check biển số đã có chưa
        existing_vehicle = db.query(models.Vehicle).filter(models.Vehicle.plate_number == v.plate_number).first()
        if existing_vehicle:
            # Lỗi thì xóa User vừa tạo đi (Rollback thủ công)
            db.delete(new_user)
            db.commit()
            raise HTTPException(status_code=400, detail=f"Biển số {v.plate_number} đã được đăng ký trong hệ thống!")
            
        new_vehicle = models.Vehicle(
            user_id=new_user.id,
            plate_number=v.plate_number
        )
        db.add(new_vehicle)
    
    db.commit()

    return {
        "success": True, 
        "message": "Đăng ký thành công!", 
        "user_id": new_user.id
    }

# ---- API: Lấy danh sách tất cả user ----
@router.get("/")
def get_all_users(db: Session = Depends(database.get_db)):
    users = db.query(models.User).all()
    result = []
    for u in users:
        # Lấy danh sách biển số xe của user này
        user_vehicles = db.query(models.Vehicle).filter(models.Vehicle.user_id == u.id).all()
        plates = [v.plate_number for v in user_vehicles]
        
        result.append({
            "id": u.id,
            "full_name": u.full_name,
            "rfid_card_code": u.rfid_card_code,
            "role": u.role,
            "vehicles": plates
        })
    return result
