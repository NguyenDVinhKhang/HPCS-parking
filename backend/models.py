from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rfid_card_code = Column(String(100), unique=True)
    full_name = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # 'STUDENT', 'ADMIN'
    bank_account_info = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship tới bảng vehicles
    vehicles = relationship("Vehicle", back_populates="owner", cascade="all, delete-orphan")

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plate_number = Column(String(50), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="vehicles")

class GuestCard(Base):
    __tablename__ = "guest_cards"

    rfid_card_code = Column(String(100), primary_key=True)
    status = Column(String(20), default="AVAILABLE")  # 'AVAILABLE', 'IN_USE'
    created_at = Column(DateTime, default=datetime.utcnow)

class ParkingSession(Base):
    __tablename__ = "parking_sessions"

    session_id = Column(Integer, primary_key=True, autoincrement=True)
    rfid_code = Column(String(100), nullable=False)
    session_type = Column(String(20), nullable=False)  # 'STUDENT', 'GUEST'
    
    entry_plate_image = Column(String)
    entry_plate_number = Column(String(50))
    entry_time = Column(DateTime, default=datetime.utcnow)
    
    exit_plate_image = Column(String)
    exit_plate_number = Column(String(50))
    exit_time = Column(DateTime)
    
    fee_amount = Column(Integer, default=0)
    payment_method = Column(String(20))  # 'BANK_AUTO', 'QR_CODE', 'CASH', 'PENDING'
    status = Column(String(20), default="OPEN")  # 'OPEN', 'CLOSED', 'ERROR_MISMATCH'
