import { supabase, requireUserId } from '../lib/supabase';
import type { RoutineDay } from '../types/db.types';

/** Every routine assignment for the user (used to build the weekly grid). */
export async function listRoutine(): Promise<RoutineDay[]> {
  const { data, error } = await supabase
    .from('routine_days')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoutineDay[];
}

export async function assignExerciseToDay(
  exerciseId: string,
  weekday: number,
): Promise<void> {
  const user_id = await requireUserId();
  // Append to the bottom of the day so existing order is preserved and the new
  // row gets a distinct sort_order (rather than tying at the default 0).
  const { data: last } = await supabase
    .from('routine_days')
    .select('sort_order')
    .eq('weekday', weekday)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = (last?.sort_order ?? -1) + 1;
  // Idempotent: unique(user_id, exercise_id, weekday) means a repeat is a no-op.
  const { error } = await supabase.from('routine_days').upsert(
    { user_id, exercise_id: exerciseId, weekday, sort_order },
    { onConflict: 'user_id,exercise_id,weekday', ignoreDuplicates: true },
  );
  if (error) throw error;
}

/**
 * Persist a new top-to-bottom order for a day's exercises by rewriting each
 * row's sort_order to its array index. The unique(user_id, exercise_id, weekday)
 * constraint makes every upsert an in-place update of an existing assignment.
 */
export async function reorderDayExercises(
  weekday: number,
  orderedExerciseIds: string[],
): Promise<void> {
  if (orderedExerciseIds.length === 0) return;
  const user_id = await requireUserId();
  const rows = orderedExerciseIds.map((exercise_id, sort_order) => ({
    user_id,
    exercise_id,
    weekday,
    sort_order,
  }));
  const { error } = await supabase
    .from('routine_days')
    .upsert(rows, { onConflict: 'user_id,exercise_id,weekday' });
  if (error) throw error;
}

export async function removeExerciseFromDay(
  exerciseId: string,
  weekday: number,
): Promise<void> {
  const { error } = await supabase
    .from('routine_days')
    .delete()
    .eq('exercise_id', exerciseId)
    .eq('weekday', weekday);
  if (error) throw error;
}
