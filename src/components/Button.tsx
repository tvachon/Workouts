import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';
import { COLORS, FONT, RADIUS, SPACING } from '../constants/theme';

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
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && !isDisabled ? styles.pressed : null,
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
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  label: {
    fontSize: FONT.md,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  secondary: { backgroundColor: COLORS.surface, borderColor: COLORS.border },
  danger: { backgroundColor: COLORS.surface, borderColor: COLORS.danger },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
};

const textColor: Record<Variant, string> = {
  primary: COLORS.onPrimary,
  secondary: COLORS.text,
  danger: COLORS.danger,
  ghost: COLORS.primary,
};
