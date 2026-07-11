import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../../../theme';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import { LoadingIndicator } from '../../../components/common/Loader';

/**
 * Purpose: AccountLoadingScreen shown during server handshake or session restore updates.
 */
export default function AccountLoadingScreen() {
  const { colors, typography, spacing } = useTheme();

  return (
    <SafeAreaWrapper style={styles.container}>
      <View style={styles.content}>
        <LoadingIndicator size="large" color={colors.primary} />
        <Text
          style={[
            styles.title,
            { color: colors.textPrimary, fontFamily: typography.titleSmall.fontFamily, marginTop: spacing.md },
          ]}
        >
          Synchronizing Profile
        </Text>
        <Text
          style={[
            styles.description,
            { color: colors.textSecondary, fontFamily: typography.caption.fontFamily, marginTop: spacing.xs },
          ]}
        >
          Securing authentication keys and loading personalized briefings...
        </Text>
      </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    maxWidth: '80%',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
