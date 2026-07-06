package com.techpulse.agent.collector;

import com.techpulse.agent.PipelineContext;
import com.techpulse.agent.dto.RawUpdateDTO;
import com.techpulse.agent.model.SourceType;
import java.util.List;

/**
 * Interface representing a collector that discovers updates from a specific type of technology source.
 */
public interface SourceCollector {
    /**
     * Collects raw updates from the specified URL.
     *
     * @param context the current execution pipeline context
     * @param sourceName the name of the source (e.g. AWS Blog)
     * @param sourceUrl the source RSS feed/API URL
     * @return list of collected updates
     */
    List<RawUpdateDTO> collect(PipelineContext context, String sourceName, String sourceUrl);

    /**
     * Returns the type of source this collector supports.
     */
    SourceType getSupportedType();
}
