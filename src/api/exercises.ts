import { supabase, requireUserId } from '../lib/supabase';
import type { Exercise, WeightUnit } from '../types/db.types';

export interface ExerciseInput {
  name: string;
  description: string | null;
  unit: WeightUnit;
}

export async function listExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Exercise[];
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Exercise | null) ?? null;
}

export async function createExercise(input: ExerciseInput): Promise<Exercise> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from('exercises')
    .insert({ ...input, user_id })
    .select()
    .single();
  if (error) throw error;
  return data as Exercise;
}

export async function updateExercise(
  id: string,
  input: ExerciseInput,
): Promise<Exercise> {
  const { data, error } = await supabase
    .from('exercises')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Exercise;
}

export async function deleteExercise(id: string): Promise<void> {
  // workout_logs and routine_days cascade-delete via FK in the schema.
  const { error } = await supabase.from('exercises').delete().eq('id', id);
  if (error) throw error;
}
