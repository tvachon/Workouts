import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { COLORS, FONT, MAX_CONTENT_WIDTH, RADIUS, SPACING } from '../../constants/theme';
import { weekdayLabel } from '../../constants/weekdays';
import { useAuth } from '../../context/AuthContext';
import { useExercises } from '../../hooks/useExercises';
import { useRoutine } from '../../hooks/useRoutine';
import { assignExerciseToDay, removeExerciseFromDay } from '../../api/routine';
import { listLogsForDateRange, upsertLog } from '../../api/workoutLogs';
import type { Exercise, WorkoutLog } from '../../types/db.types';
import type { RootStackParamList } from '../../types/navigation.types';
import { currentWeek, formatMonthDay } from '../../utils/dates';
import { messageOf } from '../../utils/errors';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Frame = { x: number; y: number; width: number; height: number };
type RowStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Map key for a log: one exercise on one calendar day. */
const logKey = (exerciseId: string, iso: string) => `${exerciseId}|${iso}`;

export function ThisWeekScreen() {
  const navigation = useNavigation<Nav>();
  const { signOut } = useAuth();
  const { exercises, refresh: refreshExercises } = useExercises();
  const { refresh: refreshRoutine, exerciseIdsForWeekday } = useRoutine();

  const week = useMemo(() => currentWeek(), []);
  const [logs, setLogs] = useState<Record<string, WorkoutLog>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverWeekday, setHoverWeekday] = useState<number | null>(null);

  // Drop-zone frames + node refs in window coordinates, keyed by weekday index.
  const dayFrames = useRef<Record<number, Frame>>({});
  const dayNodes = useRef<Record<number, View | null>>({});

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const all = await listLogsForDateRange(week[0].iso, week[6].iso);
      const map: Record<string, WorkoutLog> = {};
      for (const l of all) map[logKey(l.exercise_id, l.performed_on)] = l;
      setLogs(map);
      setError(null);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [week]);

  const refreshAll = useCallback(() => {
    refreshExercises();
    refreshRoutine();
    loadLogs();
  }, [refreshExercises, refreshRoutine, loadLogs]);

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [refreshAll]),
  );

  const exercisesById = useMemo(() => {
    const m = new Map<string, Exercise>();
    for (const e of exercises) m.set(e.id, e);
    return m;
  }, [exercises]);

  // Re-measure all day drop zones (accounts for scroll position / palette state).
  const measureFrames = useCallback(() => {
    for (const { weekday } of week) {
      const node = dayNodes.current[weekday];
      node?.measureInWindow((x, y, width, height) => {
        dayFrames.current[weekday] = { x, y, width, height };
      });
    }
  }, [week]);

  const weekdayAtPoint = useCallback(
    (px: number, py: number): number | null => {
      for (const { weekday } of week) {
        const f = dayFrames.current[weekday];
        if (
          f &&
          px >= f.x &&
          px <= f.x + f.width &&
          py >= f.y &&
          py <= f.y + f.height
        ) {
          return weekday;
        }
      }
      return null;
    },
    [week],
  );

  const handleDragStart = useCallback(
    (id: string) => {
      measureFrames();
      setDraggingId(id);
      setError(null);
    },
    [measureFrames],
  );

  const handleDragMove = useCallback(
    (px: number, py: number) => {
      setHoverWeekday(weekdayAtPoint(px, py));
    },
    [weekdayAtPoint],
  );

  const handleDrop = useCallback(
    async (exerciseId: string, px: number, py: number) => {
      const weekday = weekdayAtPoint(px, py);
      setDraggingId(null);
      setHoverWeekday(null);
      if (weekday === null) return;
      if (exerciseIdsForWeekday(weekday).has(exerciseId)) return; // already there
      try {
        await assignExerciseToDay(exerciseId, weekday);
        await refreshRoutine();
      } catch (e) {
        setError(messageOf(e));
      }
    },
    [weekdayAtPoint, exerciseIdsForWeekday, refreshRoutine],
  );

  const handleRemove = useCallback(
    async (exerciseId: string, weekday: number) => {
      try {
        await removeExerciseFromDay(exerciseId, weekday);
        await refreshRoutine();
      } catch (e) {
        setError(messageOf(e));
      }
    },
    [refreshRoutine],
  );

  const openChart = useCallback(
    (exerciseId: string) => navigation.navigate('Exercise', { exerciseId }),
    [navigation],
  );

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (e) {
      Alert.alert('Sign out failed', messageOf(e));
    }
  }, [signOut]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        // Don't let the page scroll steal an in-progress drag gesture.
        scrollEnabled={!draggingId}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshAll} />
        }
      >
        <View style={styles.inner}>
          <View style={styles.topBar}>
            <Text style={styles.heading}>This Week</Text>
            <Pressable onPress={handleSignOut} hitSlop={8}>
              <Text style={styles.signOut}>Sign out</Text>
            </Pressable>
          </View>
          <Text style={styles.sub}>
            Fill in reps and/or weight — each row saves itself.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Collapsible palette of draggable exercise chips */}
          <View style={[styles.palette, draggingId ? styles.paletteLifted : null]}>
            <Pressable
              style={styles.paletteHeader}
              onPress={() => setPaletteOpen((o) => !o)}
            >
              <Text style={styles.paletteTitle}>
                {paletteOpen
                  ? 'Drag an exercise onto a day'
                  : 'Add Exercises'}
              </Text>
              <Text style={styles.chevron}>{paletteOpen ? '⌄' : '›'}</Text>
            </Pressable>

            {paletteOpen ? (
              <>
                {exercises.length === 0 ? (
                  <Text style={styles.emptyHint}>
                    No exercises yet — add your first one below.
                  </Text>
                ) : (
                  <View style={styles.chips}>
                    {exercises.map((ex) => (
                      <DraggableChip
                        key={ex.id}
                        exercise={ex}
                        onDragStart={handleDragStart}
                        onDragMove={handleDragMove}
                        onDrop={handleDrop}
                      />
                    ))}
                  </View>
                )}
                <Button
                  title="＋ Add exercise"
                  variant="secondary"
                  onPress={() => navigation.navigate('Exercise', {})}
                  style={styles.addBtn}
                />
              </>
            ) : null}
          </View>

          {/* One section per day of the current week, Monday-first */}
          {week.map(({ weekday, iso, isToday }) => {
            const assigned = [...exerciseIdsForWeekday(weekday)];
            return (
              <DaySection
                key={iso}
                title={weekdayLabel(weekday)}
                dateLabel={formatMonthDay(iso)}
                isToday={isToday}
                highlighted={hoverWeekday === weekday}
                registerNode={(node) => {
                  dayNodes.current[weekday] = node;
                }}
              >
                {assigned.length === 0 ? (
                  <Text style={styles.dropHint}>
                    {draggingId ? 'Drop here' : 'Rest day — nothing scheduled'}
                  </Text>
                ) : (
                  <View style={styles.table}>
                    <View style={[styles.row, styles.headerRow]}>
                      <Text
                        numberOfLines={1}
                        style={[styles.cell, styles.colExercise, styles.headerText]}
                      >
                        Exercise
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.cell, styles.colReps, styles.headerText]}
                      >
                        Reps
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.cell, styles.colWeight, styles.headerText]}
                      >
                        Wt/Mins
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.cell, styles.colNotes, styles.headerText]}
                      >
                        Notes
                      </Text>
                      <View style={styles.colChart} />
                      <View style={styles.colStatus} />
                      <View style={styles.colRemove} />
                    </View>

                    {assigned.map((id) => {
                      const ex = exercisesById.get(id);
                      if (!ex) return null;
                      return (
                        <WorkoutRow
                          key={id}
                          exercise={ex}
                          performedOn={iso}
                          initial={logs[logKey(id, iso)]}
                          onOpenChart={() => openChart(id)}
                          onRemove={() => handleRemove(id, weekday)}
                          onSaved={(log) =>
                            setLogs((prev) => ({
                              ...prev,
                              [logKey(log.exercise_id, log.performed_on)]: log,
                            }))
                          }
                        />
                      );
                    })}
                  </View>
                )}
              </DaySection>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- One day's section (also a drop zone) ---------- */

