CREATE INDEX idx_technology_event_feed_cursor
    ON technology_event (fetched_at DESC, id DESC);
