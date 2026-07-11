import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store';
import { 
  setAuthenticated, 
  setUnauthenticated, 
  setChecking 
} from '../../../store/slices/authSlice';
import { clearProfile } from '../../../store/slices/profileSlice';
import { authService } from '../services/authService';
import { ProfileBootstrapService } from '../services/ProfileBootstrapService';
import { SessionManager } from '../services/SessionManager';

/**
 * Purpose: Unified custom hook for consuming authentication features.
 * Exposes login/register triggers, user identity details, profiles, and loader status.
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);
  const profileState = useAppSelector((state) => state.profile);

  const login = useCallback(async (email: string, password: string) => {
    dispatch(setChecking());
    try {
      const user = await authService.login(email, password);
      dispatch(setAuthenticated({ uid: user.uid, email: user.email }));
      
      SessionManager.startSessionMonitoring();
      await ProfileBootstrapService.bootstrapProfile();
    } catch (error) {
      dispatch(setUnauthenticated());
      throw error;
    }
  }, [dispatch]);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    dispatch(setChecking());
    try {
      const user = await authService.register(email, password, displayName);
      dispatch(setAuthenticated({ uid: user.uid, email: user.email }));
      
      await authService.sendEmailVerification();
      SessionManager.startSessionMonitoring();
      await ProfileBootstrapService.bootstrapProfile();
    } catch (error) {
      dispatch(setUnauthenticated());
      throw error;
    }
  }, [dispatch]);

  const logout = useCallback(async () => {
    dispatch(setChecking());
    try {
      SessionManager.stopSessionMonitoring();
      await authService.logout();
    } finally {
      dispatch(setUnauthenticated());
      dispatch(clearProfile());
    }
  }, [dispatch]);

  const sendPasswordReset = useCallback(async (email: string) => {
    await authService.sendPasswordReset(email);
  }, []);

  const sendEmailVerification = useCallback(async () => {
    await authService.sendEmailVerification();
  }, []);

  const refreshProfile = useCallback(async () => {
    await ProfileBootstrapService.bootstrapProfile();
  }, []);

  return {
    user: authState.user,
    sessionStatus: authState.sessionStatus,
    profile: profileState.profile,
    profileLoading: profileState.loading,
    profileError: profileState.error,
    login,
    register,
    logout,
    sendPasswordReset,
    sendEmailVerification,
    refreshProfile,
  };
}
