package com.techpulse.service;

import com.techpulse.agent.dto.TrendReportDTO;
import java.util.List;

/**
 * Service interface managing trend calculations.
 */
public interface TrendService {
    List<TrendReportDTO> calculateTrends();
}
