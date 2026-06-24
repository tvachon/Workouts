import React, {
  useCallback,
  useEffect,
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
import {
  assignExerciseToDay,
  removeExerciseFromDay,
  reorderDayExercises,
} from '../../api/routine';
import { deleteLog, listLogsForDateRange, upsertLog } from '../../api/workoutLogs';
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
  const {
    refresh: refreshRoutine,
    exerciseIdsForWeekday,
    applyLocalOrder,
  } = useRoutine();

  const week = useMemo(() => currentWeek(), []);
  const [logs, setLogs] = useState<Record<string, WorkoutLog>>({});
  // Latest logs without re-creating the clear handler on every keystroke-save.
  const logsRef = useRef(logs);
  logsRef.current = logs;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverWeekday, setHoverWeekday] = useState<number | null>(null);
  // True while a row is being dragged to reorder within a day (locks scroll).
  const [rowDragActive, setRowDragActive] = useState(false);

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
      // The days collapse out from under the finger, so keep the drop-zone
      // frames fresh each move (fire-and-forget; hit-test uses the latest set).
      measureFrames();
      setHoverWeekday(weekdayAtPoint(px, py));
    },
    [measureFrames, weekdayAtPoint],
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

  // A row whose distance and time were both cleared no longer holds a workout;
  // delete its saved log so the blanked fields don't revert on the next load.
  const handleClearLog = useCallback(
    async (exerciseId: string, performedOn: string) => {
      const key = logKey(exerciseId, performedOn);
      const existing = logsRef.current[key];
      if (!existing) return;
      setLogs((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      try {
        await deleteLog(existing.id);
      } catch (e) {
        setError(messageOf(e));
        loadLogs(); // restore server truth if the delete failed
      }
    },
    [loadLogs],
  );

  const handleReorder = useCallback(
    async (weekday: number, orderedIds: string[]) => {
      applyLocalOrder(weekday, orderedIds); // optimistic: reflect instantly
      try {
        await reorderDayExercises(weekday, orderedIds);
      } catch (e) {
        setError(messageOf(e));
        refreshRoutine(); // fall back to server truth if the write failed
      }
    },
    [applyLocalOrder, refreshRoutine],
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
        scrollEnabled={!draggingId && !rowDragActive}
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
                collapsed={draggingId !== null}
                registerNode={(node) => {
                  dayNodes.current[weekday] = node;
                }}
              >
                {assigned.length === 0 ? (
                  <Text style={styles.dropHint}>
                    {draggingId ? 'Drop here' : 'Rest day — nothing scheduled'}
                  </Text>
                ) : (
                  <DayTable
                    exerciseIds={assigned}
                    exercisesById={exercisesById}
                    performedOn={iso}
                    logs={logs}
                    onOpenChart={openChart}
                    onRemove={(id) => handleRemove(id, weekday)}
                    onClearLog={(id) => handleClearLog(id, iso)}
                    onReorder={(orderedIds) => handleReorder(weekday, orderedIds)}
                    onDragActiveChange={setRowDragActive}
                    onSaved={(log) =>
                      setLogs((prev) => ({
                        ...prev,
                        [logKey(log.exercise_id, log.performed_on)]: log,
                      }))
                    }
                  />
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
  // While a palette chip is in flight, every day collapses to just its header
  // so all seven become visible drop targets without scrolling.
  collapsed: boolean;
  registerNode: (node: View | null) => void;
  children: React.ReactNode;
}

function DaySection({
  title,
  dateLabel,
  isToday,
  highlighted,
  collapsed,
  registerNode,
  children,
}: DaySectionProps) {
  const ref = useRef<View>(null);
  // 1 = open, 0 = collapsed. Drives both the body height and its fade.
  const anim = useRef(new Animated.Value(1)).current;
  // Natural height of the body, measured from its own (unclipped) layout.
  const [bodyHeight, setBodyHeight] = useState<number | null>(null);

  const setRef = useCallback(
    (node: View | null) => {
      ref.current = node;
      registerNode(node);
    },
    [registerNode],
  );

  useEffect(() => {
    Animated.timing(anim, {
      toValue: collapsed ? 0 : 1,
      duration: 220,
      // Animating height is a layout prop, so it can't use the native driver.
      useNativeDriver: false,
    }).start();
  }, [collapsed, anim]);

  const onBodyLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setBodyHeight((prev) => (prev == null || Math.abs(prev - h) > 0.5 ? h : prev));
  }, []);

  return (
    <View
      ref={setRef}
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
      <Animated.View
        style={[
          styles.dayBody,
          { opacity: anim },
          // Constrain to the measured height only once we have it, so the very
          // first render lays out naturally and seeds the measurement.
          bodyHeight != null
            ? {
                height: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, bodyHeight],
                }),
              }
            : null,
        ]}
      >
        <View onLayout={onBodyLayout}>{children}</View>
      </Animated.View>
    </View>
  );
}

