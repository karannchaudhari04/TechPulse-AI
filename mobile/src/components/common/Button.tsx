import React from 'react';
import { 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  StyleProp, 
  ViewStyle, 
  TextStyle 
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme';
import Icon, { IconProvider } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'outlined' | 'icon';

export interface ButtonProps {
  title?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
  iconName?: string;
  iconProvider?: IconProvider;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  enableHaptics?: boolean;
  accessibilityLabel?: string;
}

/**
 * Purpose: Reusable Button component implementing Design System standards.
 * Supports primary, secondary, outlined, and icon states with haptics and loader feedbacks.
 * 
 * Props:
 * - title: Text label to render (ignored in 'icon' variant)
 * - onPress: Function to call on press
 * - variant: Visual button style preset ('primary' | 'secondary' | 'outlined' | 'icon')
 * - isLoading: Toggles spinner loading overlay
 * - disabled: Inactivates interaction and dims background
 * - iconName: Optional vector icon name
 * - iconProvider: Vector icon set library
 * - iconSize: Pixel size of the icon (default 18)
 * - style: View wrapper overrides
 * - textStyle: Text label styling overrides
 * - enableHaptics: Toggles light touch trigger response
 * 
 * Usage:
 * ```tsx
 * <Button title="Submit Preferences" onPress={() => console.log('Submit')} variant="primary" />
 * ```
 */
export default function Button({
  title,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  iconName,
  iconProvider,
  iconSize = 18,
  style,
  textStyle,
  enableHaptics = true,
  accessibilityLabel,
}: ButtonProps) {
  const { colors, typography, spacing, radius } = useTheme();

  const handlePress = () => {
    if (disabled || isLoading) return;
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  const isIconButton = variant === 'icon';

  const buttonStyles = [
    styles.base,
    { borderRadius: radius.sm },
    variant === 'primary' && { backgroundColor: colors.primary },
    variant === 'secondary' && { backgroundColor: colors.secondary },
    variant === 'outlined' && { 
      backgroundColor: 'transparent', 
      borderWidth: 1, 
      borderColor: colors.primary 
    },
    variant === 'icon' && {
      backgroundColor: 'transparent',
      padding: spacing.xs,
      borderRadius: radius.full,
      minWidth: 40,
      height: 40,
      justifyContent: 'center',
    },
    (disabled || isLoading) && styles.disabled,
    style,
  ] as StyleProp<ViewStyle>;

  const textStyles = [
    { fontFamily: typography.button.fontFamily, fontSize: typography.button.fontSize, fontWeight: typography.button.fontWeight },
    variant === 'primary' && { color: '#FFFFFF' },
    variant === 'secondary' && { color: '#FFFFFF' },
    variant === 'outlined' && { color: colors.primary },
    textStyle,
  ] as StyleProp<TextStyle>;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
      style={buttonStyles}
      accessibilityRole={isIconButton ? 'imagebutton' : 'button'}
      accessibilityState={{ disabled, busy: isLoading }}
      accessibilityLabel={accessibilityLabel || title}
    >
      {isLoading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outlined' ? colors.primary : '#FFFFFF'} 
        />
      ) : (
        <>
          {iconName && (
            <Icon
              name={iconName}
              provider={iconProvider}
              size={iconSize}
              color={variant === 'outlined' ? colors.primary : '#FFFFFF'}
              style={!isIconButton ? { marginRight: spacing.xs } : undefined}
            />
          )}
          {!isIconButton && title && (
            <Text style={textStyles}>{title}</Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  disabled: {
    opacity: 0.5,
  },
});
