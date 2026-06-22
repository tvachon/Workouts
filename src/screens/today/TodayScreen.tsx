import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { COLORS, FONT, RADIUS, SPACING } from '../../constants/theme';
import { listRoutineForWeekday } from '../../api/routine';
import { listLogsForDate, upsertLog } from '../../api/workoutLogs';
import type {
  Exercise,
  RoutineDayWithExercise,
  WorkoutLog,
} from '../../types/db.types';
import type { RootStackParamList } from '../../types/navigation.types';
import { todayISO, todayWeekday } from '../../utils/dates';
import { weekdayLabel } from '../../constants/weekdays';
import { messageOf } from '../../utils/errors';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RowStatus = 'idle' | 'saving' | 'saved' | 'error';

export function TodayScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<RoutineDayWithExercise[]>([]);
  const [logs, setLogs] = useState<Record<string, WorkoutLog>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const weekday = todayWeekday();
  const today = todayISO();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [routine, dayLogs] = await Promise.all([
        listRoutineForWeekday(weekday),
        listLogsForDate(today),
      ]);
      setItems(routine);
      const map: Record<string, WorkoutLog> = {};
      for (const l of dayLogs) map[l.exercise_id] = l;
      setLogs(map);
      setError(null);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [weekday, today]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <Text style={styles.heading}>{weekdayLabel(weekday)}</Text>
      <Text style={styles.sub}>Fill in reps and weight — each row saves itself.</Text>

      {loading && items.length === 0 ? (
        <ActivityIndicator color={COLORS.primary} style={styles.spinner} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Nothing scheduled for {weekdayLabel(weekday)}.
          </Text>
          <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'Routine' })}>
            <Text style={styles.link}>Set up your routine →</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.colExercise, styles.headerText]}>
              Exercise
            </Text>
            <Text style={[styles.cell, styles.colReps, styles.headerText]}>
              Reps
            </Text>
            <Text style={[styles.cell, styles.colWeight, styles.headerText]}>
              Weight
            </Text>
            <Text style={[styles.cell, styles.colNotes, styles.headerText]}>
              Notes
            </Text>
            <View style={styles.colStatus} />
          </View>

          {items.map((item) => (
            <WorkoutRow
              key={item.exercise_id}
              exercise={item.exercise}
              performedOn={today}
              initial={logs[item.exercise_id]}
              onOpenDetail={() =>
                navigation.navigate('ExerciseDetail', {
                  exerciseId: item.exercise_id,
                })
              }
              onSaved={(log) =>
                setLogs((prev) => ({ ...prev, [log.exercise_id]: log }))
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

/* ---------- One editable table row ---------- */

interface WorkoutRowProps {
  exercise: Exercise;
  performedOn: string;
  initial?: WorkoutLog;
  onOpenDetail: () => void;
  onSaved: (log: WorkoutLog) => void;
}

function WorkoutRow({
  exercise,
  performedOn,
  initial,
  onOpenDetail,
  onSaved,
}: WorkoutRowProps) {
  const [reps, setReps] = useState(initial ? String(initial.reps) : '');
  const [weight, setWeight] = useState(initial ? String(initial.weight) : '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [status, setStatus] = useState<RowStatus>(initial ? 'saved' : 'idle');
  const lastSaved = useRef({ reps, weight, notes });

  const save = useCallback(async () => {
    const repsNum = Number(reps);
    const weightNum = Number(weight);
    const valid =
      reps.trim() !== '' &&
      weight.trim() !== '' &&
      Number.isInteger(repsNum) &&
      repsNum >= 0 &&
      Number.isFinite(weightNum) &&
      weightNum >= 0;
    const changed =
      reps !== lastSaved.current.reps ||
      weight !== lastSaved.current.weight ||
      notes !== lastSaved.current.notes;
    if (!valid || !changed) return;

    setStatus('saving');
    try {
      const log = await upsertLog({
        exerciseId: exercise.id,
        performedOn,
        reps: repsNum,
        weight: weightNum,
        notes: notes.trim() || null,
      });
      lastSaved.current = { reps, weight, notes };
      setStatus('saved');
      onSaved(log);
    } catch {
      setStatus('error');
    }
  }, [reps, weight, notes, exercise.id, performedOn, onSaved]);

  return (
    <View style={styles.row}>
      <Pressable style={[styles.cell, styles.colExercise]} onPress={onOpenDetail}>
        <Text style={styles.exerciseName} numberOfLines={2}>
          {exercise.name}
        </Text>
      </Pressable>
      <TextInput
        style={[styles.cell, styles.colReps, styles.input]}
        value={reps}
        onChangeText={setReps}
        onBlur={save}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={COLORS.textMuted}
      />
      <TextInput
        style={[styles.cell, styles.colWeight, styles.input]}
        value={weight}
        onChangeText={setWeight}
        onBlur={save}
        keyboardType="decimal-pad"
        placeholder={exercise.unit}
        placeholderTextColor={COLORS.textMuted}
      />
      <TextInput
        style={[styles.cell, styles.colNotes, styles.input, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        onBlur={save}
        placeholder="—"
        placeholderTextColor={COLORS.textMuted}
      />
      <View style={styles.colStatus}>
        <StatusDot status={status} />
      </View>
    </View>
  );
}

function StatusDot({ status }: { status: RowStatus }) {
  if (status === 'saving') return <ActivityIndicator size="small" color={COLORS.textMuted} />;
  if (status === 'saved') return <Text style={[styles.statusIcon, { color: COLORS.success }]}>✓</Text>;
  if (status === 'error') return <Text style={[styles.statusIcon, { color: COLORS.danger }]}>!</Text>;
  return null;
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
    marginBottom: SPACING.sm,
  },
  link: {
    color: COLORS.primary,
    fontSize: FONT.md,
    fontWeight: '600',
  },
  table: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  headerRow: {
    borderTopWidth: 0,
    backgroundColor: COLORS.surfaceAlt,
  },
  headerText: {
    fontSize: FONT.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
    paddingVertical: SPACING.sm,
  },
  cell: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    justifyContent: 'center',
  },
  colExercise: {
    flex: 2,
    minWidth: 96,
  },
  colReps: {
    width: 50,
  },
  colWeight: {
    width: 72,
  },
  colNotes: {
    flex: 1.3,
    minWidth: 64,
  },
  colStatus: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseName: {
    fontSize: FONT.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  input: {
    fontSize: FONT.md,
    color: COLORS.text,
  },
  notesInput: {
    color: COLORS.textMuted,
  },
  statusIcon: {
    fontSize: FONT.md,
    fontWeight: '800',
  },
});
