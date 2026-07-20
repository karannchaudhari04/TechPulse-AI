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
      // Delegate to Firebase SDK to retrieve or silently refresh the ID token
      const token = await authService.getIdToken(false);
      if (!token) {
        console.warn('[SessionManager] Unable to retrieve valid Firebase ID token. Expiring session...');
        this.handleSessionExpired();
      }
    } catch (error: any) {
      console.error('[SessionManager] Failed to check or refresh token:', error);
      // Only expire session if explicit unauthenticated error occurs
      if (error?.code === 'auth/user-token-expired' || error?.code === 'auth/user-disabled' || error?.code === 'auth/user-not-found') {
        this.handleSessionExpired();
      }
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
