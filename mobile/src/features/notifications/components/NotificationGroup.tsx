import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../../../theme';

export interface NotificationGroupProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Purpose: Header grouping sections separating Today, Yesterday, and Older notifications.
 */
export default function NotificationGroup({ title, children }: NotificationGroupProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.xs }]}>
        <Text style={[styles.title, { color: colors.textSecondary, fontFamily: typography.titleSmall.fontFamily }]}>
          {title}
        </Text>
      </View>
      <View style={styles.list}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 8,
  },
  header: {
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  list: {
    width: '100%',
  },
});
