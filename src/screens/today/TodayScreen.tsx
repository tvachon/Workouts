import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { COLORS, FONT, RADIUS, SPACING } from '../../constants/theme';
import { listRoutineForWeekday } from '../../api/routine';
import type { RoutineDayWithExercise } from '../../types/db.types';
import type { RootStackParamList } from '../../types/navigation.types';
import { todayISO, todayWeekday } from '../../utils/dates';
import { weekdayLabel } from '../../constants/weekdays';
import { messageOf } from '../../utils/errors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TodayScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<RoutineDayWithExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const weekday = todayWeekday();
  const today = todayISO();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listRoutineForWeekday(weekday));
      setError(null);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [weekday]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <Text style={styles.heading}>{weekdayLabel(weekday)}</Text>
      <Text style={styles.sub}>Today&apos;s exercises</Text>

      {loading && items.length === 0 ? (
        <ActivityIndicator color={COLORS.primary} style={styles.spinner} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Nothing scheduled for {weekdayLabel(weekday)}.
          </Text>
          <Text style={styles.emptyHint}>
            Add exercises to this day from the Routine tab.
          </Text>
        </View>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.row}>
            <Pressable
              style={styles.rowMain}
              onPress={() =>
                navigation.navigate('ExerciseDetail', {
                  exerciseId: item.exercise_id,
                })
              }
            >
              <Text style={styles.name}>{item.exercise.name}</Text>
              <Text style={styles.unit}>Tracked in {item.exercise.unit}</Text>
            </Pressable>
            <Button
              title="Log"
              variant="primary"
              style={styles.logBtn}
              onPress={() =>
                navigation.navigate('LogEntry', {
                  exerciseId: item.exercise_id,
                  performedOn: today,
                })
              }
            />
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: FONT.xxl,
    fontWeight: '800',
    color: COLORS.text,
  },
  sub: {
    fontSize: FONT.md,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  spinner: {
    marginTop: SPACING.xxl,
  },
  error: {
    color: COLORS.danger,
    marginTop: SPACING.lg,
  },
  empty: {
    marginTop: SPACING.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT.lg,
    color: COLORS.text,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  rowMain: {
    flex: 1,
  },
  name: {
    fontSize: FONT.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  unit: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  logBtn: {
    paddingHorizontal: SPACING.lg,
    marginLeft: SPACING.sm,
  },
});
