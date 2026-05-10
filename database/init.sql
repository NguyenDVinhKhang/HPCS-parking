CREATE DATABASE IF NOT EXISTS parking_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE parking_management;

-- Bảng tài khoản admin/staff
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'staff') DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng bãi đỗ xe (mỗi bản ghi là 1 chỗ đỗ)
CREATE TABLE IF NOT EXISTS parking_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slot_code VARCHAR(10) NOT NULL UNIQUE,
    status ENUM('available', 'occupied', 'maintenance') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng phương tiện đang nằm trong bãi đỗ
CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plate_number VARCHAR(20) NOT NULL UNIQUE,
    vehicle_type ENUM('car', 'motorcycle', 'truck') DEFAULT 'car',
    owner_name VARCHAR(100),
    phone VARCHAR(20),
    slot_id INT,
    entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (slot_id) REFERENCES parking_slots(id) ON DELETE SET NULL
);

-- Bảng lịch sử ra vào
CREATE TABLE IF NOT EXISTS history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plate_number VARCHAR(20) NOT NULL,
    event_type ENUM('in', 'out') NOT NULL,
    camera_id VARCHAR(50),
    image_url VARCHAR(255),
    event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confidence FLOAT DEFAULT 1.0
);

-- Bảng quản lý thiết bị camera
CREATE TABLE IF NOT EXISTS cameras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL UNIQUE,
    ip_address VARCHAR(50) NOT NULL,
    location VARCHAR(100),
    status ENUM('online', 'offline', 'error') DEFAULT 'offline',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng cấu hình giá gửi xe
CREATE TABLE IF NOT EXISTS parking_rates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_type ENUM('car', 'motorcycle', 'truck') NOT NULL UNIQUE,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng thanh toán (pay-before-entry)
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(64) NOT NULL UNIQUE,
    plate_number VARCHAR(20),
    vehicle_type ENUM('car', 'motorcycle', 'truck') DEFAULT 'car',
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    payment_method ENUM('bank_transfer', 'cash', 'card') DEFAULT 'bank_transfer',
    status ENUM('pending', 'paid', 'failed') NOT NULL DEFAULT 'pending',
    xgate_reference VARCHAR(100),
    matched_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL,
    synced_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_status_created_at ON payments(status, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_number ON payments(invoice_number);
CREATE INDEX IF NOT EXISTS idx_payments_synced_at ON payments(synced_at);

-- INSERT Dữ liệu mặc định
-- Tài khoản admin (Mật khẩu: admin123 - bcrypt hoặc raw tùy backend, ở đây lưu raw demo hoặc plain text do không có bcrypt gen)
-- LƯU Ý: Ở hệ thống thực tế phải lưu hash. Đây là bản demo mock.
INSERT IGNORE INTO users (username, password_hash, full_name, role)
VALUES ('admin', 'admin123', 'Quản trị viên', 'admin');
