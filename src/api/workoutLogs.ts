import { supabase, requireUserId } from '../lib/supabase';
import type { WorkoutLog } from '../types/db.types';

export interface LogInput {
  exerciseId: string;
  performedOn: string; // 'YYYY-MM-DD'
  reps: number | null; // null = no rep/distance count (e.g. duration runs)
  weight: number | null; // null = bodyweight / no external load
  notes: string | null;
}

/** All logs for an exercise, oldest first (chart-friendly order). */
export async function listLogsForExercise(
  exerciseId: string,
): Promise<WorkoutLog[]> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('exercise_id', exerciseId)
    .order('performed_on', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkoutLog[];
}

/**
 * The most recent log strictly before `before` for each of the given
 * exercises, keyed by exercise id. Used to seed the week grid with faint
 * "last time" placeholders for exercises whose history predates this week.
 */
export async function latestLogBeforePerExercise(
  exerciseIds: string[],
  before: string,
): Promise<Record<string, WorkoutLog>> {
  if (exerciseIds.length === 0) return {};
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .in('exercise_id', exerciseIds)
    .lt('performed_on', before)
    .order('performed_on', { ascending: false });
  if (error) throw error;
  // Rows arrive newest-first, so the first one seen per exercise is its latest.
  const latest: Record<string, WorkoutLog> = {};
  for (const log of (data ?? []) as WorkoutLog[]) {
    if (!latest[log.exercise_id]) latest[log.exercise_id] = log;
  }
  return latest;
}

/** All logs recorded on a given day, across every exercise. */
export async function listLogsForDate(
  performedOn: string,
): Promise<WorkoutLog[]> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('performed_on', performedOn);
  if (error) throw error;
  return (data ?? []) as WorkoutLog[];
}

/** All logs in an inclusive date range, across every exercise (week view). */
export async function listLogsForDateRange(
  start: string,
  end: string,
): Promise<WorkoutLog[]> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .gte('performed_on', start)
    .lte('performed_on', end);
  if (error) throw error;
  return (data ?? []) as WorkoutLog[];
}

/**
 * The most recent log for an exercise strictly before a date, if any.
 * Used to hint the entry form with what was lifted last time.
 */
export async function getLatestLogBefore(
  exerciseId: string,
  performedOn: string,
): Promise<WorkoutLog | null> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('exercise_id', exerciseId)
    .lt('performed_on', performedOn)
    .order('performed_on', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as WorkoutLog | null) ?? null;
}

/** The single log for an exercise on a given day, if one exists. */
export async function getLogForDate(
  exerciseId: string,
  performedOn: string,
): Promise<WorkoutLog | null> {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('exercise_id', exerciseId)
    .eq('performed_on', performedOn)
    .maybeSingle();
  if (error) throw error;
  return (data as WorkoutLog | null) ?? null;
}

/**
 * Create or overwrite the log for (exercise, day). The unique constraint on
 * (user_id, exercise_id, performed_on) enforces one entry per exercise per day;
 * upserting on that constraint means re-logging the same day updates instead of
 * erroring with 23505.
 */
export async function upsertLog(input: LogInput): Promise<WorkoutLog> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from('workout_logs')
    .upsert(
      {
        user_id,
        exercise_id: input.exerciseId,
        performed_on: input.performedOn,
        reps: input.reps,
        weight: input.weight,
        notes: input.notes,
      },
      { onConflict: 'user_id,exercise_id,performed_on' },
    )
    .select()
    .single();
  if (error) throw error;
  return data as WorkoutLog;
}

export async function deleteLog(id: string): Promise<void> {
  const { error } = await supabase.from('workout_logs').delete().eq('id', id);
  if (error) throw error;
}
