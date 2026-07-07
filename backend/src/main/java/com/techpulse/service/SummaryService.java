package com.techpulse.service;

import com.techpulse.agent.dto.TechnologyEventDTO;
import com.techpulse.agent.dto.SynthesizedTechnologyEventDTO;

/**
 * Service interface managing AI-powered summary generations.
 */
public interface SummaryService {
    SynthesizedTechnologyEventDTO process(TechnologyEventDTO event);
    SynthesizedTechnologyEventDTO generateWithoutPersistence(TechnologyEventDTO event);
}
