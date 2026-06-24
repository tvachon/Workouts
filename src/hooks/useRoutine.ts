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

  /**
   * Set of exercise ids assigned to a given weekday. Insertion order follows
   * sort_order (listRoutine sorts by it), so spreading the set yields the rows
   * top-to-bottom in their configured order.
   */
  const exerciseIdsForWeekday = useCallback(
    (weekday: number): Set<string> =>
      new Set(
        routine.filter((r) => r.weekday === weekday).map((r) => r.exercise_id),
      ),
    [routine],
  );

  /**
   * Optimistically apply a new top-to-bottom order for one weekday so the UI
   * reflects a drag-reorder immediately, before the server round-trip resolves.
   */
  const applyLocalOrder = useCallback(
    (weekday: number, orderedIds: string[]) => {
      setRoutine((prev) => {
        const inDay = new Map(
          prev
            .filter((r) => r.weekday === weekday)
            .map((r) => [r.exercise_id, r] as const),
        );
        const reordered = orderedIds
          .map((id, sort_order) => {
            const row = inDay.get(id);
            return row ? { ...row, sort_order } : null;
          })
          .filter((r): r is RoutineDay => r !== null);
        const others = prev.filter((r) => r.weekday !== weekday);
        return [...others, ...reordered];
      });
    },
    [],
  );

  return {
    routine,
    loading,
    error,
    refresh,
    exerciseIdsForWeekday,
    applyLocalOrder,
  };
}
