import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { useTheme } from '../../../theme';
import Card from '../../../components/common/Card';

export interface TypingIndicatorProps {
  status: string;
}

/**
 * Purpose: Typing indicator displaying flashing status labels.
 */
export default function TypingIndicator({ status }: TypingIndicatorProps) {
  const { colors, typography, spacing, radius } = useTheme();

  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 1.0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacityAnim]);

  return (
    <View style={styles.container}>
      <Card variant="standard" style={[styles.bubble, { borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: radius.md, padding: spacing.md }]}>
        <Animated.View style={{ opacity: opacityAnim, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.statusText, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
            {status}...
          </Text>
        </Animated.View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 6,
    textTransform: 'capitalize',
  },
});
