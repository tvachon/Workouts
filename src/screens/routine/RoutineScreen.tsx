import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { COLORS, FONT, RADIUS, SPACING } from '../../constants/theme';
import { WEEKDAYS } from '../../constants/weekdays';
import { useExercises } from '../../hooks/useExercises';
import { useRoutine } from '../../hooks/useRoutine';
import {
  assignExerciseToDay,
  removeExerciseFromDay,
} from '../../api/routine';
import type { RootStackParamList } from '../../types/navigation.types';
import { messageOf } from '../../utils/errors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function RoutineScreen() {
  const navigation = useNavigation<Nav>();
  const { exercises, refresh: refreshExercises } = useExercises();
  const { loading, refresh: refreshRoutine, exerciseIdsForWeekday } =
    useRoutine();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshExercises();
      refreshRoutine();
    }, [refreshExercises, refreshRoutine]),
  );

  const toggle = async (exerciseId: string, weekday: number, on: boolean) => {
    const key = `${weekday}:${exerciseId}`;
    setBusyKey(key);
    setError(null);
    try {
      if (on) {
        await removeExerciseFromDay(exerciseId, weekday);
      } else {
        await assignExerciseToDay(exerciseId, weekday);
      }
      await refreshRoutine();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusyKey(null);
    }
  };

  if (exercises.length === 0) {
    return (
      <Screen refreshing={loading} onRefresh={refreshRoutine}>
        <Text style={styles.heading}>Weekly routine</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No exercises to schedule yet.</Text>
          <Pressable onPress={() => navigation.navigate('ExerciseForm', {})}>
            <Text style={styles.link}>Add an exercise first →</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen refreshing={loading} onRefresh={refreshRoutine}>
      <Text style={styles.heading}>Weekly routine</Text>
      <Text style={styles.sub}>
        Tap an exercise to add or remove it from a day.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {WEEKDAYS.map((day) => {
        const assigned = exerciseIdsForWeekday(day.index);
        return (
          <View key={day.index} style={styles.daySection}>
            <Text style={styles.dayName}>{day.full}</Text>
            <View style={styles.chips}>
              {exercises.map((ex) => {
                const on = assigned.has(ex.id);
                const key = `${day.index}:${ex.id}`;
                return (
                  <Pressable
                    key={ex.id}
                    disabled={busyKey === key}
                    onPress={() => toggle(ex.id, day.index, on)}
                    style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
                  >
                    {busyKey === key ? (
                      <ActivityIndicator
                        size="small"
                        color={on ? COLORS.onPrimary : COLORS.primary}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.chipText,
                          on ? styles.chipTextOn : styles.chipTextOff,
                        ]}
                      >
                        {ex.name}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
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
  error: {
    color: COLORS.danger,
    marginBottom: SPACING.md,
  },
  daySection: {
    marginBottom: SPACING.xl,
  },
  dayName: {
    fontSize: FONT.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipOff: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  chipText: {
    fontSize: FONT.sm,
    fontWeight: '600',
  },
  chipTextOn: {
    color: COLORS.onPrimary,
  },
  chipTextOff: {
    color: COLORS.text,
  },
  empty: {
    marginTop: SPACING.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT.lg,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  link: {
    color: COLORS.primary,
    fontSize: FONT.md,
    fontWeight: '600',
  },
});
