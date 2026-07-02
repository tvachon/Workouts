import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';
import { COLORS, FONT, RADIUS, SHADOWS, SPACING } from '../constants/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  // Ghost buttons stay flat; everything else is a raised neumorphic surface
  // that presses inward on tap.
  const flat = variant === 'ghost';
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        flat ? null : SHADOWS.raised,
        pressed && !isDisabled ? styles.pressed : null,
        pressed && !isDisabled && !flat ? SHADOWS.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} />
      ) : (
        <Text style={[styles.label, { color: textColor[variant] }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FONT.md,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
});

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: COLORS.primary },
  secondary: { backgroundColor: COLORS.surface },
  danger: { backgroundColor: COLORS.surface },
  ghost: { backgroundColor: 'transparent' },
};

const textColor: Record<Variant, string> = {
  primary: COLORS.onPrimary,
  secondary: COLORS.text,
  danger: COLORS.danger,
  ghost: COLORS.primary,
};
