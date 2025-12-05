import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { usePageState } from './usePageState';
import { processProgressData, type ExerciseProgress } from '../utils/progress-helpers';
import { normalizeExerciseName } from '../utils/exercise-name';

export type ExerciseOption = {
  name: string;
  totalSets: number;
};

export type ProgressPageState = {
  searchQuery: string;
  selectedExercise: string | null;
};

export function useProgress() {
  const { user } = useAuth();

  const workoutIdsRef = useRef<string[] | null>(null);
  const progressCacheRef = useRef<Map<string, { data: ExerciseProgress; ts: number }>>(new Map());
  const progressCacheTtl = 5 * 60 * 1000;

  const [exercises, setExercises] = useState<ExerciseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<ExerciseProgress | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [pageState, setPageState] = usePageState<ProgressPageState>({
    key: 'progress-page',
    initialState: { searchQuery: '', selectedExercise: null },
    ttl: 30 * 60 * 1000,
  });

  const { searchQuery, selectedExercise } = pageState;

  const setSearchQuery = (value: string) => {
    setPageState(prev => ({ ...prev, searchQuery: value }));
  };

  const setSelectedExercise = (value: string | null) => {
    setPageState(prev => ({ ...prev, selectedExercise: value }));
  };

  const getWorkoutIds = useCallback(async (): Promise<string[]> => {
    if (!user) return [];
    if (workoutIdsRef.current) return workoutIdsRef.current;

    const { data: workouts, error: wErr } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_id', user.id);

    if (wErr) throw wErr;

    const workoutIds = (workouts || []).map((w: any) => w.id as string);
    workoutIdsRef.current = workoutIds;
    return workoutIds;
  }, [user]);

  const fetchExercises = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const workoutIds = await getWorkoutIds();

      if (workoutIds.length === 0) {
        setExercises([]);
        return;
      }

      const { data: progressRows, error: pErr } = await supabase
        .from('exercise_progress_view')
        .select('workout_id, exercise_id, max_weight')
        .in('workout_id', workoutIds);
      if (pErr) throw pErr;

      const statsByExerciseId = new Map<string, number>();

      (progressRows || []).forEach((row: any) => {
        const id = row.exercise_id as string | null;
        const weight = row.max_weight || 0;
        if (!id || weight <= 0) return;
        const prev = statsByExerciseId.get(id) || 0;
        statsByExerciseId.set(id, prev + 1);
      });

      if (statsByExerciseId.size === 0) {
        setExercises([]);
        return;
      }

      const { data: exerciseRows, error: eErr } = await supabase
        .from('workout_exercises')
        .select('id, name')
        .in('id', Array.from(statsByExerciseId.keys()));
      if (eErr) throw eErr;

      const normalize = normalizeExerciseName;

      const exerciseMap = new Map<string, { name: string; total: number }>();

      (exerciseRows || []).forEach((ex: any) => {
        const rawName = (ex.name ?? '').trim();
        if (!rawName) return;
        const key = normalize(rawName);
        const totalSessions = statsByExerciseId.get(ex.id as string) || 0;
        if (totalSessions <= 0) return;
        const prev = exerciseMap.get(key);
        if (prev) {
          exerciseMap.set(key, {
            name: prev.name.length >= rawName.length ? prev.name : rawName,
            total: prev.total + totalSessions,
          });
        } else {
          exerciseMap.set(key, {
            name: rawName,
            total: totalSessions,
          });
        }
      });

      const options: ExerciseOption[] = Array.from(exerciseMap.values())
        .map(({ name, total }) => ({ name, totalSets: total }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

      setExercises(options);
    } catch (error: any) {
      console.error('Error fetching progress exercises:', error);
      alert('Не удалось загрузить список упражнений');
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadProgress = useCallback(
    async (exerciseName: string | null) => {
      if (!user || !exerciseName) {
        setProgressData(null);
        return;
      }

      const target = normalizeExerciseName(exerciseName);
      const cached = progressCacheRef.current.get(target);
      const now = Date.now();

      if (cached && now - cached.ts < progressCacheTtl) {
        setProgressData(cached.data);
        return;
      }

      setLoadingProgress(true);
      try {
        const workoutIds = await getWorkoutIds();

        if (workoutIds.length === 0) {
          setProgressData({
            exerciseName,
            dataPoints: [],
            totalSessions: 0,
            maxWeight: 0,
            minWeight: 0,
          });
          progressCacheRef.current.set(target, {
            data: {
              exerciseName,
              dataPoints: [],
              totalSessions: 0,
              maxWeight: 0,
              minWeight: 0,
            },
            ts: Date.now(),
          });
          return;
        }

        const { data: exList, error: exListErr } = await supabase
          .from('workout_exercises')
          .select('id, name, workout_id')
          .in('workout_id', workoutIds);

        if (exListErr) throw exListErr;

        const exerciseIds = new Set<string>();

        (exList || []).forEach((ex: any) => {
          const rawName = (ex.name ?? '').trim();
          if (!rawName) return;
          if (normalizeExerciseName(rawName) === target) {
            exerciseIds.add(ex.id as string);
          }
        });

        if (exerciseIds.size === 0) {
          setProgressData({
            exerciseName,
            dataPoints: [],
            totalSessions: 0,
            maxWeight: 0,
            minWeight: 0,
          });
          return;
        }

        const { data: viewRows, error: viewErr } = await supabase
          .from('exercise_progress_view')
          .select('workout_date, workout_name, workout_id, exercise_id, max_weight, reps_at_max_weight')
          .in('workout_id', workoutIds)
          .in('exercise_id', Array.from(exerciseIds));

        if (viewErr) throw viewErr;

        const rawData = (viewRows || []).map((row: any) => ({
          workout_date: row.workout_date as string,
          workout_name: row.workout_name as string,
          workout_id: row.workout_id as string,
          exercise_id: row.exercise_id as string,
          max_weight: row.max_weight as number | null,
          reps_at_max_weight: row.reps_at_max_weight as string | null,
        }));

        const processed = processProgressData(exerciseName, rawData);
        setProgressData(processed);
        progressCacheRef.current.set(target, { data: processed, ts: Date.now() });
      } catch (error: any) {
        console.error('Error loading progress data:', error);
        alert('Не удалось загрузить данные прогресса');
        setProgressData(null);
      } finally {
        setLoadingProgress(false);
      }
    },
    [user, getWorkoutIds, progressCacheTtl],
  );

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  useEffect(() => {
    workoutIdsRef.current = null;
    progressCacheRef.current.clear();
  }, [user?.id]);

  return {
    exercises,
    loading,
    progressData,
    loadingProgress,
    searchQuery,
    selectedExercise,
    setSearchQuery,
    setSelectedExercise,
    loadProgress,
  };
}
