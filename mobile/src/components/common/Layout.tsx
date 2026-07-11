import React from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  StyleProp, 
  ViewStyle, 
  Text,
  TextStyle
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import Button from './Button';

export interface SafeAreaWrapperProps {
  children: React.ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}

/**
 * Purpose: Safe area bounds component wrapping screen layouts.
 */
export function SafeAreaWrapper({
  children,
  edges = ['top', 'bottom', 'left', 'right'],
  style,
}: SafeAreaWrapperProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView 
      edges={edges} 
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
    >
      {children}
    </SafeAreaView>
  );
}

export interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  [key: string]: any;
}

/**
 * Purpose: Screen background wrapper with optional ScrollView integration.
 */
export function ScreenContainer({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  ...props
}: ScreenContainerProps) {
  const { colors } = useTheme();

  const baseStyle = [{ flex: 1, backgroundColor: colors.background }, style] as StyleProp<ViewStyle>;

  if (scrollable) {
    return (
      <ScrollView
        style={baseStyle}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        {...props}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={baseStyle} {...props}>
      {children}
    </View>
  );
}

export interface SectionHeaderProps {
  title: string;
  actionTitle?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
}

/**
 * Purpose: Unified Section Header title bar.
 */
export function SectionHeader({
  title,
  actionTitle,
  onActionPress,
  style,
  titleStyle,
}: SectionHeaderProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.headerRow, { marginBottom: spacing.sm }, style]}>
      <Text
        style={[
          {
            color: colors.textPrimary,
            fontFamily: typography.titleMedium.fontFamily,
            fontSize: typography.titleMedium.fontSize,
            fontWeight: typography.titleMedium.fontWeight,
          },
          titleStyle,
        ]}
      >
        {title}
      </Text>
      {actionTitle && onActionPress && (
        <Button
          title={actionTitle}
          onPress={onActionPress}
          variant="outlined"
          style={{ minHeight: 32, paddingVertical: 4, paddingHorizontal: 12 }}
          textStyle={{ fontSize: 13 }}
        />
      )}
    </View>
  );
}

export interface DividerProps {
  style?: StyleProp<ViewStyle>;
  color?: string;
  thickness?: number;
}

/**
 * Purpose: Thin horizontal divider line.
 */
export function Divider({ style, color, thickness = 1 }: DividerProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={[
        {
          height: thickness,
          backgroundColor: color || colors.divider,
          marginVertical: spacing.sm,
          width: '100%',
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
});
