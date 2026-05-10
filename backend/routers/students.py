from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import database, models

router = APIRouter(prefix="/api/students", tags=["Students"])

# ─── Request schemas ──────────────────────────────────────────
class VehicleCreate(BaseModel):
    plate_number: str

class StudentCreate(BaseModel):
    full_name: str
    rfid_card_code: str
    student_code: str = ""   # MSSV (tùy chọn)
    vehicles: List[VehicleCreate] = []

class StudentUpdate(BaseModel):
    full_name: str | None = None
    student_code: str | None = None
    balance: int | None = None

# ─── POST /api/students/register — Đăng ký sinh viên mới ─────
@router.post("/register")
def register_student(student: StudentCreate, db: Session = Depends(database.get_db)):
    """Admin đăng ký sinh viên mới: tên, mã RFID, MSSV, tối đa 3 biển số."""

    # Kiểm tra RFID đã tồn tại chưa
    existing = db.query(models.Student).filter(
        models.Student.rfid_card_code == student.rfid_card_code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mã thẻ RFID này đã được sử dụng!")

    if len(student.vehicles) > 3:
        raise HTTPException(status_code=400, detail="Mỗi sinh viên chỉ được đăng ký tối đa 3 biển số!")

    # Tạo sinh viên
    new_student = models.Student(
        full_name=student.full_name,
        rfid_card_code=student.rfid_card_code,
        student_code=student.student_code,
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    # Thêm từng xe
    for v in student.vehicles:
        existing_vehicle = db.query(models.Vehicle).filter(
            models.Vehicle.plate_number == v.plate_number
        ).first()
        if existing_vehicle:
            db.delete(new_student)
            db.commit()
            raise HTTPException(status_code=400, detail=f"Biển số {v.plate_number} đã được đăng ký!")

        db.add(models.Vehicle(student_id=new_student.id, plate_number=v.plate_number))

    db.commit()
    return {"success": True, "message": "Đăng ký thành công!", "student_id": new_student.id}


# ─── GET /api/students/ — Danh sách tất cả sinh viên ─────────
@router.get("/")
def get_all_students(db: Session = Depends(database.get_db)):
    students = db.query(models.Student).all()
    result = []
    for s in students:
        plates = [v.plate_number for v in db.query(models.Vehicle).filter(
            models.Vehicle.student_id == s.id
        ).all()]
        result.append({
            "id": s.id,
            "full_name": s.full_name,
            "rfid_card_code": s.rfid_card_code,
            "student_code": s.student_code,
            "balance": s.balance,
            "vehicles": plates,
        })
    return result


# ─── GET /api/students/{student_id} — Chi tiết 1 SV ─────────
@router.get("/{student_id}")
def get_student(student_id: str, db: Session = Depends(database.get_db)):
    s = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên!")
    plates = [v.plate_number for v in db.query(models.Vehicle).filter(
        models.Vehicle.student_id == s.id
    ).all()]
    return {
        "id": s.id,
        "full_name": s.full_name,
        "rfid_card_code": s.rfid_card_code,
        "student_code": s.student_code,
        "balance": s.balance,
        "vehicles": plates,
    }


# ─── GET /api/students/balance/{rfid} — Số dư theo RFID ──────
@router.get("/balance/{rfid_code}")
def get_balance_by_rfid(rfid_code: str, db: Session = Depends(database.get_db)):
    s = db.query(models.Student).filter(models.Student.rfid_card_code == rfid_code).first()
    if not s:
        raise HTTPException(status_code=404, detail="Không tìm thấy thẻ RFID!")
    return {"rfid_code": rfid_code, "full_name": s.full_name, "balance": s.balance}


# ─── POST /api/students/topup — Nạp tiền demo ────────────────
@router.post("/topup")
def topup_balance(rfid_code: str, amount: int, db: Session = Depends(database.get_db)):
    """Nạp tiền ảo cho SV (dùng khi demo). amount tính bằng VND."""
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Số tiền nạp phải lớn hơn 0!")
    s = db.query(models.Student).filter(models.Student.rfid_card_code == rfid_code).first()
    if not s:
        raise HTTPException(status_code=404, detail="Không tìm thấy thẻ RFID!")
    s.balance += amount
    db.commit()
    return {
        "success": True,
        "message": f"Nạp {amount:,}đ thành công. Số dư mới: {s.balance:,}đ",
        "balance": s.balance,
    }
