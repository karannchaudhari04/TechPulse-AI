package com.techpulse.ai.service;

import com.techpulse.model.RawIngestion;
import com.techpulse.model.TechnologyEvent;

public interface AISynthesisService {
    /**
     * Calls Gemini to process the unique raw ingestion update into a structured
     * technology event and persists it in the database.
     * 
     * @param rawUpdate The unique raw update to process.
     * @return The persisted TechnologyEvent.
     */
    TechnologyEvent synthesizeAndSave(RawIngestion rawUpdate);
}
