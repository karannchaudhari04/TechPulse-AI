-- V8: Immediately delete any stuck, new, or failed raw ingestion records.
-- Raw ingestion should only retain PROCESSED (and DUPLICATE) records.
-- If Gemini fails to summarize an update, it must not be stored in the DB.
DELETE FROM raw_ingestion 
WHERE processing_status != 'PROCESSED' 
  AND processing_status != 'DUPLICATE';
