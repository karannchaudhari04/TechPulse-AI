package com.techpulse.agent;

import com.techpulse.agent.dto.AIRequest;
import com.techpulse.agent.dto.AIResponse;

/**
 * Provider-independent interface for AI text completions.
 */
public interface AIClient {
    AIResponse generate(AIRequest request);
}
