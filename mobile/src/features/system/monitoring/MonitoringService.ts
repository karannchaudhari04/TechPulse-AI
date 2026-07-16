export interface SystemMetrics {
  coldStartDurationMs?: number;
  warmStartDurationMs?: number;
  lastNavigationDurationMs?: number;
  apiLatencyRecord: Record<string, number[]>;
  cacheHitRatio: number;
  memoryWarningsCount: number;
  jsExceptionsCount: number;
  offlineQueueSize: number;
  lastSyncDurationMs?: number;
}

class MonitoringServiceManager {
  private metrics: SystemMetrics = {
    apiLatencyRecord: {},
    cacheHitRatio: 1.0,
    memoryWarningsCount: 0,
    jsExceptionsCount: 0,
    offlineQueueSize: 0,
  };

  private bootTime = Date.now();

  recordColdStart() {
    const duration = Date.now() - this.bootTime;
    this.metrics.coldStartDurationMs = duration;
    console.info(`[Monitoring] App Cold Start took ${duration}ms`);
  }

  recordWarmStart() {
    this.metrics.warmStartDurationMs = Date.now() - this.bootTime;
    console.info(`[Monitoring] App Warm Start recorded`);
  }

  recordNavigation(duration: number) {
    this.metrics.lastNavigationDurationMs = duration;
  }

  recordApiLatency(endpoint: string, latency: number) {
    if (!this.metrics.apiLatencyRecord[endpoint]) {
      this.metrics.apiLatencyRecord[endpoint] = [];
    }
    this.metrics.apiLatencyRecord[endpoint].push(latency);
    // Keep last 5 entries
    if (this.metrics.apiLatencyRecord[endpoint].length > 5) {
      this.metrics.apiLatencyRecord[endpoint].shift();
    }
  }

  recordCacheHit(hit: boolean) {
    // Basic running average tracking
    const current = this.metrics.cacheHitRatio;
    this.metrics.cacheHitRatio = hit ? current * 0.9 + 0.1 : current * 0.9;
  }

  recordMemoryWarning() {
    this.metrics.memoryWarningsCount += 1;
    console.warn(`[Monitoring] Memory Warning intercepted! count=${this.metrics.memoryWarningsCount}`);
  }

  recordJsException() {
    this.metrics.jsExceptionsCount += 1;
  }

  updateOfflineQueueSize(size: number) {
    this.metrics.offlineQueueSize = size;
  }

  recordSyncDuration(duration: number) {
    this.metrics.lastSyncDurationMs = duration;
  }

  getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }
}

export const MonitoringService = new MonitoringServiceManager();
