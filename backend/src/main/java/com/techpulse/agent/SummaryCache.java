package com.techpulse.agent;

import com.techpulse.agent.dto.SynthesizedTechnologyEventDTO;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service cache for synthesized summaries, avoiding duplicate LLM calls.
 */
@Service
public class SummaryCache {

    private final Map<String, SynthesizedTechnologyEventDTO> cache = new ConcurrentHashMap<>();

    /**
     * Constructs a composite key from hashes and configuration parameters.
     */
    public String generateKey(String eventId, String kgHash, String timelineHash, String entitiesHash,
                              String promptVersion, String model, double temperature, int maxTokens, String sysPromptHash) {
        return eventId + ":" + kgHash + ":" + timelineHash + ":" + entitiesHash + ":" + promptVersion + ":" + model + ":" + temperature + ":" + maxTokens + ":" + sysPromptHash;
    }

    public SynthesizedTechnologyEventDTO get(String key) {
        return cache.get(key);
    }

    public void put(String key, SynthesizedTechnologyEventDTO value) {
        cache.put(key, value);
    }

    public void clear() {
        cache.clear();
    }
}
