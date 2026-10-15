-- V7: Add retry tracking columns to raw_ingestion table.
-- Fixes stuck-record bug: records that fail Gemini synthesis were staying
-- in NEW status forever and being re-queued every ingestion cycle.
-- Now: FAILED status + retry_count + last_attempt_at + failure_reason
-- let the system track, limit, and clean up failed records automatically.

-- 1. Extend the processingStatus enum FIRST so 'FAILED' becomes a valid status option
ALTER TABLE raw_ingestion
    MODIFY COLUMN processing_status ENUM('NEW','CLEANED','CLASSIFIED','DUPLICATE','PROCESSED','FAILED') NOT NULL DEFAULT 'NEW';

-- 2. Add columns without the broken 'AFTER event_source_count' positioning constraint
ALTER TABLE raw_ingestion
    ADD COLUMN retry_count      INT          NOT NULL DEFAULT 0,
    ADD COLUMN last_attempt_at  DATETIME     NULL,
    ADD COLUMN failure_reason   TEXT         NULL;

-- 3. Immediately mark all existing stuck NEW records that have been around
-- for more than 1 day as FAILED so they stop polluting the retry queue.
UPDATE raw_ingestion
SET processing_status = 'FAILED',
    retry_count       = 5,
    failure_reason    = 'Migrated: was stuck as NEW before retry tracking was introduced'
WHERE processing_status = 'NEW'
  AND fetched_at < NOW() - INTERVAL 1 DAY;
