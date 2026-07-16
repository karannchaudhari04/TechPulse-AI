import { CrashProvider, ConsoleCrashProvider } from './CrashProvider';

class CrashReporterServiceManager {
  private provider: CrashProvider = new ConsoleCrashProvider();

  setProvider(newProvider: CrashProvider) {
    this.provider = newProvider;
  }

  recordException(error: Error, context?: Record<string, any>) {
    this.provider.recordException(error, context);
  }

  recordFatal(error: Error) {
    this.provider.recordFatal(error);
  }

  recordHandled(error: Error) {
    this.provider.recordHandled(error);
  }

  setUser(userId: string | null) {
    this.provider.setUser(userId);
  }

  setCustomKey(key: string, value: any) {
    this.provider.setCustomKey(key, value);
  }

  leaveBreadcrumb(message: string, metadata?: Record<string, any>) {
    this.provider.leaveBreadcrumb(message, metadata);
  }
}

export const CrashReporterService = new CrashReporterServiceManager();
