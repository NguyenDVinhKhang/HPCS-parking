-- ============================================================
-- Migration: 2026-05-10_image_path_columns.sql
-- Mục đích: Đổi cột lưu ảnh từ LONGTEXT (base64) sang VARCHAR(500)
--           vì giờ DB chỉ lưu đường dẫn file, không lưu base64
--
-- Trước: entry_plate_image = "data:image/jpeg;base64,/9j/4AAQ..."  (50-200KB)
-- Sau:   entry_plate_image = "plates/entry/20260510_223000_698D2B3F.jpg"
--
-- Ảnh thực tế lưu tại: backend/static/plates/entry/ và exit/
-- Truy cập qua HTTP: http://localhost:8000/static/plates/entry/xxx.jpg
-- ============================================================

ALTER TABLE parking_sessions
    MODIFY COLUMN entry_plate_image VARCHAR(500) DEFAULT '',
    MODIFY COLUMN exit_plate_image  VARCHAR(500) DEFAULT '';

-- Xóa dữ liệu base64 cũ nếu có (optional — chạy nếu đã có data cũ)
-- UPDATE parking_sessions
--     SET entry_plate_image = '',
--         exit_plate_image  = ''
--     WHERE LENGTH(entry_plate_image) > 500
--        OR LENGTH(exit_plate_image)  > 500;

-- Verify
-- DESCRIBE parking_sessions;
-- SELECT session_id, entry_plate_image, exit_plate_image FROM parking_sessions LIMIT 5;
