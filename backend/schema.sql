-- Kích hoạt extension sinh UUID tự động (rất cần thiết cho PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Xóa bảng cũ nếu tồn tại (để chạy lại không bị lỗi)
DROP TABLE IF EXISTS parking_sessions CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS guest_cards CASCADE;

-- ==========================================
-- 1. Bảng Users (Người dùng: Sinh viên / Admin)
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfid_card_code VARCHAR(100) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('STUDENT', 'ADMIN')) NOT NULL,
    bank_account_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. Bảng Vehicles (Biển số xe của Sinh viên)
-- ==========================================
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    plate_number VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==========================================
-- 3. Bảng GuestCards (Rổ thẻ từ của Khách vãng lai)
-- ==========================================
CREATE TABLE guest_cards (
    rfid_card_code VARCHAR(100) PRIMARY KEY,
    status VARCHAR(20) CHECK (status IN ('AVAILABLE', 'IN_USE')) DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. Bảng ParkingSessions (Phiên gửi xe vào - ra)
-- ==========================================
CREATE TABLE parking_sessions (
    session_id SERIAL PRIMARY KEY,
    rfid_code VARCHAR(100) NOT NULL,
    session_type VARCHAR(20) CHECK (session_type IN ('STUDENT', 'GUEST')) NOT NULL,
    
    entry_plate_image TEXT,
    entry_plate_number VARCHAR(50),
    entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    exit_plate_image TEXT,
    exit_plate_number VARCHAR(50),
    exit_time TIMESTAMP,
    
    fee_amount INTEGER DEFAULT 0,
    payment_method VARCHAR(20) CHECK (payment_method IN ('BANK_AUTO', 'QR_CODE', 'CASH', 'PENDING')),
    status VARCHAR(20) CHECK (status IN ('OPEN', 'CLOSED', 'ERROR_MISMATCH')) DEFAULT 'OPEN'
);

-- ==========================================
-- DỮ LIỆU MẪU ĐỂ TEST (Seeding)
-- ==========================================

-- Tạo 5 thẻ Guest có sẵn
INSERT INTO guest_cards (rfid_card_code, status) VALUES 
('GUEST-001', 'AVAILABLE'),
('GUEST-002', 'AVAILABLE'),
('GUEST-003', 'AVAILABLE'),
('GUEST-004', 'AVAILABLE'),
('GUEST-005', 'AVAILABLE');

-- LƯU Ý: Do bảng users dùng UUID tự động, khi insert qua Backend ta mới insert vehicles dễ dàng.
