import { AppState, AppStateStatus } from 'react-native';
import { store } from '../../../store';
import { notificationApiSlice } from '../api/notificationApiSlice';

/**
 * Purpose: Synchronization manager orchestrating connections checks.
 * Starts adaptive polling intervals (30s-60s) and suspends loops when the app enters background status.
 */
export class NotificationSyncService {
  private static pollInterval: NodeJS.Timeout | null = null;
  private static appStateSubscription: any = null;
  private static isPollingActive = false;

  static initialize() {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    this.startSync();
  }

  static shutdown() {
    this.stopSync();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }

  private static handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      console.info('[NotificationSyncService] App active. Resuming sync...');
      this.startSync();
    } else {
      console.info('[NotificationSyncService] App backgrounded. Pausing sync...');
      this.stopSync();
    }
  };

  private static startSync() {
    if (this.isPollingActive) return;
    this.isPollingActive = true;
    
    this.triggerFetch();

    this.pollInterval = setInterval(() => {
      this.triggerFetch();
    }, 30000);
  }

  private static stopSync() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPollingActive = false;
  }

  private static triggerFetch() {
    store.dispatch(notificationApiSlice.endpoints.getNotifications.initiate(undefined, { subscribe: false, forceRefetch: true }));
    store.dispatch(notificationApiSlice.endpoints.getUnreadCount.initiate(undefined, { subscribe: false, forceRefetch: true }));
  }
}
