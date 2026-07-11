import React, { useEffect, useRef } from 'react';
import { 
  Animated, 
  Text, 
  StyleSheet, 
  StyleProp, 
  ViewStyle, 
  TouchableOpacity
} from 'react-native';
import { useTheme } from '../../theme';

export interface SnackbarProps {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onActionPress?: () => void;
  onDismiss: () => void;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Purpose: Animated Snackbar banner sliding from the bottom for dismissable user alerts.
 */
export function Snackbar({
  visible,
  message,
  actionLabel,
  onActionPress,
  onDismiss,
  duration = 4000,
  style,
}: SnackbarProps) {
  const { colors, typography, spacing, radius, zIndex } = useTheme();
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 120,
      }).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: 100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.snackbar,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.sm,
          margin: spacing.md,
          transform: [{ translateY: slideAnim }],
          zIndex: zIndex.toast,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.message,
          {
            color: colors.textPrimary,
            fontFamily: typography.bodyMedium.fontFamily,
            fontSize: typography.bodyMedium.fontSize,
          },
        ]}
      >
        {message}
      </Text>

      {actionLabel && onActionPress && (
        <TouchableOpacity
          onPress={() => {
            onActionPress();
            handleDismiss();
          }}
          style={{ marginLeft: spacing.sm }}
        >
          <Text
            style={{
              color: colors.primary,
              fontFamily: typography.button.fontFamily,
              fontSize: typography.button.fontSize,
              fontWeight: 'bold',
            }}
          >
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

export interface ToastProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Purpose: Transient visual Toast bubble fading in at the bottom of the layout.
 */
export function Toast({
  visible,
  message,
  onDismiss,
  duration = 3000,
  style,
}: ToastProps) {
  const { colors, typography, spacing, radius, zIndex } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          borderRadius: radius.full,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          opacity: fadeAnim,
          zIndex: zIndex.toast,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: '#F8FAFC',
          fontFamily: typography.bodySmall.fontFamily,
          fontSize: typography.bodySmall.fontSize,
          textAlign: 'center',
        }}
      >
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  message: {
    flex: 1,
  },
  toast: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    maxWidth: '85%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
