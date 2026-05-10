"""
models.py — SQLAlchemy ORM Models cho HPCS Backend (FastAPI)
=============================================================
Schema gồm 2 nhóm tách biệt rõ ràng:

  [Next.js dùng — đăng nhập web]
    (Next.js kết nối trực tiếp MariaDB, không qua FastAPI)

  [FastAPI dùng — logic cổng RFID]
    Student         → sinh viên, thẻ RFID, số dư
    Vehicle         → biển số xe của sinh viên
    GuestCard       → thẻ trắng cho khách vãng lai
    ParkingSession  → phiên gửi xe OPEN → CLOSED
"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from database import Base


# ─────────────────────────────────────────────────────────────
#  Student — Sinh viên đăng ký thẻ RFID
#  Bảng: students
#  Ai dùng: FastAPI (gate_router, users router)
# ─────────────────────────────────────────────────────────────
class Student(Base):
    __tablename__ = "students"

    id              = Column(String(36),  primary_key=True, default=lambda: str(uuid.uuid4()))
    rfid_card_code  = Column(String(100), unique=True, nullable=False)
    full_name       = Column(String(255), nullable=False)
    student_code    = Column(String(20),  nullable=True)   # MSSV
    balance         = Column(Integer,     nullable=False, default=0)
    created_at      = Column(DateTime,    default=datetime.utcnow)

    # Relationship: 1 SV có nhiều xe
    vehicles = relationship("Vehicle", back_populates="owner", cascade="all, delete-orphan")


# ─────────────────────────────────────────────────────────────
#  Vehicle — Phương tiện của sinh viên
#  Bảng: vehicles
# ─────────────────────────────────────────────────────────────
class Vehicle(Base):
    __tablename__ = "vehicles"

    id           = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id   = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    plate_number = Column(String(50), unique=True, nullable=False)
    created_at   = Column(DateTime,   default=datetime.utcnow)

    owner = relationship("Student", back_populates="vehicles")


# ─────────────────────────────────────────────────────────────
#  GuestCard — Thẻ trắng phát cho khách vãng lai
#  Bảng: guest_cards
#  Status: AVAILABLE | IN_USE
# ─────────────────────────────────────────────────────────────
class GuestCard(Base):
    __tablename__ = "guest_cards"

    rfid_card_code = Column(String(100), primary_key=True)
    status         = Column(String(20),  default="AVAILABLE")
    created_at     = Column(DateTime,    default=datetime.utcnow)


# ─────────────────────────────────────────────────────────────
#  ParkingSession — Phiên gửi xe từ lúc vào đến lúc ra
#  Bảng: parking_sessions
#  Status:         OPEN → CLOSED | ERROR_MISMATCH
#  payment_method: BANK_AUTO | QR_CODE | CASH | PENDING
#  session_type:   STUDENT | GUEST
# ─────────────────────────────────────────────────────────────
class ParkingSession(Base):
    __tablename__ = "parking_sessions"

    session_id          = Column(Integer,     primary_key=True, autoincrement=True)
    rfid_code           = Column(String(100), nullable=False)
    session_type        = Column(String(20),  nullable=False)

    entry_plate_image   = Column(String(500), default="")   # "plates/entry/xxx.jpg"
    entry_plate_number  = Column(String(50))
    entry_time          = Column(DateTime, default=datetime.utcnow)

    exit_plate_image    = Column(String(500), default="")    # "plates/exit/xxx.jpg"
    exit_plate_number   = Column(String(50))
    exit_time           = Column(DateTime)

    fee_amount          = Column(Integer,     default=0)
    payment_method      = Column(String(20))
    status              = Column(String(20),  default="OPEN")
