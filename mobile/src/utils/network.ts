type NetworkListener = (isOnline: boolean) => void;

class NetworkStatusTracker {
  private isOnline: boolean = true;
  private listeners: Set<NetworkListener> = new Set();

  setOnline(status: boolean) {
    if (this.isOnline !== status) {
      this.isOnline = status;
      this.listeners.forEach((listener) => {
        try {
          listener(status);
        } catch (err) {
          console.error('[NetworkStatusTracker] Listener error:', err);
        }
      });
    }
  }

  getIsOnline() {
    return this.isOnline;
  }

  subscribe(listener: NetworkListener) {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const networkTracker = new NetworkStatusTracker();
