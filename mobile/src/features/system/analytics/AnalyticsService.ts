import { AnalyticsProvider, ConsoleAnalyticsProvider } from './AnalyticsProvider';

class AnalyticsServiceManager {
  private provider: AnalyticsProvider = new ConsoleAnalyticsProvider();
  private timers: Record<string, number> = {};

  setProvider(newProvider: AnalyticsProvider) {
    this.provider = newProvider;
  }

  trackScreen(screenName: string, properties?: Record<string, any>) {
    this.provider.trackScreen(screenName, properties);
  }

  trackEvent(eventName: string, properties?: Record<string, any>) {
    this.provider.trackEvent(eventName, properties);
  }

  setUser(userId: string | null) {
    this.provider.setUser(userId);
  }

  setProperty(name: string, value: any) {
    this.provider.setProperty(name, value);
  }

  startTimer(eventName: string) {
    this.timers[eventName] = Date.now();
  }

  stopTimer(eventName: string, properties?: Record<string, any>) {
    const start = this.timers[eventName];
    if (start) {
      const duration = Date.now() - start;
      delete this.timers[eventName];
      this.trackEvent(eventName, { ...properties, durationMs: duration });
    }
  }

  flush(): Promise<void> {
    return this.provider.flush();
  }
}

export const AnalyticsService = new AnalyticsServiceManager();
