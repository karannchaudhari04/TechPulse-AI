package com.techpulse.service;

import com.techpulse.agent.TrendDetectionAgent;
import com.techpulse.agent.dto.TrendReportDTO;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service implementation managing trends reports calculation and Redis caching.
 */
@Service
public class TrendServiceImpl implements TrendService {

    private final TrendDetectionAgent trendDetectionAgent;

    public TrendServiceImpl(TrendDetectionAgent trendDetectionAgent) {
        this.trendDetectionAgent = trendDetectionAgent;
    }

    @Override
    @Cacheable(value = "trends", key = "'all'", unless = "#result == null")
    public List<TrendReportDTO> calculateTrends() {
        return trendDetectionAgent.calculateTrends();
    }
}
