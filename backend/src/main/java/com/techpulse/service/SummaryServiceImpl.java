package com.techpulse.service;

import com.techpulse.agent.AISynthesisAgent;
import com.techpulse.agent.dto.TechnologyEventDTO;
import com.techpulse.agent.dto.SynthesizedTechnologyEventDTO;
import org.springframework.stereotype.Service;

/**
 * Service implementation managing AI-powered summary generations.
 */
@Service
public class SummaryServiceImpl implements SummaryService {

    private final AISynthesisAgent aiSynthesisAgent;

    public SummaryServiceImpl(AISynthesisAgent aiSynthesisAgent) {
        this.aiSynthesisAgent = aiSynthesisAgent;
    }

    @Override
    public SynthesizedTechnologyEventDTO process(TechnologyEventDTO event) {
        return aiSynthesisAgent.process(event);
    }

    @Override
    public SynthesizedTechnologyEventDTO generateWithoutPersistence(TechnologyEventDTO event) {
        return aiSynthesisAgent.generateWithoutPersistence(event);
    }
}
