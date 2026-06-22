import { useCallback, useEffect, useState } from 'react';
import { listExercises } from '../api/exercises';
import type { Exercise } from '../types/db.types';
import { messageOf } from '../utils/errors';

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setExercises(await listExercises());
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

  return { exercises, loading, error, refresh };
}
