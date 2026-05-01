import React, { useState } from 'react';
import { View, Text, Pressable, SafeAreaView, StyleSheet, ActivityIndicator, Alert, Image, Dimensions, ToastAndroid, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../utils/firebase';
import { apiClient } from '../api/client';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WelcomeScreenProps {
  onSkip: () => void;
  onSignedIn: (hasPreferences: boolean) => void;
}

export default function WelcomeScreen({ onSkip, onSignedIn }: WelcomeScreenProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken || (response as any).idToken;

      if (!idToken) throw new Error("No ID token received from Google");

      const googleCredential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, googleCredential);

      if (Platform.OS === 'android') {
        ToastAndroid.show("Sign in successful!", ToastAndroid.SHORT);
      }

      // Redundant sync removed. AppNavigator handles the handshake via onAuthStateChanged.
      // We just need to wait for the user to be signed into Firebase.
      // onSignedIn will be called by the AppNavigator's listener logic.
    } catch (error: any) {
      if (error.code !== 'ASYNC_OP_IN_PROGRESS') {
        Alert.alert("Sign In Failed", error.message || "Please try again.");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        
        <View style={styles.topBar}>
          <Pressable onPress={onSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.headerSection}>
            <View style={styles.logoRow}>
               <Image 
                  source={require('../../assets/welcome_logo.jpg')}
                  style={styles.abstractLogo}
                  resizeMode="contain"
               />
               <Text style={styles.brandName}>TechBite</Text>
            </View>
            <Text style={styles.tagline}>Tech News, Made Easy!</Text>
          </View>
          
          <View style={styles.illustrationSection}>
            <Image 
              source={require('../../assets/welcome_illustration.jpg')}
              style={styles.illustration}
              resizeMode="contain"
            />
          </View>

          <View style={styles.titleSection}>
             <Text style={styles.mainTitle}>Let's get started!</Text>
             <Text style={styles.subTitle}>Signing up helps us save your preferences.</Text>
          </View>

          <View style={styles.actionArea}>
            <Pressable
              onPress={handleGoogleSignIn}
              disabled={isSigningIn}
              style={({ pressed }) => [styles.socialBtn, pressed && styles.btnPressed]}
            >
              <View style={styles.btnContent}>
                  {isSigningIn ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Image 
                        source={require('../../assets/google.png')}
                        style={styles.googleIcon}
                        resizeMode="contain"
                      />
                      <Text style={styles.socialBtnText}>Sign up with Google.</Text>
                    </>
                  )}
              </View>
            </Pressable>

            <Text style={styles.legalText}>
              By continuing, you agree to the <Text style={styles.link}>rules</Text> and <Text style={styles.link}>privacy policy</Text>.
            </Text>
          </View>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  safeArea: { flex: 1 },
  contentContainer: { flex: 1, justifyContent: 'space-between', paddingBottom: 40 },
  topBar: { paddingHorizontal: 24, marginTop: 20, paddingBottom: 10, alignItems: 'flex-end' },
  skipBtn: { padding: 8 },
  skipText: { color: '#6366F1', fontSize: 17, fontWeight: '700' },
  headerSection: { alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  abstractLogo: { width: 44, height: 44 },
  brandName: { color: '#F8FAFC', fontSize: 34, fontWeight: '900', letterSpacing: -0.5 },
  tagline: { color: '#94A3B8', fontSize: 18, marginTop: 6, fontWeight: '600' },
  illustrationSection: { width: '100%', height: SCREEN_HEIGHT * 0.32, justifyContent: 'center', alignItems: 'center' },
  illustration: { width: '88%', height: '100%' },
  titleSection: { alignItems: 'center', paddingHorizontal: 40 },
  mainTitle: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  subTitle: { color: '#94A3B8', fontSize: 17, textAlign: 'center', marginTop: 10, lineHeight: 24, fontWeight: '500' },
  actionArea: { paddingHorizontal: 28 },
  socialBtn: { width: '100%', height: 62, backgroundColor: '#1E293B', borderRadius: 14, borderWidth: 1, borderColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 14 },
  googleIcon: { width: 22, height: 22 },
  socialBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  btnPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  legalText: { color: '#475569', fontSize: 13, textAlign: 'center', marginTop: 30, fontWeight: '500' },
  link: { color: '#6366F1', fontWeight: '600' }
});