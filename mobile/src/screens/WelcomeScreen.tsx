import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  SafeAreaView, 
  StyleSheet, 
  ActivityIndicator, 
  Image, 
  Dimensions, 
  ToastAndroid, 
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../utils/firebase';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming, 
  Easing
} from 'react-native-reanimated';
import { useTheme } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;

interface WelcomeScreenProps {
  onSkip: () => void;
  onSignedIn: (hasPreferences: boolean) => void;
  navigation: any;
}

export default function WelcomeScreen({ onSkip, onSignedIn, navigation }: WelcomeScreenProps) {
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const { colors } = useTheme();

  // Reanimated Shared Values
  const translateY = useSharedValue(0);

  // Typewriter tagline
  const [tagline, setTagline] = useState('');

  // Floating hover animation for TechBot Mascot
  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // Tagline typewriter execution
  useEffect(() => {
    const fullText = "Tech News, Made Easy!";
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < fullText.length) {
        setTagline((prev) => prev + fullText.charAt(idx));
        idx++;
      } else {
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Animated Styles
  const animatedBotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  // Handlers
  const handleSkipPress = () => {
    if (navigation && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      onSkip();
    }
  };

  const handleGoogleSignIn = async () => {
    if (isGoogleSigningIn) return;
    setIsGoogleSigningIn(true);
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
    } catch (error: any) {
      if (error.code !== 'ASYNC_OP_IN_PROGRESS') {
        ToastAndroid.show("Google Sign-In failed.", ToastAndroid.SHORT);
      }
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Absolute background gradient blob */}
      <LinearGradient 
        colors={['rgba(99, 102, 241, 0.12)', 'transparent']}
        style={styles.bgGlow}
      />

      <SafeAreaView style={styles.safeArea}>
        
        {/* Repositioned & Styled Top-Right Skip Capsule */}
        <View style={styles.topBar}>
          <Pressable onPress={handleSkipPress} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.innerContainer}>
          
          {/* Header Mascot + Logo Section */}
          <View style={styles.headerSection}>
            <View style={styles.botRow}>
              <Animated.View style={animatedBotStyle}>
                <Image 
                  source={require('../../assets/techbot.jpg')}
                  style={styles.botIcon}
                  resizeMode="contain"
                />
              </Animated.View>
              <View style={styles.brandContainer}>
                <View style={styles.logoRow}>
                  <Image 
                    source={require('../../assets/welcome_logo.jpg')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                  <Text style={styles.brandName}>TechPulse AI</Text>
                </View>
                <Text style={styles.tagline}>{tagline}</Text>
              </View>
            </View>
          </View>

          {/* Welcome CTA Card */}
          <View style={styles.cardContainer}>
            <View style={[styles.glassCard, { borderColor: colors.border }]}>
              
              <Text style={styles.welcomeTitle}>Let's get started!</Text>
              <Text style={styles.welcomeSubtitle}>
                Sign in to save your preferences, sync bookmarks, and access customized feeds across devices.
              </Text>

              {/* Primary Google Login Button */}
              <Pressable
                onPress={handleGoogleSignIn}
                disabled={isGoogleSigningIn}
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && styles.btnPressed
                ]}
              >
                <LinearGradient
                  colors={['#6366F1', '#4F46E5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {isGoogleSigningIn ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <View style={styles.googleContent}>
                      <Image 
                        source={require('../../assets/google.png')}
                        style={styles.googleIcon}
                        resizeMode="contain"
                      />
                      <Text style={styles.submitBtnText}>Continue with Google</Text>
                    </View>
                  )}
                </LinearGradient>
              </Pressable>

            </View>
          </View>

          {/* Legal Policy Links */}
          <Text style={styles.legalText}>
            By continuing, you agree to the <Text style={styles.link}>terms</Text> and <Text style={styles.link}>privacy policy</Text>.
          </Text>

        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  bgGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: scale(220) },
  safeArea: { flex: 1 },
  
  topBar: { 
    position: 'absolute', 
    top: Platform.OS === 'ios' ? scale(12) : scale(16), 
    right: scale(16), 
    zIndex: 10 
  },
  skipBtn: { 
    paddingHorizontal: scale(16), 
    paddingVertical: scale(8), 
    borderRadius: scale(20), 
    backgroundColor: 'rgba(255,255,255,0.06)', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.09)' 
  },
  skipText: { color: '#94A3B8', fontSize: scale(14), fontWeight: '800', letterSpacing: 0.2 },

  innerContainer: { flex: 1, paddingHorizontal: scale(24), justifyContent: 'space-between', paddingBottom: scale(20) },

  headerSection: { marginTop: scale(65), marginBottom: scale(15) },
  botRow: { flexDirection: 'row', alignItems: 'center', gap: scale(16) },
  botIcon: { width: scale(60), height: scale(60) },
  brandContainer: { flex: 1 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  logo: { width: scale(24), height: scale(24) },
  brandName: { color: '#F8FAFC', fontSize: scale(26), fontWeight: '900', letterSpacing: -0.5 },
  tagline: { color: '#94A3B8', fontSize: scale(14), marginTop: scale(4), fontWeight: '600' },

  cardContainer: { flex: 1, justifyContent: 'center' },
  glassCard: {
    width: '100%',
    borderRadius: scale(28),
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1.5,
    padding: scale(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    alignItems: 'center'
  },

  welcomeTitle: { color: '#FFFFFF', fontSize: scale(22), fontWeight: '900', letterSpacing: -0.5, marginBottom: scale(8), textAlign: 'center' },
  welcomeSubtitle: { color: '#94A3B8', fontSize: scale(14), lineHeight: scale(20), fontWeight: '500', textAlign: 'center', marginBottom: scale(24) },

  submitBtn: { width: '100%', height: scale(50), borderRadius: scale(25), shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  submitGradient: { width: '100%', height: '100%', borderRadius: scale(25), overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#FFFFFF', fontSize: scale(16), fontWeight: '800', letterSpacing: 0.5 },

  googleContent: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  googleIcon: { width: scale(20), height: scale(20) },

  btnPressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },

  legalText: { color: '#475569', fontSize: scale(12), textAlign: 'center', marginTop: scale(20), fontWeight: '600' },
  link: { color: '#6366F1', fontWeight: '700' }
}) as any;