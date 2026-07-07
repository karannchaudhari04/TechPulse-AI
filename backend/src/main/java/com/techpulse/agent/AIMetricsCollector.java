package com.techpulse.agent;

import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.DoubleAdder;

/**
 * Observability service collecting and compiling AI synthesis operational metrics.
 */
@Service
public class AIMetricsCollector {

    private final AtomicInteger totalRequests = new AtomicInteger(0);
    private final AtomicInteger cacheHits = new AtomicInteger(0);
    private final AtomicInteger promptTokens = new AtomicInteger(0);
    private final AtomicInteger completionTokens = new AtomicInteger(0);
    private final AtomicLong totalLatencyMs = new AtomicLong(0);
    private final AtomicInteger totalRetries = new AtomicInteger(0);
    private final AtomicInteger totalFailures = new AtomicInteger(0);
    private final AtomicInteger validationFailures = new AtomicInteger(0);
    private final AtomicInteger hallucinationFailures = new AtomicInteger(0);
    private final AtomicInteger providerErrors = new AtomicInteger(0);
    private final DoubleAdder totalCostUsd = new DoubleAdder();
    private final AtomicLong totalSummaryLength = new AtomicLong(0);
    private final AtomicInteger summaryCount = new AtomicInteger(0);

    public void recordRequest(int prompt, int completion, long latency, double costUsd, int summaryLength) {
        totalRequests.incrementAndGet();
        promptTokens.addAndGet(prompt);
        completionTokens.addAndGet(completion);
        totalLatencyMs.addAndGet(latency);
        totalCostUsd.add(costUsd);
        if (summaryLength > 0) {
            totalSummaryLength.addAndGet(summaryLength);
            summaryCount.incrementAndGet();
        }
    }

    public void recordCacheHit() {
        totalRequests.incrementAndGet();
        cacheHits.incrementAndGet();
    }

    public void recordRetry() {
        totalRetries.incrementAndGet();
    }

    public void recordFailure() {
        totalFailures.incrementAndGet();
    }

    public void recordValidationFailure() {
        validationFailures.incrementAndGet();
        totalFailures.incrementAndGet();
    }

    public void recordHallucinationFailure() {
        hallucinationFailures.incrementAndGet();
        totalFailures.incrementAndGet();
    }

    public void recordProviderError() {
        providerErrors.incrementAndGet();
        totalFailures.incrementAndGet();
    }

    public int getTotalRequests() { return totalRequests.get(); }
    public int getCacheHits() { return cacheHits.get(); }
    public double getCacheHitRate() {
        int req = totalRequests.get();
        return req > 0 ? (double) cacheHits.get() / req : 0.0;
    }
    public int getPromptTokens() { return promptTokens.get(); }
    public int getCompletionTokens() { return completionTokens.get(); }
    public long getAverageLatencyMs() {
        int req = totalRequests.get() - cacheHits.get();
        return req > 0 ? totalLatencyMs.get() / req : 0;
    }
    public int getTotalRetries() { return totalRetries.get(); }
    public int getTotalFailures() { return totalFailures.get(); }
    public int getValidationFailures() { return validationFailures.get(); }
    public int getHallucinationFailures() { return hallucinationFailures.get(); }
    public int getProviderErrors() { return providerErrors.get(); }
    public double getTotalCostUsd() { return totalCostUsd.sum(); }
    public double getTotalCostInr() { return totalCostUsd.sum() * 83.50; }
    public double getAverageSummaryLength() {
        int count = summaryCount.get();
        return count > 0 ? (double) totalSummaryLength.get() / count : 0.0;
    }
}
