import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming 
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

export interface LoadingProps {
  size?: 'small' | 'large';
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Purpose: Centered spinner displaying general loading feedback.
 */
export function LoadingIndicator({ size = 'large', color, style }: LoadingProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.centered, style]}>
      <ActivityIndicator size={size} color={color || colors.primary} />
    </View>
  );
}

export interface ShimmerProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Purpose: Base animatable placeholder component for composing custom skeleton views.
 * 
 * Props:
 * - width: Placeholder width (number or percentage string)
 * - height: Placeholder height in pixels
 * - borderRadius: Corner rounding token
 * - style: View styles overrides
 * 
 * Usage:
 * ```tsx
 * <Shimmer width={100} height={20} borderRadius={4} />
 * ```
 */
export function Shimmer({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: ShimmerProps) {
  const { colors } = useTheme();
  const shimmerOpacity = useSharedValue(0.3);

  useEffect(() => {
    shimmerOpacity.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 900 }),
        withTiming(0.3, { duration: 900 })
      ),
      -1,
      true
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  const containerStyles = [
    {
      width,
      height,
      borderRadius,
      backgroundColor: colors.border,
    },
    style,
  ] as StyleProp<ViewStyle>;

  return <Animated.View style={[containerStyles, shimmerStyle]} />;
}

/**
 * Purpose: Composed card skeleton loader showing title, subtitle, image, and action button placeholders.
 */
export function SkeletonCardLoader() {
  const { spacing, radius } = useTheme();

  return (
    <View style={[styles.skeletonCard, { padding: spacing.md }]}>
      <Shimmer height={120} borderRadius={radius.md} style={{ marginBottom: spacing.md }} />
      <Shimmer width="85%" height={20} style={{ marginBottom: spacing.sm }} />
      <Shimmer width="55%" height={14} style={{ marginBottom: spacing.md }} />
      <View style={styles.skeletonRow}>
        <Shimmer width="30%" height={32} borderRadius={radius.sm} />
        <Shimmer width="20%" height={32} borderRadius={radius.sm} style={{ marginLeft: 'auto' }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  skeletonCard: {
    width: '100%',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
