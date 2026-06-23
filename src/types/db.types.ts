// Row shapes mirroring supabase/schema.sql.
export type WeightUnit = 'lb' | 'kg';

export interface Exercise {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  unit: WeightUnit;
  created_at: string;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  exercise_id: string;
  performed_on: string; // ISO date 'YYYY-MM-DD'
  reps: number;
  weight: number;
  notes: string | null;
  created_at: string;
}

export interface RoutineDay {
  id: string;
  user_id: string;
  exercise_id: string;
  weekday: number; // 0=Sun ... 6=Sat
  sort_order: number;
}
