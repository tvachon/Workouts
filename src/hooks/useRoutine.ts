import { useCallback, useEffect, useState } from 'react';
import { listRoutine } from '../api/routine';
import type { RoutineDay } from '../types/db.types';
import { messageOf } from '../utils/errors';

/** All routine assignments for the user, grouped by weekday for convenience. */
export function useRoutine() {
  const [routine, setRoutine] = useState<RoutineDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRoutine(await listRoutine());
      setError(null);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Set of exercise ids assigned to a given weekday. */
  const exerciseIdsForWeekday = useCallback(
    (weekday: number): Set<string> =>
      new Set(
        routine.filter((r) => r.weekday === weekday).map((r) => r.exercise_id),
      ),
    [routine],
  );

  return { routine, loading, error, refresh, exerciseIdsForWeekday };
}