interface DaySectionProps {
  title: string;
  dateLabel: string;
  isToday: boolean;
  highlighted: boolean;
  registerNode: (node: View | null) => void;
  children: React.ReactNode;
}

function DaySection({
  title,
  dateLabel,
  isToday,
  highlighted,
  registerNode,
  children,
}: DaySectionProps) {
  const ref = useRef<View>(null);

  const setRef = useCallback(
    (node: View | null) => {
      ref.current = node;
      registerNode(node);
    },
    [registerNode],
  );

  // Seed the frame on layout; it's re-measured at drag start too.
  const onLayout = useCallback((_e: LayoutChangeEvent) => {
    ref.current?.measureInWindow(() => {});
  }, []);

  return (
    <View
      ref={setRef}
      onLayout={onLayout}
      style={[
        styles.daySection,
        isToday ? styles.dayToday : null,
        highlighted ? styles.dayActive : null,
      ]}
    >
      <View style={styles.dayHeader}>
        <Text style={styles.dayName}>{title}</Text>
        <Text style={[styles.dayDate, isToday ? styles.dayDateToday : null]}>
          {isToday ? 'Today' : dateLabel}
        </Text>
      </View>
      {children}
    </View>
  );
}

/* ---------- One editable, loggable table row ---------- */

interface WorkoutRowProps {
  exercise: Exercise;
  performedOn: string;
  initial?: WorkoutLog;
  onOpenChart: () => void;
  onRemove: () => void;
  onSaved: (log: WorkoutLog) => void;
}

