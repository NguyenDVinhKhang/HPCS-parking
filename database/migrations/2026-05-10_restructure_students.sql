-- ============================================================
-- Migration: 2026-05-10_restructure_students.sql
-- Mục đích: Tách biệt rõ ràng 2 khái niệm "user":
--   1. users      → tài khoản đăng nhập web dashboard (Next.js dùng)
--   2. students   → sinh viên quẹt thẻ RFID (FastAPI dùng)
--
-- Chạy file này SAU KHI đã tạo DB parking_management rỗng.
-- An toàn: dùng IF NOT EXISTS / IF EXISTS, chạy lại không lỗi.
-- ============================================================

-- ============================================================
-- BẢNG 1: users — Tài khoản đăng nhập web (Next.js / NextAuth)
-- Giữ nguyên tên "users" để auth.ts không cần sửa
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    role          ENUM('admin', 'staff') DEFAULT 'staff',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tài khoản mặc định demo (plain-text password cho demo, hash sau)
INSERT IGNORE INTO users (username, password_hash, full_name, role)
VALUES
    ('admin', 'admin123', 'Quản trị viên', 'admin'),
    ('guard', 'guard123', 'Bảo vệ Ca 1',   'staff');

-- ============================================================
-- BẢNG 2: students — Sinh viên RFID (FastAPI Python dùng)
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
    id            CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    rfid_card_code VARCHAR(100) NOT NULL UNIQUE,
    full_name     VARCHAR(255) NOT NULL,
    student_code  VARCHAR(20),            -- MSSV (tùy chọn)
    balance       INTEGER      NOT NULL DEFAULT 0,
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BẢNG 3: vehicles — Phương tiện của sinh viên
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
    id            CHAR(36)    PRIMARY KEY DEFAULT (UUID()),
    student_id    CHAR(36)    NOT NULL,
    plate_number  VARCHAR(50) NOT NULL UNIQUE,
    created_at    DATETIME    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- ============================================================
-- BẢNG 4: guest_cards — Thẻ khách vãng lai
-- ============================================================
CREATE TABLE IF NOT EXISTS guest_cards (
    rfid_card_code VARCHAR(100) PRIMARY KEY,
    status         VARCHAR(20)  DEFAULT 'AVAILABLE',  -- AVAILABLE | IN_USE
    created_at     DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BẢNG 5: parking_sessions — Phiên gửi xe (OPEN → CLOSED)
-- ============================================================
CREATE TABLE IF NOT EXISTS parking_sessions (
    session_id          INT AUTO_INCREMENT PRIMARY KEY,
    rfid_code           VARCHAR(100) NOT NULL,
    session_type        VARCHAR(20)  NOT NULL,         -- STUDENT | GUEST
    entry_plate_image   LONGTEXT,
    entry_plate_number  VARCHAR(50),
    entry_time          DATETIME     DEFAULT CURRENT_TIMESTAMP,
    exit_plate_image    LONGTEXT,
    exit_plate_number   VARCHAR(50),
    exit_time           DATETIME,
    fee_amount          INTEGER      DEFAULT 0,
    payment_method      VARCHAR(20),  -- BANK_AUTO | QR_CODE | CASH | PENDING
    status              VARCHAR(20)  DEFAULT 'OPEN'    -- OPEN | CLOSED | ERROR_MISMATCH
);

-- ============================================================
-- SEED DATA — Demo 4 SV nhóm
-- Thay rfid_card_code bằng mã thẻ thật khi cần
-- ============================================================
INSERT IGNORE INTO students (id, rfid_card_code, full_name, student_code, balance) VALUES
    (UUID(), '698D2B3F',       'Sinh Viên 1', 'SV001', 50000),
    (UUID(), '04B13910030180', 'Sinh Viên 2', 'SV002', 50000);
-- TODO: thêm 2 SV còn lại sau khi có thẻ thật:
-- (UUID(), 'RFID_SV3', 'Sinh Viên 3', 'SV003', 50000),
-- (UUID(), 'RFID_SV4', 'Sinh Viên 4', 'SV004', 50000);

-- Seed thẻ khách (3 thẻ trắng)
INSERT IGNORE INTO guest_cards (rfid_card_code, status) VALUES
    ('GUEST_01', 'AVAILABLE'),
    ('GUEST_02', 'AVAILABLE'),
    ('GUEST_03', 'AVAILABLE');

-- ============================================================
-- VERIFY — Chạy để kiểm tra sau khi migration xong
-- ============================================================
-- SELECT username, full_name, role FROM users;
-- SELECT rfid_card_code, full_name, balance FROM students;
-- SELECT rfid_card_code, status FROM guest_cards;
