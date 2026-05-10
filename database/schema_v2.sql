-- ============================================================
-- HPCS Parking System — Database Schema v2 (Clean Install)
-- ============================================================
-- File này gộp tất cả migration thành 1 script duy nhất.
-- Chạy file này để tạo toàn bộ DB từ đầu (fresh install).
--
-- Cách chạy:
--   phpMyAdmin → tab SQL → paste toàn bộ nội dung → Go
--
-- Schema gồm 2 nhóm tách biệt:
--   [Next.js]  users            → đăng nhập web dashboard
--   [FastAPI]  students         → sinh viên quẹt thẻ RFID
--              vehicles         → biển số xe
--              guest_cards      → thẻ trắng khách
--              parking_sessions → phiên gửi xe
--              payments         → lịch sử thanh toán PayOS
-- ============================================================

CREATE DATABASE IF NOT EXISTS parking_management
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE parking_management;

-- ============================================================
-- BẢNG 1: users
-- Mục đích : Tài khoản đăng nhập web dashboard
-- Ai dùng  : Next.js (NextAuth — kết nối MariaDB trực tiếp)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    role          ENUM('admin', 'staff') DEFAULT 'staff',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BẢNG 2: students
-- Mục đích : Sinh viên đăng ký thẻ RFID, có số dư
-- Ai dùng  : FastAPI Python (gate_router, students router)
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
    id              CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    rfid_card_code  VARCHAR(100) NOT NULL UNIQUE,
    full_name       VARCHAR(255) NOT NULL,
    student_code    VARCHAR(20),               -- MSSV (tùy chọn)
    balance         INTEGER      NOT NULL DEFAULT 0,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BẢNG 3: vehicles
-- Mục đích : Biển số xe của sinh viên (tối đa 3 xe/SV)
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
    id           CHAR(36)    PRIMARY KEY DEFAULT (UUID()),
    student_id   CHAR(36)    NOT NULL,
    plate_number VARCHAR(50) NOT NULL UNIQUE,
    created_at   DATETIME    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ============================================================
-- BẢNG 4: guest_cards
-- Mục đích : Thẻ trắng phát cho khách vãng lai
-- Status   : AVAILABLE → IN_USE → AVAILABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS guest_cards (
    rfid_card_code VARCHAR(100) PRIMARY KEY,
    status         VARCHAR(20)  DEFAULT 'AVAILABLE',
    created_at     DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BẢNG 5: parking_sessions
-- Mục đích : Phiên gửi xe từ lúc vào đến lúc ra + thanh toán
-- Status   : OPEN → CLOSED | ERROR_MISMATCH
-- Images   : Lưu đường dẫn file (không lưu base64)
--            VD: "plates/entry/20260510_223000_698D2B3F.jpg"
--            URL: http://localhost:8000/static/plates/entry/xxx.jpg
-- ============================================================
CREATE TABLE IF NOT EXISTS parking_sessions (
    session_id          INT AUTO_INCREMENT PRIMARY KEY,
    rfid_code           VARCHAR(100) NOT NULL,
    session_type        VARCHAR(20)  NOT NULL,         -- STUDENT | GUEST

    entry_plate_image   VARCHAR(500) DEFAULT '',       -- đường dẫn file
    entry_plate_number  VARCHAR(50),
    entry_time          DATETIME     DEFAULT CURRENT_TIMESTAMP,

    exit_plate_image    VARCHAR(500) DEFAULT '',       -- đường dẫn file
    exit_plate_number   VARCHAR(50),
    exit_time           DATETIME,

    fee_amount          INTEGER      DEFAULT 0,
    payment_method      VARCHAR(20),  -- BANK_AUTO | QR_CODE | CASH | PENDING
    status              VARCHAR(20)  DEFAULT 'OPEN'    -- OPEN | CLOSED | ERROR_MISMATCH
);

-- ============================================================
-- BẢNG 6: payments
-- Mục đích : Lịch sử thanh toán PayOS (QR Code)
-- Ai dùng  : FastAPI payment.py + Next.js lib/payments.ts
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_number  VARCHAR(100) NOT NULL UNIQUE,
    plate_number    VARCHAR(20),
    vehicle_type    ENUM('car', 'motorcycle', 'truck') DEFAULT 'motorcycle',
    amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency        VARCHAR(10)   NOT NULL DEFAULT 'VND',
    payment_method  ENUM('bank_transfer', 'cash', 'card') DEFAULT 'bank_transfer',
    status          ENUM('pending', 'paid', 'failed') NOT NULL DEFAULT 'pending',
    xgate_reference VARCHAR(100),
    matched_content TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    paid_at         TIMESTAMP NULL,
    synced_at       TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_status      ON payments(status, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at     ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_invoice     ON payments(invoice_number);
CREATE INDEX IF NOT EXISTS idx_payments_synced_at   ON payments(synced_at);

-- ============================================================
-- SEED DATA — Dữ liệu mặc định cho demo
-- ============================================================

-- Tài khoản web (đăng nhập dashboard)
-- Mật khẩu: plain-text cho demo, hash bcrypt khi production
INSERT IGNORE INTO users (username, password_hash, full_name, role) VALUES
    ('admin', 'admin123', 'Quản trị viên', 'admin'),
    ('guard', 'guard123', 'Bảo vệ Ca 1',   'staff');

-- Sinh viên RFID (cập nhật rfid_card_code thực tế khi có thẻ)
INSERT IGNORE INTO students (id, rfid_card_code, full_name, student_code, balance) VALUES
    (UUID(), '698D2B3F',       'Sinh Viên 1', 'SV001', 50000),
    (UUID(), '04B13910030180', 'Sinh Viên 2', 'SV002', 50000);
-- TODO: thêm 2 SV còn lại:
-- (UUID(), 'RFID_SV3', 'Tên SV 3', 'SV003', 50000),
-- (UUID(), 'RFID_SV4', 'Tên SV 4', 'SV004', 50000);

-- Thẻ khách vãng lai
INSERT IGNORE INTO guest_cards (rfid_card_code, status) VALUES
    ('GUEST_01', 'AVAILABLE'),
    ('GUEST_02', 'AVAILABLE'),
    ('GUEST_03', 'AVAILABLE');

-- ============================================================
-- VERIFY — Uncomment để kiểm tra sau khi chạy
-- ============================================================
-- SELECT 'users' as tbl, COUNT(*) as rows FROM users
-- UNION SELECT 'students', COUNT(*) FROM students
-- UNION SELECT 'vehicles', COUNT(*) FROM vehicles
-- UNION SELECT 'guest_cards', COUNT(*) FROM guest_cards
-- UNION SELECT 'parking_sessions', COUNT(*) FROM parking_sessions
-- UNION SELECT 'payments', COUNT(*) FROM payments;
