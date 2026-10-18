-- V7: Add retry tracking columns to raw_ingestion table.
ALTER TABLE raw_ingestion ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;
ALTER TABLE raw_ingestion ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMP NULL;
ALTER TABLE raw_ingestion ADD COLUMN IF NOT EXISTS failure_reason TEXT NULL;
