import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../../../theme';
import { useAppDispatch } from '../../../store';
import { setUnauthenticated } from '../../../store/slices/authSlice';
import { clearProfile } from '../../../store/slices/profileSlice';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import Icon from '../../../components/common/Icon';

/**
 * Purpose: SessionExpiredScreen showing alert screen when active auth token expires.
 */
export default function SessionExpiredScreen() {
  const { colors, typography, spacing } = useTheme();
  const dispatch = useAppDispatch();

  const handleSignInPress = () => {
    dispatch(setUnauthenticated());
    dispatch(clearProfile());
  };

  return (
    <SafeAreaWrapper style={styles.container}>
      <Card variant="elevated" style={styles.card}>
        <View style={styles.iconContainer}>
          <Icon name="clock" provider="feather" size={64} color={colors.warning} />
        </View>

        <Text
          style={[
            styles.title,
            { color: colors.textPrimary, fontFamily: typography.titleLarge.fontFamily, marginVertical: spacing.md },
          ]}
        >
          Session Expired
        </Text>

        <Text
          style={[
            styles.description,
            { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginBottom: spacing.lg },
          ]}
        >
          Your login session has expired due to inactivity. Please sign in again to access your personalized technology updates.
        </Text>

        <Button
          title="Return to Sign In"
          onPress={handleSignInPress}
          style={{ width: '100%' }}
        />
      </Card>
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
