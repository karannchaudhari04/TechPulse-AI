import React, { useState } from 'react';
import { View, Text, Pressable, SafeAreaView, StyleSheet, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../utils/firebase';
import { apiClient } from '../api/client';

interface WelcomeScreenProps {
  onSkip: () => void;
  onSignedIn: (hasPreferences: boolean) => void;
}

export default function WelcomeScreen({ onSkip, onSignedIn }: WelcomeScreenProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken || (response as any).idToken;

      if (!idToken) throw new Error("No ID token received from Google");

      const googleCredential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, googleCredential);

      try {
        const res = await apiClient.post<{ hasPreferences: boolean }>('/users/register-or-login', {});
        onSignedIn(res.hasPreferences);
      } catch (err) {
        onSignedIn(false);
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      Alert.alert("Sign In Failed", error.message || "Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0F172A', '#020617']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        
        <View style={styles.topBar}>
          <Pressable 
            onPress={onSkip}
            style={({ pressed }) => [
              styles.skipBtn,
              pressed && { opacity: 0.7, scale: 0.96 }
            ]}
          >
            <Text style={styles.skipText}>SKIP</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.logoWrapper}>
            <LinearGradient
              colors={['#6366F1', '#A855F7']}
              style={styles.logoGradient}
            >
              <Text style={styles.logoLetter}>T</Text>
            </LinearGradient>
          </View>

          <Text style={styles.brandTitle}>
            TechBite<Text style={styles.dot}>.</Text>
          </Text>

          <Text style={styles.tagline}>
            Tech wisdom for the{"\n"}ambitious CS student.
          </Text>
        </View>

        {/* Action Area - Widened Padding */}
        <View style={styles.actionArea}>
          <Pressable
            onPress={handleGoogleSignIn}
            disabled={isSigningIn}
            style={({ pressed }) => [
              styles.googleBtn,
              pressed && styles.googleBtnPressed,
              isSigningIn && { opacity: 0.8 }
            ]}
          >
            {isSigningIn ? (
              <ActivityIndicator color="#1F2937" />
            ) : (
              <View style={styles.googleBtnContent}>
                <Image
                  source="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                  style={styles.googleIcon}
                  contentFit="contain"
                />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </View>
            )}
          </Pressable>

          <Text style={styles.legalText}>
            By continuing, you agree to our{' '}
            <Text style={styles.link}>Terms</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: {
    paddingHorizontal: 24,
    paddingTop: 45,
    alignItems: 'flex-end',
  },
  skipBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  skipText: {
    color: '#CBD5E1',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  logoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 36,
    marginBottom: 32,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 20,
  },
  logoGradient: {
    flex: 1,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -2,
    marginBottom: 12,
  },
  dot: { color: '#6366F1' },
  tagline: {
    color: '#94A3B8',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '600',
  },
  actionArea: {
    paddingHorizontal: 20, // Reduced from 32 to give the button more width
    paddingBottom: 60,
    alignItems: 'center',
  },
  googleBtn: {
    width: '100%',
    height: 62, // Slightly taller for more presence
    backgroundColor: '#FFFFFF',
    borderRadius: 31,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnPressed: {
    backgroundColor: '#F9FAFB',
    transform: [{ scale: 0.98 }],
  },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 14,
  },
  googleBtnText: {
    color: '#1F2937',
    fontSize: 18, // Slightly larger for better scannability
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  legalText: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 28,
    lineHeight: 18,
    fontWeight: '600',
  },
  link: {
    color: '#94A3B8',
    textDecorationLine: 'underline',
  },
});