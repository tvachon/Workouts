import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, FONT, RADIUS, SPACING } from '../../constants/theme';
import { WEEKDAYS } from '../../constants/weekdays';
import { useExercises } from '../../hooks/useExercises';
import { useRoutine } from '../../hooks/useRoutine';
import { assignExerciseToDay, removeExerciseFromDay } from '../../api/routine';
import type { Exercise } from '../../types/db.types';
import type { RootStackParamList } from '../../types/navigation.types';
import { messageOf } from '../../utils/errors';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Frame = { x: number; y: number; width: number; height: number };

const DAY_COL_WIDTH = 150;

export function RoutineScreen() {
  const navigation = useNavigation<Nav>();
  const { exercises, refresh: refreshExercises } = useExercises();
  const {
    loading,
    refresh: refreshRoutine,
    exerciseIdsForWeekday,
  } = useRoutine();

  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverWeekday, setHoverWeekday] = useState<number | null>(null);

  // Drop-zone frames in window coordinates, keyed by weekday index.
  const dayFrames = useRef<Record<number, Frame>>({});

  useFocusEffect(
    useCallback(() => {
      refreshExercises();
      refreshRoutine();
    }, [refreshExercises, refreshRoutine]),
  );

  const weekdayAtPoint = useCallback((px: number, py: number): number | null => {
    for (const day of WEEKDAYS) {
      const f = dayFrames.current[day.index];
      if (
        f &&
        px >= f.x &&
        px <= f.x + f.width &&
        py >= f.y &&
        py <= f.y + f.height
      ) {
        return day.index;
      }
    }
    return null;
  }, []);

  const handleDragStart = useCallback((id: string) => {
    setDraggingId(id);
    setError(null);
  }, []);

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

  const exercisesById = useCallback(
    (id: string) => exercises.find((e) => e.id === id),
    [exercises],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshRoutine} />
        }
      >
        <Text style={styles.heading}>Weekly routine</Text>
        <Text style={styles.sub}>Drag an exercise into a day to schedule it.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Tag field: draggable exercise tags */}
        <View style={[styles.palette, draggingId ? styles.paletteLifted : null]}>
          {exercises.length === 0 ? (
            <Pressable
              onPress={() => navigation.navigate('ExerciseForm', {})}
              style={styles.emptyPalette}
            >
              <Text style={styles.emptyText}>
                No exercises yet — add one to get tags here.
              </Text>
              <Text style={styles.link}>Add an exercise →</Text>
            </Pressable>
          ) : (
            exercises.map((ex) => (
              <DraggableTag
                key={ex.id}
                exercise={ex}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDrop={handleDrop}
              />
            ))
          )}
        </View>

        {/* Days of the week, horizontally */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysRow}
          // Don't steal the drag gesture while a tag is being dragged.
          scrollEnabled={!draggingId}
        >
          {WEEKDAYS.map((day) => {
            const assigned = exerciseIdsForWeekday(day.index);
            return (
              <DayColumn
                key={day.index}
                weekday={day.index}
                title={day.full}
                highlighted={hoverWeekday === day.index}
                onMeasure={(frame) => {
                  dayFrames.current[day.index] = frame;
                }}
              >
                {[...assigned].length === 0 ? (
                  <Text style={styles.dropHint}>Drop here</Text>
                ) : (
                  [...assigned].map((id) => {
                    const ex = exercisesById(id);
                    if (!ex) return null;
                    return (
                      <View key={id} style={styles.placedChip}>
                        <Text style={styles.placedText} numberOfLines={1}>
                          {ex.name}
                        </Text>
                        <Pressable
                          onPress={() => handleRemove(id, day.index)}
                          hitSlop={8}
                        >
                          <Text style={styles.remove}>×</Text>
                        </Pressable>
                      </View>
                    );
                  })
                )}
              </DayColumn>
            );
          })}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Draggable exercise tag ---------- */

interface DraggableTagProps {
  exercise: Exercise;
  onDragStart: (id: string) => void;
  onDragMove: (px: number, py: number) => void;
  onDrop: (id: string, px: number, py: number) => void;
}

function DraggableTag({
  exercise,
  onDragStart,
  onDragMove,
  onDrop,
}: DraggableTagProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [dragging, setDragging] = useState(false);

  const responder = useRef(
    PanResponder.create({
      // Capture variants claim the gesture before the ScrollView / browser
      // text-selection can, which is what makes the drag start reliably on web.
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
        styles.tag,
        {
          transform: pan.getTranslateTransform(),
          zIndex: dragging ? 999 : 1,
          elevation: dragging ? 8 : 0,
          opacity: dragging ? 0.92 : 1,
        },
        dragging ? styles.tagDragging : null,
      ]}
    >
      <Text style={styles.tagText} numberOfLines={1}>
        {exercise.name}
      </Text>
    </Animated.View>
  );
}

/* ---------- Day drop column ---------- */

interface DayColumnProps {
  weekday: number;
  title: string;
  highlighted: boolean;
  onMeasure: (frame: Frame) => void;
  children: React.ReactNode;
}

function DayColumn({
  title,
  highlighted,
  onMeasure,
  children,
}: DayColumnProps) {
  const ref = useRef<View>(null);

  const measure = useCallback(
    (_e: LayoutChangeEvent) => {
      // Window coordinates so the drop hit-test matches the drag's page position.
      ref.current?.measureInWindow((x, y, width, height) => {
        onMeasure({ x, y, width, height });
      });
    },
    [onMeasure],
  );

  return (
    <View
      ref={ref}
      onLayout={measure}
      style={[styles.dayCol, highlighted ? styles.dayColActive : null]}
    >
      <Text style={styles.dayName}>{title}</Text>
      <View style={styles.dayBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
  },
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
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  paletteLifted: {
    zIndex: 10,
    overflow: 'visible',
  },
  emptyPalette: {
    paddingVertical: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
  },
  link: {
    color: COLORS.primary,
    fontSize: FONT.md,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  tag: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    maxWidth: 160,
    // Stop the browser from selecting the label text on mousedown, which
    // otherwise steals the gesture and the drag never starts.
    userSelect: 'none',
  },
  tagDragging: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  tagText: {
    color: COLORS.onPrimary,
    fontWeight: '700',
    fontSize: FONT.sm,
    userSelect: 'none',
  },
  daysRow: {
    gap: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  dayCol: {
    width: DAY_COL_WIDTH,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    minHeight: 180,
  },
  dayColActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#EEF3FF',
  },
  dayName: {
    fontSize: FONT.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  dayBody: {
    gap: SPACING.xs,
  },
  dropHint: {
    fontSize: FONT.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  placedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  placedText: {
    flex: 1,
    fontSize: FONT.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: SPACING.xs,
  },
  remove: {
    fontSize: FONT.lg,
    color: COLORS.danger,
    fontWeight: '700',
    paddingHorizontal: SPACING.xs,
  },
});
