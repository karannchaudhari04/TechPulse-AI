import { auth } from '../../../utils/firebase';
import { authService, TOKEN_EXPIRATION_KEY } from './authService';
import { SecureStoreService } from '../../../services/secureStore';
import { store } from '../../../store';
import { setSessionExpired, setUnauthenticated } from '../../../store/slices/authSlice';

/**
 * Purpose: Manages token refresh monitoring, automated logouts, and token tracking hooks.
 * Checks token lifetimes and forces silent token refreshes via Firebase SDK
 * before tokens expire.
 */
class SessionManagerClass {
  private refreshTimer: any = null;

  startSessionMonitoring() {
    this.stopSessionMonitoring();

    // Check session validity every 5 minutes
    const checkInterval = 1000 * 60 * 5;
    this.refreshTimer = setInterval(async () => {
      await this.checkAndRefreshToken();
    }, checkInterval);

    // Initial check on initialization
    this.checkAndRefreshToken().catch(err => {
      console.warn('[SessionManager] Initial check failed:', err);
    });
  }

  stopSessionMonitoring() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private async checkAndRefreshToken() {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const expirationStr = await SecureStoreService.getItem(TOKEN_EXPIRATION_KEY);
      if (!expirationStr) return;

      const expirationTime = new Date(expirationStr).getTime();
      const currentTime = Date.now();
      const timeRemaining = expirationTime - currentTime;

      // If token expires in less than 10 minutes, trigger a refresh
      const refreshThreshold = 1000 * 60 * 10;

      if (timeRemaining <= 0) {
        console.warn('[SessionManager] Token has already expired. Logging out...');
        this.handleSessionExpired();
      } else if (timeRemaining < refreshThreshold) {
        console.info('[SessionManager] Token expiring soon. Refreshing ID token...');
        await authService.getIdToken(true);
      }
    } catch (error) {
      console.error('[SessionManager] Failed to check or refresh token:', error);
    }
  }

  private async handleSessionExpired() {
    this.stopSessionMonitoring();
    try {
      await authService.logout();
      store.dispatch(setSessionExpired());
    } catch (error) {
      console.error('[SessionManager] Sign out error:', error);
      store.dispatch(setUnauthenticated());
    }
  }
}

export const SessionManager = new SessionManagerClass();
