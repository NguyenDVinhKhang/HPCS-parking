-- Compatibility migration for legacy payments schema.
-- Run this on existing databases before enabling payment sync/report APIs.

START TRANSACTION;

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

-- Rename legacy primary key column payment_id -> id when needed.
SET @has_payment_id := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payments'
    AND COLUMN_NAME = 'payment_id'
);
SET @has_id := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payments'
    AND COLUMN_NAME = 'id'
);
SET @sql := IF(
  @has_payment_id > 0 AND @has_id = 0,
  'ALTER TABLE payments CHANGE COLUMN payment_id id BIGINT NOT NULL AUTO_INCREMENT',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure id is primary key.
SET @pk_on_id := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payments'
    AND INDEX_NAME = 'PRIMARY'
    AND COLUMN_NAME = 'id'
);
SET @has_any_pk := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payments'
    AND CONSTRAINT_TYPE = 'PRIMARY KEY'
);
SET @sql := IF(
  @pk_on_id > 0,
  'SELECT 1',
  IF(
    @has_any_pk > 0,
    'ALTER TABLE payments DROP PRIMARY KEY, ADD PRIMARY KEY (id)',
    'ALTER TABLE payments ADD PRIMARY KEY (id)'
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS plate_number VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS vehicle_type ENUM('car', 'motorcycle', 'truck') DEFAULT 'car',
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'VND',
  ADD COLUMN IF NOT EXISTS payment_method ENUM('bank_transfer', 'cash', 'card') DEFAULT 'bank_transfer',
  ADD COLUMN IF NOT EXISTS xgate_reference_code VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS xgate_reference VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS matched_content TEXT NULL,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Generate invoice_number for rows that do not have one.
UPDATE payments
SET invoice_number = CONCAT('LEGACY-', LPAD(id, 8, '0'))
WHERE invoice_number IS NULL OR invoice_number = '';

-- Normalize status safely through VARCHAR to avoid enum ordinal/case pitfalls.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'pending';
ALTER TABLE payments MODIFY COLUMN status VARCHAR(16) NOT NULL DEFAULT 'pending';

UPDATE payments
SET status = CASE UPPER(TRIM(status))
  WHEN 'PAID' THEN 'paid'
  WHEN 'PENDING' THEN 'pending'
  WHEN 'UNPAID' THEN 'pending'
  WHEN 'FAILED' THEN 'failed'
  WHEN 'REJECTED' THEN 'failed'
  ELSE 'pending'
END;

ALTER TABLE payments
  MODIFY COLUMN status ENUM('pending', 'paid', 'failed') NOT NULL DEFAULT 'pending',
  MODIFY COLUMN invoice_number VARCHAR(100) NOT NULL;

-- Backfill xgate_reference from legacy column.
UPDATE payments
SET xgate_reference = COALESCE(NULLIF(xgate_reference, ''), NULLIF(xgate_reference_code, ''))
WHERE xgate_reference IS NULL OR xgate_reference = '';

-- Backfill paid_at for paid rows.
SET @has_paid_date := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'payments'
    AND COLUMN_NAME = 'paid_date'
);
SET @sql := IF(
  @has_paid_date > 0,
  'UPDATE payments SET paid_at = COALESCE(paid_at, CAST(paid_date AS DATETIME), updated_at) WHERE status = ''paid'' AND paid_at IS NULL',
  'UPDATE payments SET paid_at = COALESCE(paid_at, updated_at) WHERE status = ''paid'' AND paid_at IS NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_invoice_number ON payments(invoice_number);
CREATE INDEX IF NOT EXISTS idx_payments_status_created_at ON payments(status, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_synced_at ON payments(synced_at);

COMMIT;
