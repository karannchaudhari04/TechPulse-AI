import React, { useState } from 'react';
import { StyleSheet, View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from '../../../theme';
import { useAuth } from '../hooks/useAuth';
import { forgotPasswordSchema, ForgotPasswordFormData } from '../validation/authValidation';
import { ScreenContainer, SafeAreaWrapper } from '../../../components/common/Layout';
import { TextInput } from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import { Toast } from '../../../components/common/NotificationUI';

/**
 * Purpose: Design System styled ForgotPasswordScreen.
 * Handles forgot password entry and verification link.
 */
export default function ForgotPasswordScreen({ navigation }: any) {
  const { colors, typography, spacing } = useTheme();
  const { sendPasswordReset } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await sendPasswordReset(data.email);
      setToastMessage('A password reset link has been sent to your email.');
      setToastVisible(true);
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2500);
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to send password reset link. Please check your email.');
      setToastVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.header, { marginTop: spacing.xxl }]}>
            <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.heading.fontFamily }]}>
              Reset Password
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily }]}>
              Enter your email and we'll send you a link to reset your password.
            </Text>
          </View>

          <Card variant="elevated" style={styles.card}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="Email Address"
                  placeholder="name@company.com"
                  value={value}
                  onChangeText={onChange}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  disabled={isLoading}
                />
              )}
            />

            <Button
              title="Send Reset Link"
              onPress={handleSubmit(onSubmit)}
              isLoading={isLoading}
              style={{ marginTop: spacing.sm }}
            />
          </Card>

          <Button
            title="Back to Sign In"
            onPress={() => navigation.navigate('Login')}
            variant="outlined"
            style={{ marginTop: spacing.lg, borderWidth: 0 }}
            textStyle={{ color: colors.primary, fontWeight: 'bold' }}
            disabled={isLoading}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast
        visible={toastVisible}
        message={toastMessage}
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
    marginBottom: 24,
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
});
