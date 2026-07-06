package com.techpulse.agent.registry;

import com.techpulse.agent.collector.SourceCollector;
import com.techpulse.agent.model.SourceType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe Spring service implementation of SourceRegistry that automatically discovers
 * and registers all SourceCollector beans present in the application context.
 */
@Service
public class SourceRegistryImpl implements SourceRegistry {
    
    private final Map<SourceType, SourceCollector> registry = new ConcurrentHashMap<>();

    @Autowired
    public SourceRegistryImpl(List<SourceCollector> collectors) {
        for (SourceCollector collector : collectors) {
            register(collector.getSupportedType(), collector);
        }
    }

    @Override
    public void register(SourceType sourceType, SourceCollector collector) {
        if (sourceType != null && collector != null) {
            registry.put(sourceType, collector);
        }
    }

    @Override
    public SourceCollector getCollector(SourceType sourceType) {
        if (sourceType == null) return null;
        return registry.get(sourceType);
    }
}
