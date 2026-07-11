import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../../../theme';
import { useAuth } from '../hooks/useAuth';
import { SafeAreaWrapper } from '../../../components/common/Layout';
import Button from '../../../components/common/Button';
import Card from '../../../components/common/Card';
import Icon from '../../../components/common/Icon';

/**
 * Purpose: UnauthorizedScreen showing alert screen when role verification fails.
 */
export default function UnauthorizedScreen({ navigation }: any) {
  const { colors, typography, spacing } = useTheme();
  const { logout } = useAuth();

  return (
    <SafeAreaWrapper style={styles.container}>
      <Card variant="elevated" style={styles.card}>
        <View style={styles.iconContainer}>
          <Icon name="shield-off" provider="feather" size={64} color={colors.danger} />
        </View>

        <Text
          style={[
            styles.title,
            { color: colors.textPrimary, fontFamily: typography.titleLarge.fontFamily, marginVertical: spacing.md },
          ]}
        >
          Access Denied
        </Text>

        <Text
          style={[
            styles.description,
            { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily, marginBottom: spacing.lg },
          ]}
        >
          You do not have permission to access this area. If you believe this is an error, please contact your administrator.
        </Text>

        {navigation && navigation.canGoBack() && (
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            style={{ width: '100%', marginBottom: spacing.sm }}
          />
        )}

        <Button
          title="Sign Out"
          onPress={logout}
          variant="outlined"
          style={{ width: '100%', borderColor: colors.danger }}
          textStyle={{ color: colors.danger }}
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
