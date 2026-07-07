package com.techpulse.config;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

/**
 * Exposes custom Micrometer performance metrics for Prometheus collection.
 */
@Component
public class SystemPerformanceMetrics {

    private final Counter pipelineRuns;
    private final Counter aiSummariesGenerated;
    private final Counter recommendationHits;

    public SystemPerformanceMetrics(MeterRegistry registry) {
        this.pipelineRuns = Counter.builder("techpulse.pipeline.runs")
                .description("Total executions of the ingestion pipeline")
                .register(registry);

        this.aiSummariesGenerated = Counter.builder("techpulse.ai.summaries")
                .description("Total AI summaries generated")
                .register(registry);

        this.recommendationHits = Counter.builder("techpulse.recommendation.hits")
                .description("Total recommendation request matches")
                .register(registry);
    }

    public void incrementPipelineRuns() {
        this.pipelineRuns.increment();
    }

    public void incrementAiSummaries() {
        this.aiSummariesGenerated.increment();
    }

    public void incrementRecommendationHits() {
        this.recommendationHits.increment();
    }
}
