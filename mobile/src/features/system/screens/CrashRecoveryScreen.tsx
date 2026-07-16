import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Clipboard, ScrollView } from 'react-native';
import { useTheme } from '../../../theme';
import Icon from '../../../components/common/Icon';
import Button from '../../../components/common/Button';

export interface CrashRecoveryScreenProps {
  error: Error;
  onReset: () => void;
}

/**
 * Purpose: Dedicated crash recovery dashboard. Renders stack traces and copy/restart action controls.
 */
export default function CrashRecoveryScreen({ error, onReset }: CrashRecoveryScreenProps) {
  const { colors, typography, spacing, radius } = useTheme();

  const handleCopyError = () => {
    Clipboard.setString(`${error.message}\n${error.stack || ''}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Icon name="alert-triangle" provider="feather" size={48} color={colors.danger} />
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: typography.titleLarge.fontFamily, marginTop: spacing.md }]}>
          Oops! Something went wrong
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: typography.bodyMedium.fontFamily }]}>
          The application encountered an unexpected rendering error.
        </Text>
      </View>

      <ScrollView style={[styles.errorLog, { backgroundColor: colors.divider, borderRadius: radius.sm, marginVertical: spacing.md }]} contentContainerStyle={{ padding: spacing.sm }}>
        <Text style={[styles.errorText, { color: colors.danger, fontFamily: typography.caption.fontFamily }]}>
          {error.message}
        </Text>
        {error.stack && (
          <Text style={[styles.stackText, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily, marginTop: spacing.xs }]}>
            {error.stack}
          </Text>
        )}
      </ScrollView>

      <View style={styles.actionRow}>
        <Button 
          title="Try Again" 
          onPress={onReset}
          style={{ flex: 1, minHeight: 40 }}
        />
        <TouchableOpacity 
          onPress={handleCopyError}
          style={[styles.outlineBtn, { borderColor: colors.border, borderRadius: radius.sm }]}
          accessibilityRole="button"
          accessibilityLabel="Copy error trace to clipboard"
        >
          <Icon name="copy" provider="feather" size={16} color={colors.textPrimary} />
          <Text style={[styles.outlineBtnText, { color: colors.textPrimary, fontFamily: typography.bodyMedium.fontFamily }]}>
            Copy Error
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  errorLog: {
    maxHeight: 200,
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  stackText: {
    fontSize: 10,
    lineHeight: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    height: 40,
    paddingHorizontal: 16,
    gap: 6,
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
