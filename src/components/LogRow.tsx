import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT, RADIUS, SPACING } from '../constants/theme';
import type { Exercise, WorkoutLog } from '../types/db.types';
import { formatDisplayDate } from '../utils/dates';

interface LogRowProps {
  log: WorkoutLog;
  unit: Exercise['unit'];
}

export function LogRow({ log, unit }: LogRowProps) {
  // reps doubles as miles on a duration run, and either field may now be null.
  const reps = log.reps;
  const metric =
    unit === 'min'
      ? [
          log.weight != null ? `${log.weight} min` : null,
          reps != null ? `${reps} mi` : null,
        ]
          .filter(Boolean)
          .join(' · ') || '—'
      : log.weight != null
        ? `${log.weight} ${unit}${reps != null ? ` × ${reps}` : ''}`
        : reps != null
          ? `Bodyweight × ${reps}`
          : 'Bodyweight';

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.date}>{formatDisplayDate(log.performed_on)}</Text>
        {log.notes ? <Text style={styles.notes}>{log.notes}</Text> : null}
      </View>
      <Text style={styles.metric}>{metric}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  left: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  date: {
    fontSize: FONT.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  notes: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  metric: {
    fontSize: FONT.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