/* ---------- One day's reorderable table of exercise rows ---------- */

interface DayTableProps {
  exerciseIds: string[];
  exercisesById: Map<string, Exercise>;
  performedOn: string;
  logs: Record<string, WorkoutLog>;
  onOpenChart: (id: string) => void;
  onRemove: (id: string) => void;
  onClearLog: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onDragActiveChange: (active: boolean) => void;
  onSaved: (log: WorkoutLog) => void;
}

function DayTable({
  exerciseIds,
  exercisesById,
  performedOn,
  logs,
  onOpenChart,
  onRemove,
  onClearLog,
  onReorder,
  onDragActiveChange,
  onSaved,
}: DayTableProps) {
  const pan = useRef(new Animated.Value(0)).current;
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  // Insertion gap (0..n) the dragged row would land at, in original-array terms.
  const [dropGap, setDropGap] = useState<number | null>(null);
  const dropGapRef = useRef<number | null>(null);

  // Resting window-frame of each row, captured at drag start, keyed by index.
  const rowNodes = useRef<Record<number, View | null>>({});
  const frames = useRef<Array<{ y: number; height: number } | undefined>>([]);

  const measureRows = useCallback(() => {
    frames.current = new Array(exerciseIds.length);
    for (let k = 0; k < exerciseIds.length; k++) {
      const node = rowNodes.current[k];
      node?.measureInWindow((_x, y, _w, height) => {
        frames.current[k] = { y, height };
      });
    }
  }, [exerciseIds.length]);

  // Insertion gap = count of rows whose vertical midpoint sits above the finger.
  const gapAt = useCallback((pointerY: number): number => {
    let gap = 0;
    const f = frames.current;
    for (let k = 0; k < f.length; k++) {
      const fr = f[k];
      if (fr && pointerY > fr.y + fr.height / 2) gap = k + 1;
    }
    return gap;
  }, []);

  const handleDragStart = useCallback(
    (index: number) => {
      measureRows();
      pan.setValue(0);
      setDraggingIndex(index);
      setDropGap(index);
      dropGapRef.current = index;
      onDragActiveChange(true);
    },
    [measureRows, pan, onDragActiveChange],
  );

  const handleDragMove = useCallback(
    (_index: number, pointerY: number, dy: number) => {
      pan.setValue(dy);
      const gap = gapAt(pointerY);
      setDropGap(gap);
      dropGapRef.current = gap;
    },
    [pan, gapAt],
  );

  const handleDrop = useCallback(
    (index: number) => {
      const gap = dropGapRef.current ?? index;
      setDraggingIndex(null);
      setDropGap(null);
      dropGapRef.current = null;
      pan.setValue(0);
      onDragActiveChange(false);

      // Removing the dragged row shifts everything after it up by one, so a gap
      // below the original slot maps to one index earlier in the trimmed array.
      const next = [...exerciseIds];
      const [moved] = next.splice(index, 1);
      const insertAt = Math.max(0, Math.min(gap > index ? gap - 1 : gap, next.length));
      next.splice(insertAt, 0, moved);
      if (next.some((id, i) => id !== exerciseIds[i])) onReorder(next);
    },
    [exerciseIds, pan, onDragActiveChange, onReorder],
  );

  // Show the drop indicator only where it represents an actual move (not the
  // dragged row's own slot or the gap immediately below it).
  const showLine = (gap: number) =>
    draggingIndex !== null &&
    dropGap === gap &&
    gap !== draggingIndex &&
    gap !== draggingIndex + 1;

  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.headerRow]}>
        <View style={styles.colHandle} />
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
          Reps/Mi
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.cell, styles.colWeight, styles.headerText]}
        >
          Wt/Mins
        </Text>
        <View style={styles.colChart} />
        <View style={styles.colStatus} />
        <View style={styles.colRemove} />
      </View>

      {exerciseIds.map((id, index) => {
        const ex = exercisesById.get(id);
        if (!ex) return null;
        const isDragging = draggingIndex === index;
        return (
          <React.Fragment key={id}>
            {showLine(index) ? <View style={styles.dropLine} /> : null}
            {/* Outer view stays put so its frame marks the resting position. */}
            <View ref={(node) => { rowNodes.current[index] = node; }}>
              <Animated.View
                style={
                  isDragging
                    ? [
                        styles.rowDragging,
                        {
                          transform: [{ translateY: pan }],
                          zIndex: 999,
                          elevation: 8,
                          opacity: 0.97,
                        },
                      ]
                    : null
                }
              >
                <WorkoutRow
                  exercise={ex}
                  performedOn={performedOn}
                  initial={logs[logKey(id, performedOn)]}
                  dragHandle={
                    <DragHandle
                      index={index}
                      onStart={handleDragStart}
                      onMove={handleDragMove}
                      onDrop={handleDrop}
                    />
                  }
                  onOpenChart={() => onOpenChart(id)}
                  onRemove={() => onRemove(id)}
                  onClearLog={() => onClearLog(id)}
                  onSaved={onSaved}
                />
              </Animated.View>
            </View>
          </React.Fragment>
        );
      })}
      {showLine(exerciseIds.length) ? <View style={styles.dropLine} /> : null}
    </View>
  );
}