function WorkoutRow({
  exercise,
  performedOn,
  initial,
  onOpenChart,
  onRemove,
  onSaved,
}: WorkoutRowProps) {
  const [reps, setReps] = useState(initial ? String(initial.reps) : '');
  const [weight, setWeight] = useState(
    initial && initial.weight != null ? String(initial.weight) : '',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [status, setStatus] = useState<RowStatus>(initial ? 'saved' : 'idle');
  const lastSaved = useRef({ reps, weight, notes });

  const save = useCallback(async () => {
    // Bodyweight moves (push-ups) carry no weight; duration moves (runs) track
    // minutes in the weight field and carry no reps. Treat a blank field as 0
    // and save as long as at least one of reps/weight was entered.
    const repsProvided = reps.trim() !== '';
    const weightProvided = weight.trim() !== '';
    const repsNum = repsProvided ? Number(reps) : 0;
    const weightNum = weightProvided ? Number(weight) : null; // null = bodyweight
    const valid =
      (repsProvided || weightProvided) &&
      Number.isInteger(repsNum) &&
      repsNum >= 0 &&
      (weightNum === null || (Number.isFinite(weightNum) && weightNum >= 0));
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
      <View style={[styles.cell, styles.colExercise]}>
        <Text style={styles.exerciseName} numberOfLines={2}>
          {exercise.name}
        </Text>
      </View>
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
      <Pressable
        style={[styles.cell, styles.colChart]}
        onPress={onOpenChart}
        hitSlop={6}
      >
        <Text style={styles.chartIcon}>📈</Text>
      </Pressable>
      <View style={styles.colStatus}>
        <StatusDot status={status} />
      </View>
      <Pressable style={styles.colRemove} onPress={onRemove} hitSlop={6}>
        <Text style={styles.remove}>×</Text>
      </Pressable>
    </View>
  );
}

function StatusDot({ status }: { status: RowStatus }) {
  if (status === 'saving')
    return <ActivityIndicator size="small" color={COLORS.textMuted} />;
  if (status === 'saved')
    return <Text style={[styles.statusIcon, { color: COLORS.success }]}>✓</Text>;
  if (status === 'error')
    return <Text style={[styles.statusIcon, { color: COLORS.danger }]}>!</Text>;
  return null;
}

/* ---------- Draggable exercise chip (palette) ---------- */

interface DraggableChipProps {
  exercise: Exercise;
  onDragStart: (id: string) => void;
  onDragMove: (px: number, py: number) => void;
  onDrop: (id: string, px: number, py: number) => void;
}

function DraggableChip({
  exercise,
  onDragStart,
  onDragMove,
  onDrop,
}: DraggableChipProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [dragging, setDragging] = useState(false);

  const responder = useRef(
    PanResponder.create({
      // Capture variants claim the gesture before the ScrollView / browser
      // text-selection can, which makes the drag start reliably on web.
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        setDragging(true);
        pan.setValue({ x: 0, y: 0 });
        onDragStart(exercise.id);
      },
      onPanResponderMove: (_e, g) => {
        pan.setValue({ x: g.dx, y: g.dy });
        onDragMove(g.moveX, g.moveY);
      },
      onPanResponderRelease: (_e, g) => {
        setDragging(false);
        onDrop(exercise.id, g.moveX, g.moveY);
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      },
      onPanResponderTerminate: () => {
        setDragging(false);
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      },
    }),
  ).current;

  return (
    <Animated.View
      {...responder.panHandlers}
      style={[
        styles.chip,
        {
          transform: pan.getTranslateTransform(),
          zIndex: dragging ? 999 : 1,
          elevation: dragging ? 8 : 0,
          opacity: dragging ? 0.92 : 1,
        },
        dragging ? styles.chipDragging : null,
      ]}
    >
      <Text style={styles.chipText} numberOfLines={1}>
        {exercise.name}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    padding: SPACING.lg,
  },
  inner: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: FONT.xxl,
    fontWeight: '800',
    color: COLORS.text,
  },
  signOut: {
    color: COLORS.primary,
    fontSize: FONT.md,
    fontWeight: '600',
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

  /* palette */
  palette: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  paletteLifted: {
    zIndex: 10,
    overflow: 'visible',
  },
  paletteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paletteTitle: {
    fontSize: FONT.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  chevron: {
    fontSize: FONT.lg,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  emptyHint: {
    color: COLORS.textMuted,
    fontSize: FONT.md,
    marginTop: SPACING.md,
  },
  addBtn: {
    marginTop: SPACING.md,
  },
  chip: {
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    maxWidth: 160,
    // Stop the browser selecting the label on mousedown (it steals the gesture).
    userSelect: 'none',
  },
  chipDragging: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  chipText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: FONT.sm,
    userSelect: 'none',
  },

  /* day section */
  daySection: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  dayToday: {
    borderColor: COLORS.primary,
  },
  dayActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#EEF3FF',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  dayName: {
    fontSize: FONT.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  dayDate: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  dayDateToday: {
    color: COLORS.primary,
  },
  dropHint: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },

  /* table */
  table: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    borderBottomWidth: 0,
  },
  headerText: {
    fontSize: FONT.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
    paddingVertical: SPACING.xs,
  },
  cell: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.sm,
    justifyContent: 'center',
  },
  colExercise: {
    flex: 1.7,
    minWidth: 64,
  },
  colReps: {
    width: 46,
  },
  colWeight: {
    width: 72,
  },
  colNotes: {
    flex: 0.9,
    minWidth: 38,
  },
  colChart: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colStatus: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colRemove: {
    width: 22,
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
  chartIcon: {
    fontSize: FONT.md,
  },
  statusIcon: {
    fontSize: FONT.md,
    fontWeight: '800',
  },
  remove: {
    fontSize: FONT.lg,
    color: COLORS.danger,
    fontWeight: '700',
  },
});
