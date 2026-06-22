import { supabase, requireUserId } from '../lib/supabase';
import type { WorkoutLog } from '../types/db.types';

export interface LogInput {
  exerciseId: string;
  performedOn: string; // 'YYYY-MM-DD'
  reps: number;
  weight: number;
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