/* ---------- Drag handle (grip) that drives row reordering ---------- */

interface DragHandleProps {
  index: number;
  onStart: (index: number) => void;
  onMove: (index: number, pointerY: number, dy: number) => void;
  onDrop: (index: number) => void;
}

function DragHandle({ index, onStart, onMove, onDrop }: DragHandleProps) {
  // The PanResponder is created once, but rows change index when reordered, so
  // read the latest props from a ref inside the handlers.
  const latest = useRef({ index, onStart, onMove, onDrop });
  latest.current = { index, onStart, onMove, onDrop };

  const responder = useRef(
    PanResponder.create({
      // Capture variants claim the gesture before the ScrollView can, so the
      // drag starts reliably (matches the palette chip behaviour).
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => latest.current.onStart(latest.current.index),
      onPanResponderMove: (_e, g) =>
        latest.current.onMove(latest.current.index, g.moveY, g.dy),
      onPanResponderRelease: () => latest.current.onDrop(latest.current.index),
      onPanResponderTerminate: () => latest.current.onDrop(latest.current.index),
    }),
  ).current;

  return (
    <View {...responder.panHandlers} style={styles.colHandle} hitSlop={8}>
      <Text style={styles.handleIcon}>☰</Text>
    </View>
  );
}

/* ---------- One editable, loggable table row ---------- */

interface WorkoutRowProps {
  exercise: Exercise;
  performedOn: string;
  initial?: WorkoutLog;
  dragHandle: React.ReactNode;
  onOpenChart: () => void;
  onRemove: () => void;
  onClearLog: () => void;
  onSaved: (log: WorkoutLog) => void;
}

