-- V7: Add retry tracking columns to raw_ingestion table.
-- Fixes stuck-record bug: records that fail Gemini synthesis were staying
-- in NEW status forever and being re-queued every ingestion cycle.
-- Now: FAILED status + retry_count + last_attempt_at + failure_reason
-- let the system track, limit, and clean up failed records automatically.

ALTER TABLE raw_ingestion
    ADD COLUMN retry_count      INT          NOT NULL DEFAULT 0 AFTER event_source_count,
    ADD COLUMN last_attempt_at  DATETIME     NULL     AFTER retry_count,
    ADD COLUMN failure_reason   TEXT         NULL     AFTER last_attempt_at;

-- Extend the processingStatus enum to include FAILED
ALTER TABLE raw_ingestion
    MODIFY COLUMN processing_status ENUM('NEW','CLEANED','CLASSIFIED','DUPLICATE','PROCESSED','FAILED') NOT NULL DEFAULT 'NEW';

-- Immediately mark all existing stuck NEW records that have been around
-- for more than 1 day as FAILED so they stop polluting the retry queue.
UPDATE raw_ingestion
SET processing_status = 'FAILED',
    retry_count       = 5,
    failure_reason    = 'Migrated: was stuck as NEW before retry tracking was introduced'
WHERE processing_status = 'NEW'
  AND fetched_at < NOW() - INTERVAL 1 DAY;
