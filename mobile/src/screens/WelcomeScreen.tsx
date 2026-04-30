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
        const res = await apiClient.post<{ hasPreferences: boolean }>('/users/register-or-login', {
          email: auth.currentUser?.email,
          displayName: auth.currentUser?.displayName,
          photoUrl: auth.currentUser?.photoURL
        });
        onSignedIn(res.hasPreferences);
      } catch (err) {
        console.error("Backend Registration Failed:", err);
        Alert.alert("Server Error", "Successfully signed in with Google, but could not connect to TechBite server. Please check your internet or try again later.");
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
      <View style={styles.darkOverlay} />
      
      <SafeAreaView style={styles.safeArea}>
        
        {/* Top Header with Skip */}
        <View style={styles.topBar}>
          <Pressable onPress={onSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        {/* Brand & Tagline */}
        <View style={styles.hero}>
          <Image 
            source={require('../../assets/logo_horizontal.png')}
            style={styles.brandLogo}
            contentFit="contain"
          />
          <Text style={styles.tagline}>Tech News, Made Easy!</Text>
          
          {/* Central Illustration Placeholder (Matching DevBytes) */}
          <View style={styles.illustrationBox}>
            <Image 
               source="https://ouch-cdn2.icons8.com/Z8v_V3Xq_I3Q7X9Zq_Y3Xq_I3Q7X9Zq_Y3Xq_I3Q7X9Zq_Y3Xq_I.png" // Placeholder tech illustration
               style={styles.illustration}
               contentFit="contain"
            />
          </View>

          <Text style={styles.mainTitle}>Let’s get started!</Text>
          <Text style={styles.subTitle}>Signing up helps us save your preferences.</Text>
        </View>

        {/* Action Area - Social Buttons */}
        <View style={styles.actionArea}>
          <Pressable
            onPress={handleGoogleSignIn}
            disabled={isSigningIn}
            style={({ pressed }) => [
              styles.socialBtn,
              pressed && { opacity: 0.8, scale: 0.98 }
            ]}
          >
            <View style={styles.socialBtnContent}>
              <Image
                source="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                style={styles.socialIcon}
              />
              <Text style={styles.socialBtnText}>Sign up with Google.</Text>
              {isSigningIn && <ActivityIndicator color="#FFF" style={{ marginLeft: 10 }} />}
            </View>
          </Pressable>

          <Pressable
            onPress={() => Alert.alert("Coming Soon", "GitHub login will be available in the next update!")}
            style={({ pressed }) => [
              styles.socialBtn,
              { marginTop: 16 },
              pressed && { opacity: 0.8, scale: 0.98 }
            ]}
          >
            <View style={styles.socialBtnContent}>
              <Image
                source="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg"
                style={[styles.socialIcon, { tintColor: '#FFF' }]}
              />
              <Text style={styles.socialBtnText}>Sign up with GitHub.</Text>
            </View>
          </Pressable>

          <Text style={styles.legalText}>
            By continuing, you agree to the <Text style={styles.link}>rules</Text> and <Text style={styles.link}>privacy policy</Text>.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  safeArea: { flex: 1 },
  topBar: { paddingHorizontal: 24, paddingTop: 20, alignItems: 'flex-end' },
  skipText: { color: '#818CF8', fontSize: 16, fontWeight: '700' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  brandLogo: { width: 220, height: 60, marginBottom: 8 },
  tagline: { color: '#94A3B8', fontSize: 18, fontWeight: '500', marginBottom: 40 },
  illustrationBox: { width: '100%', height: 220, marginBottom: 40 },
  illustration: { width: '100%', height: '100%' },
  mainTitle: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginBottom: 12 },
  subTitle: { color: '#64748B', fontSize: 16, textAlign: 'center', marginBottom: 40, fontWeight: '500' },
  actionArea: { paddingHorizontal: 24, paddingBottom: 40 },
  socialBtn: {
    width: '100%',
    height: 64,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialBtnContent: { flexDirection: 'row', alignItems: 'center' },
  socialIcon: { width: 24, height: 24, marginRight: 16 },
  socialBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  legalText: { color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 32 },
  link: { color: '#6366F1', textDecorationLine: 'underline' }
});