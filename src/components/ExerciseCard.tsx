import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT, RADIUS, SPACING } from '../constants/theme';
import type { Exercise } from '../types/db.types';

interface ExerciseCardProps {
  exercise: Exercise;
  subtitle?: string;
  onPress: () => void;
}

export function ExerciseCard({
  exercise,
  subtitle,
  onPress,
}: ExerciseCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.textWrap}>
        <Text style={styles.name}>{exercise.name}</Text>
        <Text style={styles.subtitle}>
          {subtitle ?? `Tracked in ${exercise.unit}`}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  textWrap: {
    flex: 1,
  },
  name: {
    fontSize: FONT.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: FONT.xl,
    color: COLORS.textMuted,
    marginLeft: SPACING.sm,
  },
});
