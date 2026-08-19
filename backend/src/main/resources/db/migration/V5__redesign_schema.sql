-- db/migration/V5__redesign_schema.sql

-- 1. Drop legacy tables in dependency order
DROP TABLE IF EXISTS bookmarks;
DROP TABLE IF EXISTS user_viewed_bites;
DROP TABLE IF EXISTS bites;

-- 2. Modify raw_ingestion to support fast hash lookups
ALTER TABLE raw_ingestion ADD COLUMN url_hash VARCHAR(64);
ALTER TABLE raw_ingestion ADD COLUMN title_hash VARCHAR(64);

-- Create indexes on hashes
CREATE UNIQUE INDEX idx_raw_url_hash ON raw_ingestion (url_hash);
CREATE INDEX idx_raw_title_hash ON raw_ingestion (title_hash);

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
