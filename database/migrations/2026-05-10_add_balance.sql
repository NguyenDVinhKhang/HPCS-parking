-- ============================================================
-- Migration: 2026-05-10_add_balance.sql
-- Mục đích: Thêm cột balance vào bảng users cho hệ thống
--           tự động trừ tiền Sinh Viên (StudentBankPayment)
-- ============================================================

-- Thêm cột balance (VND). Dùng IF NOT EXISTS để chạy lại an toàn
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS balance INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- Seed dữ liệu demo — 4 SV nhóm
-- Cập nhật rfid_card_code của 2 SV còn lại khi có thẻ thật
-- ============================================================
UPDATE users SET balance = 50000 WHERE rfid_card_code = '698D2B3F';
UPDATE users SET balance = 50000 WHERE rfid_card_code = '04B13910030180';

-- TODO: thay SV_RFID_3 và SV_RFID_4 bằng mã thẻ thật của 2 SV còn lại
-- UPDATE users SET balance = 50000 WHERE rfid_card_code = 'SV_RFID_3';
-- UPDATE users SET balance = 50000 WHERE rfid_card_code = 'SV_RFID_4';

-- ============================================================
-- Kiểm tra kết quả (chạy sau migration)
-- ============================================================
-- SELECT rfid_card_code, full_name, balance FROM users ORDER BY created_at;
