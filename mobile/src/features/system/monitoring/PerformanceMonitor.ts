import { InteractionManager } from 'react-native';

/**
 * Purpose: Performance monitor hook wrapping InteractionManager task deferrals.
 */
export const PerformanceMonitor = {
  initialize() {
    console.info('[PerformanceMonitor] Telemetry listeners initialized');
  },

  runAfterInteractions(task: () => void) {
    InteractionManager.runAfterInteractions(() => {
      task();
    });
  }
};
