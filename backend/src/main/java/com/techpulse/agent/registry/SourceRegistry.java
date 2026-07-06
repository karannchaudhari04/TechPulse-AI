package com.techpulse.agent.registry;

import com.techpulse.agent.collector.SourceCollector;
import com.techpulse.agent.model.SourceType;

/**
 * Registry mapping source types to their corresponding SourceCollectors.
 */
public interface SourceRegistry {
    void register(SourceType sourceType, SourceCollector collector);
    SourceCollector getCollector(SourceType sourceType);
}
