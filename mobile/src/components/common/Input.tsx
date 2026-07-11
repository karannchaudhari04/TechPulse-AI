import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput as RNTextInput, 
  StyleSheet, 
  StyleProp, 
  ViewStyle, 
  TextStyle,
  TouchableOpacity
} from 'react-native';
import { useTheme } from '../../theme';
import Icon from './Icon';

export interface TextInputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string | null;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  leftIconName?: string;
  leftIconProvider?: any;
  rightIconName?: string;
  rightIconProvider?: any;
  onRightIconPress?: () => void;
  [key: string]: any;
}

/**
 * Purpose: Reusable Text Input field conforming to Design System styles.
 * 
 * Props:
 * - label: Form field header text
 * - value: Managed string value
 * - onChangeText: Text edit handler callback
 * - placeholder: Default placeholder hint
 * - error: Optional error label string
 * - disabled: Locks text input and dims visibility
 * - leftIconName / rightIconName: Custom prefix/suffix icons
 * 
 * Usage:
 * ```tsx
 * <TextInput label="Email Address" value={email} onChangeText={setEmail} placeholder="Enter email" />
 * ```
 */
export function TextInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  style,
  inputStyle,
  disabled = false,
  leftIconName,
  leftIconProvider,
  rightIconName,
  rightIconProvider,
  onRightIconPress,
  ...props
}: TextInputProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const containerStyles = [
    styles.inputContainer,
    {
      borderColor: error ? colors.danger : isFocused ? colors.primary : colors.border,
      backgroundColor: colors.surface,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
    },
    disabled && styles.disabled,
    style,
  ] as StyleProp<ViewStyle>;

  const rnInputStyles = [
    styles.textInput,
    {
      color: colors.textPrimary,
      fontFamily: typography.bodyMedium.fontFamily,
      fontSize: typography.bodyMedium.fontSize,
    },
    inputStyle,
  ] as StyleProp<TextStyle>;

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary, fontFamily: typography.caption.fontFamily }]}>
          {label}
        </Text>
      )}

      <View style={containerStyles}>
        {leftIconName && (
          <Icon
            name={leftIconName}
            provider={leftIconProvider}
            size={20}
            color={colors.textSecondary}
            style={{ marginRight: spacing.xs }}
          />
        )}

        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          style={rnInputStyles}
          accessibilityLabel={label || placeholder}
          accessibilityState={{ disabled }}
          {...props}
        />

        {rightIconName && (
          <TouchableOpacity onPress={onRightIconPress} disabled={!onRightIconPress}>
            <Icon
              name={rightIconName}
              provider={rightIconProvider}
              size={20}
              color={colors.textSecondary}
              style={{ marginLeft: spacing.xs }}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text style={[styles.error, { color: colors.danger, fontFamily: typography.bodySmall.fontFamily }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

/**
 * Purpose: Secure password field adding toggleable visibility eye icons.
 */
export function PasswordInput({
  label,
  value,
  onChangeText,
  placeholder = 'Password',
  error,
  ...props
}: Omit<TextInputProps, 'rightIconName' | 'onRightIconPress' | 'secureTextEntry'>) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <TextInput
      label={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      error={error}
      secureTextEntry={!showPassword}
      rightIconName={showPassword ? 'eye-off' : 'eye'}
      rightIconProvider="feather"
      onRightIconPress={() => setShowPassword(!showPassword)}
      {...props}
    />
  );
}

/**
 * Purpose: Centered Search Bar with quick-clear and glass prefix styling.
 */
export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search technology updates...',
  onClear,
  style,
  ...props
}: Omit<TextInputProps, 'leftIconName' | 'rightIconName' | 'onRightIconPress'> & { onClear?: () => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      leftIconName="search"
      leftIconProvider="feather"
      rightIconName={value ? 'x' : undefined}
      rightIconProvider="feather"
      onRightIconPress={onClear}
      style={style}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    height: 48,
  },
  textInput: {
    flex: 1,
    height: '100%',
    padding: 0,
  },
  error: {
    fontSize: 11,
    marginTop: 6,
  },
  disabled: {
    opacity: 0.6,
  },
});