function WorkoutRow({
  exercise,
  performedOn,
  initial,
  dragHandle,
  onOpenChart,
  onRemove,
  onClearLog,
  onSaved,
}: WorkoutRowProps) {
  const [reps, setReps] = useState(
    initial && initial.reps != null ? String(initial.reps) : '',
  );
  const [weight, setWeight] = useState(
    initial && initial.weight != null ? String(initial.weight) : '',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [status, setStatus] = useState<RowStatus>(initial ? 'saved' : 'idle');
  const lastSaved = useRef({ reps, weight, notes });

  // The row can mount before the parent's logs finish loading, so `initial` may
  // arrive (or change) after mount. Re-sync the fields when that happens so
  // late-loading data shows — but never clobber edits the user has typed and
  // not yet saved (current values differing from the last saved snapshot).
  useEffect(() => {
    const synced = {
      reps: initial && initial.reps != null ? String(initial.reps) : '',
      weight: initial && initial.weight != null ? String(initial.weight) : '',
      notes: initial?.notes ?? '',
    };
    const alreadyShown =
      synced.reps === lastSaved.current.reps &&
      synced.weight === lastSaved.current.weight &&
      synced.notes === lastSaved.current.notes;
    const dirty =
      reps !== lastSaved.current.reps ||
      weight !== lastSaved.current.weight ||
      notes !== lastSaved.current.notes;
    if (alreadyShown || dirty) return;

    setReps(synced.reps);
    setWeight(synced.weight);
    setNotes(synced.notes);
    lastSaved.current = synced;
    setStatus(initial ? 'saved' : 'idle');
  }, [initial, reps, weight, notes]);

  const save = useCallback(async () => {
    // The reps/mi field holds reps for lifts or miles for runs; the weight field
    // holds load for lifts or minutes for runs. A blank field is null (not 0).
    const repsProvided = reps.trim() !== '';
    const weightProvided = weight.trim() !== '';
    const changed =
      reps !== lastSaved.current.reps ||
      weight !== lastSaved.current.weight ||
      notes !== lastSaved.current.notes;
    if (!changed) return;

    // Both metrics cleared: this isn't a workout anymore. Delete any saved log
    // so the blanked fields stick instead of reverting to the old value on the
    // next refresh. (Without an existing log there's simply nothing to write.)
    if (!repsProvided && !weightProvided) {
      lastSaved.current = { reps, weight, notes };
      if (initial) {
        setStatus('saving');
        try {
          await onClearLog();
          setStatus('idle');
        } catch {
          setStatus('error');
        }
      } else {
        setStatus('idle');
      }
      return;
    }

    const repsNum = repsProvided ? Number(reps) : null; // null = no rep/distance count
    const weightNum = weightProvided ? Number(weight) : null; // null = bodyweight
    const valid =
      (repsNum === null || (Number.isFinite(repsNum) && repsNum >= 0)) &&
      (weightNum === null || (Number.isFinite(weightNum) && weightNum >= 0));
    if (!valid) return;

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
  }, [reps, weight, notes, exercise.id, performedOn, initial, onClearLog, onSaved]);

  return (
    <View style={styles.row}>
      {dragHandle}
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
        keyboardType="decimal-pad"
      />
      <TextInput
        style={[styles.cell, styles.colWeight, styles.input]}
        value={weight}
        onChangeText={setWeight}
        onBlur={save}
        keyboardType="decimal-pad"
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
  // Collapsible body: clips its child so the height animation reads cleanly.
  dayBody: {
    overflow: 'hidden',
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
  rowDragging: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  dropLine: {
    height: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
  colHandle: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
    // Stop the browser selecting the glyph on mousedown (it steals the gesture).
    userSelect: 'none',
  },
  handleIcon: {
    fontSize: FONT.md,
    color: COLORS.textMuted,
    userSelect: 'none',
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
    // Wide enough that the "Reps/Mi" header isn't ellipsized.
    width: 72,
    textAlign: 'center',
  },
  colWeight: {
    width: 72,
    textAlign: 'center',
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
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    // A couple of pixels of breathing room so the bordered fields don't touch.
    marginHorizontal: 2,
    marginVertical: 2,
    // Half the cell's vertical padding (SPACING.sm) for a tighter field.
    paddingVertical: SPACING.xs,
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
