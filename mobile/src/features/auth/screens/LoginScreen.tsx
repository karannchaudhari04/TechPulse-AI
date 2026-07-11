import React, { useState } from 'react';
import { StyleSheet, View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from '../../../theme';
import { useAuth } from '../hooks/useAuth';
import { loginSchema, LoginFormData } from '../validation/authValidation';
import { ScreenContainer, SafeAreaWrapper } from '../../../components/common/Layout';
import { TextInput, PasswordInput } from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import { Toast } from '../../../components/common/NotificationUI';

/**
 * Purpose: Design System styled LoginScreen.
 * Handles form entry and state notifications.
 */
export default function LoginScreen({ navigation }: any) {
  const { colors, typography, spacing } = useTheme();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect email or password. Please try again.');
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
              Sign In
            </Text>

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
                  placeholder="Enter your password"
                  value={value}
                  onChangeText={onChange}
                  error={errors.password?.message}
                  disabled={isLoading}
                />
              )}
            />

            <Button
              title="Sign In"
              onPress={handleSubmit(onSubmit)}
              isLoading={isLoading}
              style={{ marginTop: spacing.sm }}
            />

            <Button
              title="Forgot Password?"
              onPress={() => navigation.navigate('ForgotPassword')}
              variant="outlined"
              style={{ marginTop: spacing.sm, borderWidth: 0 }}
              textStyle={{ color: colors.textSecondary }}
              disabled={isLoading}
            />
          </Card>

          <View style={[styles.footer, { marginVertical: spacing.lg }]}>
            <Text style={{ color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily }}>
              Don't have an account?{' '}
            </Text>
            <Button
              title="Sign Up"
              onPress={() => navigation.navigate('Register')}
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
});
