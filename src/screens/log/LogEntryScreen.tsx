import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import {
  useNavigation,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { COLORS, FONT, SPACING } from '../../constants/theme';
import { getExercise } from '../../api/exercises';
import {
  deleteLog,
  getLatestLogBefore,
  getLogForDate,
  upsertLog,
} from '../../api/workoutLogs';
import type { Exercise, WorkoutLog } from '../../types/db.types';
import type { RootStackParamList } from '../../types/navigation.types';
import { todayISO } from '../../utils/dates';
import { messageOf } from '../../utils/errors';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Entry = RouteProp<RootStackParamList, 'LogEntry'>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function LogEntryScreen({ route }: { route: Entry }) {
  const navigation = useNavigation<Nav>();
  const { exerciseId, performedOn } = route.params;

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [date, setDate] = useState(performedOn ?? todayISO());
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [notes, setNotes] = useState('');
  const [existing, setExisting] = useState<WorkoutLog | null>(null);
  const [lastLog, setLastLog] = useState<WorkoutLog | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getExercise(exerciseId).then(setExercise).catch(() => {});
  }, [exerciseId]);

  // Prefill from any existing entry for the initial date.
  useEffect(() => {
    const initial = performedOn ?? todayISO();
    getLogForDate(exerciseId, initial)
      .then((log) => {
        if (log) {
          setExisting(log);
          setWeight(log.weight != null ? String(log.weight) : '');
          setReps(log.reps != null ? String(log.reps) : '');
          setNotes(log.notes ?? '');
        }
      })
      .catch(() => {});
    // The previous session's numbers double as placeholders in the fields.
    getLatestLogBefore(exerciseId, initial).then(setLastLog).catch(() => {});
  }, [exerciseId, performedOn]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: exercise ? `Log: ${exercise.name}` : 'Log Workout',
    });
  }, [navigation, exercise]);

  const save = async () => {
    if (!ISO_DATE.test(date)) {
      Alert.alert('Invalid date', 'Use the format YYYY-MM-DD.');
      return;
    }
    // Blank fields are null: weight = bodyweight, reps/mi = a no-count duration
    // run. At least one of the two must carry a value.
    const repsProvided = reps.trim() !== '';
    const weightProvided = weight.trim() !== '';
    const repsNum = repsProvided ? Number(reps) : null;
    const weightNum = weightProvided ? Number(weight) : null;
    if (!repsProvided && !weightProvided) {
      Alert.alert('Nothing to save', 'Enter reps/miles, a weight, or minutes.');
      return;
    }
    if (weightNum !== null && (!Number.isFinite(weightNum) || weightNum < 0)) {
      Alert.alert('Invalid weight', 'Enter a number 0 or greater, or leave it blank.');
      return;
    }
    if (repsNum !== null && (!Number.isFinite(repsNum) || repsNum < 0)) {
      Alert.alert('Invalid reps', 'Enter a number 0 or greater, or leave it blank.');
      return;
    }
    setSaving(true);
    try {
      await upsertLog({
        exerciseId,
        performedOn: date,
        weight: weightNum,
        reps: repsNum,
        notes: notes.trim() || null,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Save failed', messageOf(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('Delete this entry?', 'This removes the logged workout for this day.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLog(existing.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Delete failed', messageOf(e));
          }
        },
      },
    ]);
  };

  const unit = exercise?.unit ?? 'lb';

  return (
    <Screen>
      <Text style={styles.hint}>
        One entry per exercise per day — saving again on the same date updates it.
      </Text>

      <TextField
        label="Date"
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />
      <TextField
        label={`Weight (${unit})`}
        value={weight}
        onChangeText={setWeight}
        placeholder={lastLog?.weight != null ? String(lastLog.weight) : '0'}
        keyboardType="decimal-pad"
      />
      <TextField
        label="Reps/Mi"
        value={reps}
        onChangeText={setReps}
        placeholder={lastLog?.reps != null ? String(lastLog.reps) : '0'}
        keyboardType="decimal-pad"
      />
      <TextField
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="How it felt, form cues, etc."
        multiline
      />

      <Button
        title={existing ? 'Update entry' : 'Save entry'}
        onPress={save}
        loading={saving}
        style={styles.save}
      />
      {existing ? (
        <Button title="Delete entry" variant="danger" onPress={confirmDelete} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  save: {
    marginBottom: SPACING.md,
  },
});
