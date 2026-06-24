// Row shapes mirroring supabase/schema.sql.
// 'min' (minutes) is for duration-based exercises like runs.
export type Unit = 'lb' | 'kg' | 'min';

export interface Exercise {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  unit: Unit;
  created_at: string;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  exercise_id: string;
  performed_on: string; // ISO date 'YYYY-MM-DD'
  reps: number | null; // null = no rep/distance count (e.g. duration runs)
  weight: number | null; // null = bodyweight / no external load
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
