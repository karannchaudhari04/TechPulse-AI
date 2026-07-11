import React, { useState } from 'react';
import { StyleSheet, View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from '../../../theme';
import { useAuth } from '../hooks/useAuth';
import { registerSchema, RegisterFormData } from '../validation/authValidation';
import { ScreenContainer, SafeAreaWrapper } from '../../../components/common/Layout';
import { TextInput, PasswordInput } from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import { Toast } from '../../../components/common/NotificationUI';

/**
 * Purpose: Design System styled RegisterScreen.
 * Handles form entry and state notifications.
 */
export default function RegisterScreen({ navigation }: any) {
  const { colors, typography, spacing } = useTheme();
  const { register: signup } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await signup(data.email, data.password, data.displayName);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check details.');
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
          <View style={[styles.header, { marginTop: spacing.xl }]}>
            <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.heading.fontFamily }]}>
              Create Account
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily }]}>
              Join TechPulse AI to customize your daily brief.
            </Text>
          </View>

          <Card variant="elevated" style={styles.card}>
            <Controller
              control={control}
              name="displayName"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  label="Full Name"
                  placeholder="John Doe"
                  value={value}
                  onChangeText={onChange}
                  error={errors.displayName?.message}
                  disabled={isLoading}
                />
              )}
            />

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

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <PasswordInput
                  label="Password"
                  placeholder="Min. 6 characters"
                  value={value}
                  onChangeText={onChange}
                  error={errors.password?.message}
                  disabled={isLoading}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <PasswordInput
                  label="Confirm Password"
                  placeholder="Re-enter password"
                  value={value}
                  onChangeText={onChange}
                  error={errors.confirmPassword?.message}
                  disabled={isLoading}
                />
              )}
            />

            <Button
              title="Create Account"
              onPress={handleSubmit(onSubmit)}
              isLoading={isLoading}
              style={{ marginTop: spacing.sm }}
            />
          </Card>

          <View style={[styles.footer, { marginVertical: spacing.lg }]}>
            <Text style={{ color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily }}>
              Already have an account?{' '}
            </Text>
            <Button
              title="Sign In"
              onPress={() => navigation.navigate('Login')}
              variant="outlined"
              style={{ minHeight: 32, paddingVertical: 4, paddingHorizontal: 12, borderWidth: 0 }}
              textStyle={{ color: colors.primary, fontWeight: 'bold' }}
              disabled={isLoading}
            />
          </View>
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
