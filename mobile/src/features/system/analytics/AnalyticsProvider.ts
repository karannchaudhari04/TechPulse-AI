export interface AnalyticsProvider {
  trackScreen(screenName: string, properties?: Record<string, any>): void;
  trackEvent(eventName: string, properties?: Record<string, any>): void;
  setUser(userId: string | null): void;
  setProperty(name: string, value: any): void;
  flush(): Promise<void>;
}

/**
 * Purpose: Dev mock provider printing events to local developer console.
 */
export class ConsoleAnalyticsProvider implements AnalyticsProvider {
  trackScreen(screenName: string, properties?: Record<string, any>): void {
    console.info(`[Analytics] [Screen] ${screenName}`, properties);
  }

  trackEvent(eventName: string, properties?: Record<string, any>): void {
    console.info(`[Analytics] [Event] ${eventName}`, properties);
  }

  setUser(userId: string | null): void {
    console.info(`[Analytics] [User] Identify: ${userId}`);
  }

  setProperty(name: string, value: any): void {
    console.info(`[Analytics] [UserProperty] ${name} = ${value}`);
  }

  async flush(): Promise<void> {
    console.info('[Analytics] Flush completed');
  }
}
