import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  useFocusEffect,
  useNavigation,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { LogRow } from '../../components/LogRow';
import { MetricLineChart } from '../../components/Chart/MetricLineChart';
import { COLORS, FONT, RADIUS, SPACING } from '../../constants/theme';
import {
  createExercise,
  deleteExercise,
  getExercise,
  updateExercise,
} from '../../api/exercises';
import type { Unit } from '../../types/db.types';
import { useWorkoutLogs } from '../../hooks/useWorkoutLogs';
import type { RootStackParamList } from '../../types/navigation.types';
import { formatShortDate } from '../../utils/dates';
import { messageOf } from '../../utils/errors';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ExerciseRoute = RouteProp<RootStackParamList, 'Exercise'>;

/**
 * Single screen for an exercise: edit its metadata (name, description, units)
 * and — once it exists — view its stats charts and logged history. Reached
 * from This Week via the "Add exercise" button (create) or a row's chart icon
 * (edit). Replaces the old separate form + detail screens.
 */
export function ExerciseScreen({ route }: { route: ExerciseRoute }) {
  const navigation = useNavigation<Nav>();
  const exerciseId = route.params?.exerciseId;
  const isEdit = !!exerciseId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState<Unit>('lb');
  const [saving, setSaving] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(isEdit);

  // Baseline of the last-saved values; lets us tell whether there's anything
  // to save. Seeded empty for create mode, overwritten when an exercise loads.
  const saved = useRef({ name: '', description: '', unit: 'lb' as Unit });
  const dirty =
    name.trim() !== saved.current.name.trim() ||
    description.trim() !== saved.current.description.trim() ||
    unit !== saved.current.unit;

  // Logs only matter in edit mode; harmless empty fetch in create mode.
  const { logs, loading: loadingLogs, refresh: refreshLogs } = useWorkoutLogs(
    exerciseId ?? '',
  );

  const loadMeta = useCallback(async () => {
    if (!exerciseId) return;
    try {
      const ex = await getExercise(exerciseId);
      if (ex) {
        setName(ex.name);
        setDescription(ex.description ?? '');
        setUnit(ex.unit);
        saved.current = {
          name: ex.name,
          description: ex.description ?? '',
          unit: ex.unit,
        };
      }
    } catch (e) {
      Alert.alert('Error', messageOf(e));
    } finally {
      setLoadingMeta(false);
    }
  }, [exerciseId]);

  useFocusEffect(
    useCallback(() => {
      loadMeta();
      if (exerciseId) refreshLogs();
    }, [loadMeta, refreshLogs, exerciseId]),
  );

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Give the exercise a name.');
      return;
    }
    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        description: description.trim() || null,
        unit,
      };
      if (isEdit && exerciseId) {
        await updateExercise(exerciseId, input);
      } else {
        await createExercise(input);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Save failed', messageOf(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!exerciseId) return;
    const title = 'Delete exercise?';
    const message =
      'This permanently deletes this exercise and ALL of its logged history ' +
      'across every day. This cannot be undone.';

    const runDelete = async () => {
      try {
        await deleteExercise(exerciseId);
        navigation.goBack();
      } catch (e) {
        // RNW's Alert.alert is a no-op, so use the browser dialog on web.
        if (Platform.OS === 'web') window.alert(messageOf(e));
        else Alert.alert('Delete failed', messageOf(e));
      }
    };

    // react-native-web has no Alert implementation, so the confirm dialog
    // (and its destructive callback) never fire there. Fall back to the
    // browser's native confirm so the warning always shows before deleting.
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) runDelete();
      return;
    }

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: runDelete },
    ]);
  };

  if (loadingMeta) {
    return (
      <Screen>
        <Text style={styles.loading}>Loading…</Text>
      </Screen>
    );
  }

  const isMinutes = unit === 'min';

  // Bodyweight entries have no weight; drop them so the chart isn't pinned to 0.
  const weightData = logs
    .filter((l) => l.weight != null)
    .map((l) => ({
      value: Number(l.weight),
      label: formatShortDate(l.performed_on),
    }));
  // Duration runs log no count; drop null reps so the line isn't pinned to 0.
  const repsData = logs
    .filter((l) => l.reps != null)
    .map((l) => ({
      value: Number(l.reps),
      label: formatShortDate(l.performed_on),
    }));
  const history = [...logs].reverse(); // newest first

  return (
    <Screen refreshing={isEdit ? loadingLogs : false} onRefresh={isEdit ? refreshLogs : undefined}>
      <View style={styles.headerRow}>
        <Text style={styles.heading} numberOfLines={1}>
          {isEdit
            ? name.trim()
              ? `Edit “${name.trim()}”`
              : 'Edit exercise'
            : 'New exercise'}
        </Text>
        {dirty || saving ? (
          <Button title="Save" onPress={save} loading={saving} style={styles.saveBtn} />
        ) : (
          <Button
            title="←  Back"
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={styles.saveBtn}
          />
        )}
      </View>

      <View style={styles.fieldRow}>
        <View style={styles.nameField}>
          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Bench Press"
            autoCapitalize="words"
          />
        </View>
        <View style={styles.unitsField}>
          <Text style={styles.label}>Units</Text>
          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={unit}
              onValueChange={(v) => setUnit(v as Unit)}
              style={styles.picker}
            >
              <Picker.Item label="Pounds (lb)" value="lb" />
              <Picker.Item label="Kilograms (kg)" value="kg" />
              <Picker.Item label="Minutes (min)" value="min" />
            </Picker>
          </View>
        </View>
      </View>

      <TextField
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="Any cues or details"
        multiline
      />

      {isEdit ? (
        <>
          {loadingLogs && logs.length === 0 ? (
            <ActivityIndicator color={COLORS.primary} style={styles.spinner} />
          ) : (
            <>
              <MetricLineChart
                title={isMinutes ? 'Time' : 'Weight over time'}
                data={weightData}
                color={COLORS.primary}
                unit={unit}
              />
              {/* Duration runs chart distance (miles); lifts chart reps. Both
                  read the reps column and skip days where it wasn't recorded. */}
              <MetricLineChart
                title={isMinutes ? 'Distance' : 'Reps over time'}
                data={repsData}
                color={COLORS.accent}
                unit={isMinutes ? 'mi' : undefined}
              />

              <Text style={styles.historyTitle}>History</Text>
              {history.length === 0 ? (
                <Text style={styles.emptyHint}>
                  No workouts logged yet. Log entries from the This Week tab to
                  build your graph.
                </Text>
              ) : (
                <View style={styles.history}>
                  {history.map((log) => (
                    <Pressable
                      key={log.id}
                      onPress={() =>
                        navigation.navigate('LogEntry', {
                          exerciseId: exerciseId!,
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

          <Button
            title="Delete exercise"
            variant="danger"
            onPress={confirmDelete}
            style={styles.delete}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  heading: {
    flex: 1,
    marginRight: SPACING.md,
    fontSize: FONT.xl,
    fontWeight: '800',
    color: COLORS.text,
  },
  saveBtn: {
    minHeight: 40,
    paddingHorizontal: SPACING.lg,
  },
  label: {
    fontSize: FONT.sm,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  nameField: {
    flex: 1.5,
  },
  unitsField: {
    flex: 1,
  },
  pickerWrap: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: 48,
    paddingHorizontal: SPACING.md,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  delete: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  spinner: {
    marginTop: SPACING.xl,
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
    marginBottom: SPACING.xl,
  },
  loading: {
    color: COLORS.textMuted,
    marginTop: SPACING.xl,
  },
});
