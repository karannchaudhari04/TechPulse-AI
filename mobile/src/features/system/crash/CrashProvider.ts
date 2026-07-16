export interface CrashProvider {
  recordException(error: Error, context?: Record<string, any>): void;
  recordFatal(error: Error): void;
  recordHandled(error: Error): void;
  setUser(userId: string | null): void;
  setCustomKey(key: string, value: any): void;
  leaveBreadcrumb(message: string, metadata?: Record<string, any>): void;
}

/**
 * Purpose: Console-based crash logger for development purposes.
 */
export class ConsoleCrashProvider implements CrashProvider {
  recordException(error: Error, context?: Record<string, any>): void {
    console.error('[CrashReporter] recordException:', error, context);
  }

  recordFatal(error: Error): void {
    console.error('[CrashReporter] recordFatal (Fatal Crash):', error);
  }

  recordHandled(error: Error): void {
    console.info('[CrashReporter] recordHandled:', error);
  }

  setUser(userId: string | null): void {
    console.info(`[CrashReporter] setUser: ${userId}`);
  }

  setCustomKey(key: string, value: any): void {
    console.info(`[CrashReporter] setCustomKey: ${key} = ${value}`);
  }

  leaveBreadcrumb(message: string, metadata?: Record<string, any>): void {
    console.info(`[CrashReporter] [Breadcrumb] ${message}`, metadata);
  }
}
