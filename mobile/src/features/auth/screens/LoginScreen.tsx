import React, { useState } from 'react';
import { StyleSheet, View, Text, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../theme';
import { useAppDispatch } from '../../../store';
import { skipAuth } from '../../../store/slices/authSlice';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import { Toast } from '../../../components/common/NotificationUI';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../../utils/firebase';

/**
 * Purpose: Design System styled LoginScreen.
 * Displays clean Google and Skip authentication actions.
 */
export default function LoginScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const { colors, typography, spacing, radius } = useTheme();
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
    } catch (error: any) {
      if (error.code !== 'ASYNC_OP_IN_PROGRESS') {
        setErrorMessage(error.message || 'Google Sign-In failed.');
        setToastVisible(true);
      }
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  const handleSkip = () => {
    dispatch(skipAuth());
  };

  return (
    <SafeAreaWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.header, { marginTop: spacing.xxl }]}>
            <View style={[styles.logoPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoText}>TP</Text>
            </View>
            <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.heading.fontFamily }]}>
              TechPulse AI
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily }]}>
              Summarized technology news personalized for you.
            </Text>
          </View>

          <Card variant="elevated" style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary, fontFamily: typography.titleMedium.fontFamily, marginBottom: spacing.md }]}>
              Welcome to TechPulse
            </Text>

            <TouchableOpacity
              onPress={handleGoogleSignIn}
              disabled={isGoogleSigningIn}
              style={[
                styles.googleBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.cardBackground,
                  borderRadius: radius.sm,
                  minHeight: 48,
                  paddingVertical: 12,
                  marginBottom: spacing.sm,
                }
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign in with Google"
            >
              {isGoogleSigningIn ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <View style={styles.googleBtnContent}>
                  <Image
                    source={require('../../../../assets/google.png')}
                    style={styles.googleIcon}
                    resizeMode="contain"
                  />
                  <Text style={[styles.googleBtnText, { color: colors.textPrimary, fontFamily: typography.button.fontFamily }]}>
                    Continue with Google
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <Button
              title="Skip"
              onPress={handleSkip}
              variant="outlined"
              style={{ marginTop: spacing.xs, borderWidth: 0 }}
              textStyle={{ color: colors.textSecondary }}
              disabled={isGoogleSigningIn}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast
        visible={toastVisible}
        message={errorMessage}
        onDismiss={() => setToastVisible(false)}
      />
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    marginHorizontal: 12,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
