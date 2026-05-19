/**
 * Button — Design System Button Component
 *
 * Supports primary, secondary, ghost, and danger variants.
 * Includes loading state with spinner and haptic feedback.
 */
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { HapticPressable } from './HapticPressable';
import { Colors, BorderRadius, Typography, Spacing } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const sizeStyles: Record<ButtonSize, { button: ViewStyle; text: TextStyle }> = {
    sm: {
      button: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minHeight: 36 },
      text: { ...Typography.caption },
    },
    md: {
      button: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, minHeight: 48 },
      text: { ...Typography.label },
    },
    lg: {
      button: { paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.lg, minHeight: 56 },
      text: { ...Typography.body, fontWeight: '600' },
    },
  };

  const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
    primary: { bg: Colors.primary, text: Colors.textPrimary },
    secondary: { bg: Colors.surfaceLight, text: Colors.textPrimary, border: Colors.borderLight },
    ghost: { bg: 'transparent', text: Colors.textPrimary },
    danger: { bg: Colors.error, text: Colors.textPrimary },
  };

  const vs = variantStyles[variant];
  const ss = sizeStyles[size];

  return (
    <HapticPressable
      onPress={onPress}
      disabled={isDisabled}
      hapticType={variant === 'ghost' ? 'light' : 'medium'}
      style={[
        styles.button,
        ss.button,
        { backgroundColor: vs.bg },
        variant === 'primary' && styles.primaryButton,
        vs.border && { borderWidth: 1, borderColor: vs.border },
        isDisabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vs.text} />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={[styles.text, ss.text, { color: vs.text }, icon && styles.textWithIcon]}>
            {title}
          </Text>
        </>
      )}
    </HapticPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  primaryButton: {
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  text: {
    textAlign: 'center',
  },
  textWithIcon: {
    marginLeft: Spacing.sm,
  },
  disabled: {
    opacity: 0.4,
  },
  fullWidth: {
    width: '100%',
  },
});

export default Button;
