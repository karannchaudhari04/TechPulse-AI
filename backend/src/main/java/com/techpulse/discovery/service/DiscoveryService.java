package com.techpulse.discovery.service;

import com.techpulse.model.RawIngestion;
import java.util.List;

public interface DiscoveryService {
    /**
     * Discovers new updates from active news sources, sanitizes them, 
     * executes layered duplicate checks, and saves raw records.
     * 
     * @return List of unique RawIngestion entries that are ready for AI processing.
     */
    List<RawIngestion> discoverAndDeduplicate();
}
