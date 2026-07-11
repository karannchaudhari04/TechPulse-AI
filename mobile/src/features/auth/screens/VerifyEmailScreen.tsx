import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { auth } from '../../../utils/firebase';
import { useTheme } from '../../../theme';
import { useAuth } from '../hooks/useAuth';
import { useAppDispatch } from '../../../store';
import { updateProfileDetails } from '../../../store/slices/profileSlice';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import Icon from '../../../components/common/Icon';
import { Toast } from '../../../components/common/NotificationUI';

/**
 * Purpose: Design System styled VerifyEmailScreen.
 * Requests email verification confirmation from users.
 */
export default function VerifyEmailScreen() {
  const { colors, typography, spacing } = useTheme();
  const { logout, sendEmailVerification, refreshProfile } = useAuth();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const checkVerificationStatus = async () => {
    setIsLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          dispatch(updateProfileDetails({ emailVerified: true }));
          await refreshProfile();
        } else {
          setToastMessage("Email is not verified yet. Please check your inbox.");
          setToastVisible(true);
        }
      }
    } catch (err: any) {
      setToastMessage(err.message || "Failed to check email status. Please try again.");
      setToastVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerificationLink = async () => {
    setIsLoading(true);
    try {
      await sendEmailVerification();
      setToastMessage("A new verification link has been sent to your email.");
      setToastVisible(true);
    } catch (err: any) {
      setToastMessage(err.message || "Failed to resend link. Please try again.");
      setToastVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaWrapper style={styles.container}>
      <Card variant="elevated" style={styles.card}>
        <View style={styles.iconContainer}>
          <Icon name="mail" provider="feather" size={64} color={colors.primary} />
        </View>

        <Text
          style={[
            styles.title,
            { color: colors.textPrimary, fontFamily: typography.titleLarge.fontFamily, marginVertical: spacing.md },
          ]}
        >
          Verify Your Email
        </Text>

        <Text
          style={[
            styles.description,
            { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginBottom: spacing.lg },
          ]}
        >
          We've sent a verification link to{' '}
          <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>
            {auth.currentUser?.email}
          </Text>
          . Please click the link in your email to complete registration.
        </Text>

        <Button
          title="I've Verified My Email"
          onPress={checkVerificationStatus}
          isLoading={isLoading}
          style={{ marginBottom: spacing.sm }}
        />

        <Button
          title="Resend Verification Link"
          onPress={resendVerificationLink}
          variant="outlined"
          disabled={isLoading}
          style={{ marginBottom: spacing.md }}
        />

        <Button
          title="Sign Out"
          onPress={logout}
          variant="outlined"
          style={{ borderWidth: 0 }}
          textStyle={{ color: colors.danger }}
          disabled={isLoading}
        />
      </Card>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        onDismiss={() => setToastVisible(false)}
      />
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  iconContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
