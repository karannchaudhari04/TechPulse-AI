-- V9: Purge all duplicate raw ingestion records.
-- Going forward, duplicate updates detected during ingestion are discarded in-memory and never written to the DB.
DELETE FROM raw_ingestion 
WHERE processing_status = 'DUPLICATE';
