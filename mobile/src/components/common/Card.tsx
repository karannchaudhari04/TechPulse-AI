import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { useTheme } from '../../theme';

export type CardVariant = 'standard' | 'elevated' | 'glass';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Purpose: Reusable Card container wrapping children components.
 * Supports standard, shadow-elevated, and translucent glassmorphism layouts.
 * 
 * Props:
 * - children: Content nodes inside the card wrapper
 * - variant: Visual style preset ('standard' | 'elevated' | 'glass')
 * - style: View container layout style overrides
 * - accessibilityLabel: Descriptive voice-over label
 * 
 * Usage:
 * ```tsx
 * <Card variant="elevated">
 *   <Text>Card Content</Text>
 * </Card>
 * ```
 */
export default function Card({
  children,
  variant = 'standard',
  style,
  accessibilityLabel,
}: CardProps) {
  const { colors, radius, elevation } = useTheme();

  const cardStyles = [
    styles.base,
    {
      borderRadius: radius.md,
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
    },
    variant === 'standard' && {
      borderWidth: 1,
    },
    variant === 'elevated' && {
      borderWidth: Platform.OS === 'android' ? 1 : 0,
      ...elevation.md,
    },
    variant === 'glass' && {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    style,
  ] as StyleProp<ViewStyle>;

  return (
    <View 
      style={cardStyles}
      accessibilityRole="summary"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    padding: 16,
    overflow: 'hidden',
  },
});
