import { useCallback, useEffect, useState } from 'react';
import { listLogsForExercise } from '../api/workoutLogs';
import type { WorkoutLog } from '../types/db.types';
import { messageOf } from '../utils/errors';

/** Logs for a single exercise, oldest-first. */
export function useWorkoutLogs(exerciseId: string) {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await listLogsForExercise(exerciseId));
      setError(null);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { logs, loading, error, refresh };
}
