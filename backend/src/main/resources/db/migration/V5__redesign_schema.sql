-- db/migration/V5__redesign_schema.sql

-- 1. Drop legacy tables in full FK-safe dependency order.
--    user_liked_bites was created by Hibernate ddl-auto in production before Flyway took over.
--    MySQL/TiDB enforces FK constraints on DROP — all child tables must be dropped first.
DROP TABLE IF EXISTS user_liked_bites;
DROP TABLE IF EXISTS bookmarks;
DROP TABLE IF EXISTS user_viewed_bites;
DROP TABLE IF EXISTS bites;

-- 2. Modify raw_ingestion to support fast hash lookups.
--    Guard each column with IF NOT EXISTS so the migration is safe on re-run after partial failure.
ALTER TABLE raw_ingestion ADD COLUMN IF NOT EXISTS url_hash VARCHAR(64);
ALTER TABLE raw_ingestion ADD COLUMN IF NOT EXISTS title_hash VARCHAR(64);

-- Create indexes on hashes (CREATE INDEX is idempotent via IF NOT EXISTS)
CREATE UNIQUE INDEX IF NOT EXISTS idx_raw_url_hash ON raw_ingestion (url_hash);
CREATE INDEX IF NOT EXISTS idx_raw_title_hash ON raw_ingestion (title_hash);

-- 3. Create user reading history table for personalization metrics
CREATE TABLE IF NOT EXISTS user_history_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    event_id VARCHAR(36) NOT NULL,
    last_opened TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reading_duration_sec INT DEFAULT 0,
    completion_percentage INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES technology_event(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_event_history (user_id, event_id)
);
