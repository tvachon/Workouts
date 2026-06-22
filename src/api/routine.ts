import { supabase, requireUserId } from '../lib/supabase';
import type { RoutineDay, RoutineDayWithExercise } from '../types/db.types';

/** Every routine assignment for the user (used to build the weekly grid). */
export async function listRoutine(): Promise<RoutineDay[]> {
  const { data, error } = await supabase
    .from('routine_days')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoutineDay[];
}

/** Exercises scheduled for a given weekday, with the joined exercise row. */
export async function listRoutineForWeekday(
  weekday: number,
): Promise<RoutineDayWithExercise[]> {
  const { data, error } = await supabase
    .from('routine_days')
    .select('*, exercise:exercises(*)')
    .eq('weekday', weekday)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoutineDayWithExercise[];
}

export async function assignExerciseToDay(
  exerciseId: string,
  weekday: number,
): Promise<void> {
  const user_id = await requireUserId();
  // Idempotent: unique(user_id, exercise_id, weekday) means a repeat is a no-op.
  const { error } = await supabase.from('routine_days').upsert(
    { user_id, exercise_id: exerciseId, weekday },
    { onConflict: 'user_id,exercise_id,weekday', ignoreDuplicates: true },
  );
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
