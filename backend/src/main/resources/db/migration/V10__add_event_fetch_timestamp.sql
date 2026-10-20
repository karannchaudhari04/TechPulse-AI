ALTER TABLE technology_event
    ADD COLUMN fetched_at TIMESTAMP NULL;

UPDATE technology_event
SET fetched_at = COALESCE(last_updated, first_seen, CURRENT_TIMESTAMP)
WHERE fetched_at IS NULL;

CREATE INDEX idx_technology_event_fetched_at
    ON technology_event (fetched_at DESC);
