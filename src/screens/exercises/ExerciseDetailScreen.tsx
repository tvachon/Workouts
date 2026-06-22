import React, { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { LogRow } from '../../components/LogRow';
import { MetricLineChart } from '../../components/Chart/MetricLineChart';
import { COLORS, FONT, SPACING } from '../../constants/theme';
import { getExercise } from '../../api/exercises';
import type { Exercise } from '../../types/db.types';
import { useWorkoutLogs } from '../../hooks/useWorkoutLogs';
import type { RootStackParamList } from '../../types/navigation.types';
import { formatShortDate, todayISO } from '../../utils/dates';
import { messageOf } from '../../utils/errors';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Detail = RouteProp<RootStackParamList, 'ExerciseDetail'>;

export function ExerciseDetailScreen({ route }: { route: Detail }) {
  const { exerciseId } = route.params;
  const navigation = useNavigation<Nav>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [exError, setExError] = useState<string | null>(null);
  const { logs, loading, refresh } = useWorkoutLogs(exerciseId);

  const loadExercise = useCallback(async () => {
    try {
      setExercise(await getExercise(exerciseId));
      setExError(null);
    } catch (e) {
      setExError(messageOf(e));
    }
  }, [exerciseId]);

  useFocusEffect(
    useCallback(() => {
      loadExercise();
      refresh();
    }, [loadExercise, refresh]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: exercise?.name ?? 'Exercise',
      headerRight: () =>
        exercise ? (
          <Pressable
            onPress={() =>
              navigation.navigate('ExerciseForm', { exerciseId })
            }
            style={styles.headerBtn}
          >
            <Text style={styles.edit}>Edit</Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, exercise, exerciseId]);

  const unit = exercise?.unit ?? 'lb';
  const weightData = logs.map((l) => ({
    value: Number(l.weight),
    label: formatShortDate(l.performed_on),
  }));
  const repsData = logs.map((l) => ({
    value: l.reps,
    label: formatShortDate(l.performed_on),
  }));
  const history = [...logs].reverse(); // newest first

  return (
    <Screen refreshing={loading} onRefresh={refresh}>
      {exError ? <Text style={styles.error}>{exError}</Text> : null}
      {exercise?.description ? (
        <Text style={styles.description}>{exercise.description}</Text>
      ) : null}

      <Button
        title="Log today's workout"
        onPress={() =>
          navigation.navigate('LogEntry', {
            exerciseId,
            performedOn: todayISO(),
          })
        }
        style={styles.logBtn}
      />

      {loading && logs.length === 0 ? (
        <ActivityIndicator color={COLORS.primary} style={styles.spinner} />
      ) : (
        <>
          <MetricLineChart
            title="Weight over time"
            data={weightData}
            color={COLORS.primary}
            unit={unit}
          />
          <MetricLineChart
            title="Reps over time"
            data={repsData}
            color={COLORS.accent}
          />

          <Text style={styles.historyTitle}>History</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyHint}>
              No workouts logged yet. Log one above to start your graph.
            </Text>
          ) : (
            <View style={styles.history}>
              {history.map((log) => (
                <Pressable
                  key={log.id}
                  onPress={() =>
                    navigation.navigate('LogEntry', {
                      exerciseId,
                      performedOn: log.performed_on,
                    })
                  }
                >
                  <LogRow log={log} unit={unit} />
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    color: COLORS.danger,
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: FONT.md,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  logBtn: {
    marginBottom: SPACING.xl,
  },
  spinner: {
    marginTop: SPACING.xxl,
  },
  historyTitle: {
    fontSize: FONT.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  history: {
    marginBottom: SPACING.xl,
  },
  emptyHint: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
  },
  headerBtn: {
    paddingHorizontal: SPACING.sm,
  },
  edit: {
    color: COLORS.primary,
    fontSize: FONT.md,
    fontWeight: '600',
  },
});
