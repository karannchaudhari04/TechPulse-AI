import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, SafeAreaView
} from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { apiClient } from '../api/client';

interface WelcomeScreenProps {
  onSkip: () => void;
  onSignedIn: (hasPreferences: boolean) => void;
}

export default function WelcomeScreen({ onSkip, onSignedIn }: WelcomeScreenProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      // ── 1. Force the account picker to always appear ───────────────────────
      // This prevents silent auto-sign-in with the last used account.
      await GoogleSignin.signOut();

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();

      let idToken: string | null = null;
      if (signInResult.idToken) {
        idToken = signInResult.idToken;
      } else if ((signInResult as any).data?.idToken) {
        idToken = (signInResult as any).data.idToken;
      }

      if (!idToken) throw new Error('No ID token returned by Google Sign-In.');

      // ── 2. Sign in to Firebase ─────────────────────────────────────────────
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const firebaseUser = userCredential.user;

      // ── 3. Upsert user in our backend + check if preferences exist ─────────
      // This is isolated in its own try/catch: Firebase auth already succeeded above.
      // If the backend call fails (token timing, network, server down), we still
      // let the user in — defaulting to "no preferences" so they see Interests screen.
      let hasPreferences = false;
      try {
        // Small delay to ensure Firebase has fully propagated the token
        await new Promise(resolve => setTimeout(resolve, 500));
        const result = await apiClient.post<{ userId: number; hasPreferences: boolean }>(
          '/users/register-or-login',
          {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoUrl: firebaseUser.photoURL,
          }
        );
        hasPreferences = result.hasPreferences;
      } catch (backendError: any) {
        // Log for debugging but do NOT show an error to the user.
        // Sign-in was successful; backend sync is best-effort.
        console.warn('[TechBite] Backend register-or-login failed (non-critical):', backendError?.message);
      }

      // ── 4. Navigate based on whether preferences are already saved ─────────
      onSignedIn(hasPreferences);

    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User dismissed the picker — silent, no alert needed
      } else {
        console.error('Google Sign-In Error:', error);
        Alert.alert('Sign In Failed', error.message || 'Please try again.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Skip button */}
      <View style={styles.skipRow}>
        <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>SKIP</Text>
        </TouchableOpacity>
      </View>

      {/* Center content */}
      <View style={styles.center}>
        <View style={styles.logoBox}>
          <Text style={styles.logoGlyph}>{'</>'}</Text>
        </View>

        <Text style={styles.title}>TechBite<Text style={styles.dot}>.</Text></Text>
        <Text style={styles.subtitle}>
          Bite-sized tech knowledge{'\n'}for CS students & freshers
        </Text>

        <TouchableOpacity
          onPress={handleGoogleSignIn}
          disabled={isSigningIn}
          style={[styles.googleBtn, isSigningIn && styles.googleBtnDisabled]}
          activeOpacity={0.85}
        >
          {isSigningIn ? (
            <ActivityIndicator color="#E2E8F0" />
          ) : (
            <>
              <View style={styles.gIcon}>
                <Text style={styles.gText}>G</Text>
              </View>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  skipRow: { flexDirection: 'row', justifyContent: 'flex-end', padding: 20 },
  skipBtn: {
    paddingHorizontal: 18, paddingVertical: 8,
    backgroundColor: '#1E293B', borderRadius: 20, borderWidth: 1, borderColor: '#334155',
  },
  skipText: { color: '#94A3B8', fontWeight: '700', fontSize: 11, letterSpacing: 1.5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, marginTop: -40 },
  logoBox: {
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
    marginBottom: 28, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45, shadowRadius: 20, elevation: 12,
  },
  logoGlyph: { color: '#FFFFFF', fontSize: 34, fontWeight: '900' },
  title: { fontSize: 48, fontWeight: '900', color: '#F1F5F9', letterSpacing: -2, marginBottom: 12 },
  dot: { color: '#7C3AED' },
  subtitle: {
    color: '#64748B', fontSize: 17, textAlign: 'center',
    lineHeight: 26, fontWeight: '500', marginBottom: 52,
  },
  googleBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1E293B', paddingVertical: 18, borderRadius: 18,
    borderWidth: 1, borderColor: '#334155',
  },
  googleBtnDisabled: { opacity: 0.6 },
  gIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  gText: { color: '#3B82F6', fontWeight: '900', fontSize: 16 },
  googleBtnText: { color: '#F1F5F9', fontWeight: '700', fontSize: 17 },
});
