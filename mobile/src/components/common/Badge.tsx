import React, { useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StyleProp, 
  ViewStyle, 
  TextStyle 
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme';
import Icon from './Icon';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Purpose: Reusable pill-shaped Chip (used for filter states or interest configurations).
 */
export function Chip({
  label,
  selected = false,
  onPress,
  onClose,
  style,
  textStyle,
}: ChipProps) {
  const { colors, typography, spacing, radius } = useTheme();

  const containerStyles = [
    styles.chip,
    {
      borderRadius: radius.full,
      backgroundColor: selected ? colors.primary : colors.divider,
      borderColor: selected ? colors.primary : colors.border,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
    },
    style,
  ] as StyleProp<ViewStyle>;

  const labelStyles = [
    {
      fontFamily: typography.bodySmall.fontFamily,
      fontSize: typography.bodySmall.fontSize,
      color: selected ? '#FFFFFF' : colors.textSecondary,
      fontWeight: '500',
    },
    textStyle,
  ] as StyleProp<TextStyle>;

  const ContainerComponent = onPress ? TouchableOpacity : View;

  return (
    // @ts-ignore
    <ContainerComponent
      onPress={onPress}
      activeOpacity={0.7}
      style={containerStyles}
      accessibilityRole={onPress ? 'checkbox' : 'text'}
      accessibilityState={onPress ? { checked: selected } : undefined}
    >
      <Text style={labelStyles}>{label}</Text>
      {onClose && (
        <TouchableOpacity onPress={onClose} style={{ marginLeft: spacing.xxs }}>
          <Icon name="x" provider="feather" size={14} color={selected ? '#FFFFFF' : colors.textSecondary} />
        </TouchableOpacity>
      )}
    </ContainerComponent>
  );
}

export interface BadgeProps {
  count?: number;
  visible?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Purpose: Reusable absolute-positioned badge indicator for notifications or counters.
 */
export function Badge({
  count,
  visible = true,
  style,
  textStyle,
}: BadgeProps) {
  const { colors, typography, radius } = useTheme();

  if (!visible) return null;

  const isDot = count === undefined;

  const containerStyles = [
    styles.badge,
    {
      backgroundColor: colors.danger,
      borderRadius: radius.full,
      minWidth: isDot ? 8 : 16,
      height: isDot ? 8 : 16,
      paddingHorizontal: isDot ? 0 : 4,
    },
    style,
  ] as StyleProp<ViewStyle>;

  const countStyles = [
    {
      fontFamily: typography.caption.fontFamily,
      fontSize: 10,
      color: '#FFFFFF',
      fontWeight: 'bold',
      lineHeight: 14,
    },
    textStyle,
  ] as StyleProp<TextStyle>;

  return (
    <View style={containerStyles} accessibilityRole="alert">
      {!isDot && (
        <Text style={countStyles}>{count > 99 ? '99+' : count}</Text>
      )}
    </View>
  );
}

export interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Purpose: Circular image or initial text fallback Avatar representing user identity.
 */
export function Avatar({ source, name, size = 40, style }: AvatarProps) {
  const { colors, typography, radius } = useTheme();

  const containerStyles = [
    {
      width: size,
      height: size,
      borderRadius: radius.full,
      backgroundColor: colors.divider,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    style,
  ] as StyleProp<ViewStyle>;

  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <View style={containerStyles}>
      {source ? (
        <Image
          source={{ uri: source }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <Text
          style={{
            fontFamily: typography.titleSmall.fontFamily,
            fontSize: size * 0.4,
            fontWeight: 'bold',
            color: colors.textSecondary,
          }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}

export interface TagProps {
  label: string;
  type?: 'success' | 'warning' | 'danger' | 'info' | 'primary';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Purpose: Small colored descriptive tag (e.g. 'BREAKING' or 'BETA' badges).
 */
export function Tag({
  label,
  type = 'primary',
  style,
  textStyle,
}: TagProps) {
  const { colors, typography, spacing, radius } = useTheme();

  const resolvedColors = useMemo(() => {
    switch (type) {
      case 'success':
        return { bg: 'rgba(16, 185, 129, 0.1)', text: colors.success };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.1)', text: colors.warning };
      case 'danger':
        return { bg: 'rgba(239, 68, 68, 0.1)', text: colors.danger };
      case 'info':
        return { bg: 'rgba(59, 130, 246, 0.1)', text: colors.info };
      case 'primary':
      default:
        return { bg: 'rgba(124, 58, 237, 0.1)', text: colors.primary };
    }
  }, [type, colors]);

  const containerStyles = [
    styles.tag,
    {
      borderRadius: radius.xs,
      backgroundColor: resolvedColors.bg,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xxs,
    },
    style,
  ] as StyleProp<ViewStyle>;

  const labelStyles = [
    {
      fontFamily: typography.caption.fontFamily,
      fontSize: typography.caption.fontSize,
      fontWeight: '600',
      color: resolvedColors.text,
    },
    textStyle,
  ] as StyleProp<TextStyle>;

  return (
    <View style={containerStyles}>
      <Text style={labelStyles}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -2,
    right: -2,
    zIndex: 10,
  },
  tag: {
    alignSelf: 'flex-start',
  },
});
