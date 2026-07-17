import React, { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  setAuthenticated, 
  setUnauthenticated, 
  setChecking 
} from '../store/slices/authSlice';
import { ProfileBootstrapService } from '../features/auth/services/ProfileBootstrapService';
import { SessionManager } from '../features/auth/services/SessionManager';

import AuthNavigator from './AuthNavigator';
import VerifyEmailScreen from '../features/auth/screens/VerifyEmailScreen';
import CompleteProfileScreen from '../features/auth/screens/CompleteProfileScreen';
import AccountLoadingScreen from '../features/auth/screens/AccountLoadingScreen';
import SessionExpiredScreen from '../features/auth/screens/SessionExpiredScreen';
import AppNavigator from './AppNavigator';
import { NavigationContainer } from '@react-navigation/native';

/**
 * Purpose: Root Navigator controlling application routing guards.
 * Implements an explicit state machine for:
 * - Booting / Checking -> AccountLoadingScreen
 * - Session Expired -> SessionExpiredScreen
 * - Unauthenticated -> AuthNavigator Stack
 * - Authenticated but unverified email -> VerifyEmailScreen
 * - Authenticated but incomplete onboarding -> CompleteProfileScreen
 * - Normal session -> AppNavigator Stack
 */
export default function RootNavigator() {
  const dispatch = useAppDispatch();
  const { sessionStatus } = useAppSelector((state) => state.auth);
  const { profile, loading: profileLoading } = useAppSelector((state) => state.profile);

  useEffect(() => {
    dispatch(setChecking());
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        dispatch(setAuthenticated({ uid: user.uid, email: user.email }));
        SessionManager.startSessionMonitoring();
        await ProfileBootstrapService.bootstrapProfile();
      } else {
        dispatch(setUnauthenticated());
        SessionManager.stopSessionMonitoring();
      }
    });

    return unsubscribe;
  }, [dispatch]);

  // 1. Session state checking loaders
  if (sessionStatus === 'idle' || sessionStatus === 'checking') {
    return <AccountLoadingScreen />;
  }

  // 2. Session expired notification dialogs
  if (sessionStatus === 'expired') {
    return <SessionExpiredScreen />;
  }

  // 3. Unauthenticated auth forms stack
  if (sessionStatus === 'unauthenticated') {
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  // 4. Authenticated profile bootstrap checks
  if (sessionStatus === 'authenticated' && (!profile || profileLoading)) {
    return <AccountLoadingScreen />;
  }

  // 5. Verification checks
  if (sessionStatus === 'authenticated' && !profile?.emailVerified) {
    return <VerifyEmailScreen />;
  }

  // 6. Onboarding checks
  if (sessionStatus === 'authenticated' && !profile?.isOnboarded) {
    return <CompleteProfileScreen />;
  }

  // 7. Render main application stacks
  return <AppNavigator />;
}
