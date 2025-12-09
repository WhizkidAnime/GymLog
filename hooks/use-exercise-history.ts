import { useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { usePageState } from './usePageState';

export type ExerciseHistoryItem = {
  exerciseName: string;
  exerciseId: string;
  workoutDate: string;
  workoutName: string;
  workoutId: string;
  sets: Array<{
    setIndex: number;
    weight: number | null;
    reps: string | null;
    isDone: boolean;
    isDropset: boolean;
    parentSetIndex: number | null;
  }>;
};

export type ExerciseHistoryPageState = {
  searchQuery: string;
  results: ExerciseHistoryItem[];
  loading: boolean;
  hasSearched: boolean;
  lastUpdated: number | null;
  lastQuery: string | null;
};

const CACHE_TTL = 3 * 60 * 1000; // 3 минуты

export function useExerciseHistory() {
  const { user } = useAuth();

  const [pageState, setPageState] = usePageState<ExerciseHistoryPageState>({
    key: 'exercise-history-page',
    initialState: {
      searchQuery: '',
      results: [],
      loading: false,
      hasSearched: false,
      lastUpdated: null,
      lastQuery: null,
    },
    ttl: 30 * 60 * 1000,
  });

  const { searchQuery, results, loading, hasSearched, lastUpdated, lastQuery } = pageState;

  const latestRequestIdRef = useRef(0);

  const setSearchQuery = useCallback(
    (value: string) => {
      setPageState(prev => ({ ...prev, searchQuery: value }));
    },
    [setPageState],
  );

  const clearSearch = useCallback(
    () => {
      // Инвалидируем все текущие запросы, чтобы их результаты не применялись после очистки
      latestRequestIdRef.current += 1;
      setPageState(prev => {
        const alreadyCleared =
          prev.searchQuery === '' &&
          prev.results.length === 0 &&
          !prev.hasSearched &&
          !prev.loading &&
          prev.lastUpdated === null &&
          prev.lastQuery === null;

        if (alreadyCleared) {
          return prev;
        }

        return {
          ...prev,
          searchQuery: '',
          results: [],
          hasSearched: false,
          loading: false,
          lastUpdated: null,
          lastQuery: null,
        };
      });
    },
    [setPageState],
  );

  const searchExercises = useCallback(
    async (query: string) => {
      const normalizedQuery = query.trim();

      if (!user || !normalizedQuery) {
        setPageState(prev => ({
          ...prev,
          results: [],
          hasSearched: false,
          loading: false,
          lastUpdated: null,
        }));
        return;
      }

      const requestId = ++latestRequestIdRef.current;

      setPageState(prev => {
        if (latestRequestIdRef.current !== requestId) {
          return prev;
        }
        return { ...prev, loading: true, hasSearched: true };
      });

      try {
        const { data: exercisesData, error } = await supabase
          .from('workout_exercises')
          .select(
            `
          id,
          name,
          workout_id,
          workout_sets (
            set_index,
            weight,
            reps,
            is_done,
            is_dropset,
            parent_set_index
          ),
          workouts!inner (
            id,
            workout_date,
            name,
            user_id
          )
        `,
          )
          .eq('workouts.user_id', user.id)
          .ilike('name', `%${normalizedQuery}%`)
          .order('workouts(workout_date)', { ascending: false });

        if (error) {
          throw error;
        }

        const groupedResults: ExerciseHistoryItem[] = [];

        if (exercisesData) {
          (exercisesData as any[]).forEach(exercise => {
            if (!exercise.workouts) return;

            const sets = (exercise.workout_sets || [])
              .map((set: any) => ({
                setIndex: set.set_index,
                weight: set.weight,
                reps: set.reps,
                isDone: set.is_done,
                isDropset: set.is_dropset ?? false,
                parentSetIndex: set.parent_set_index ?? null,
              }))
              .sort((a: any, b: any) => {
                // Сортировка: дропсеты после родительского подхода
                const aKey = a.isDropset ? (a.parentSetIndex ?? a.setIndex) : a.setIndex;
                const bKey = b.isDropset ? (b.parentSetIndex ?? b.setIndex) : b.setIndex;
                if (aKey !== bKey) return aKey - bKey;
                if (a.isDropset !== b.isDropset) return a.isDropset ? 1 : -1;
                return a.setIndex - b.setIndex;
              });

            groupedResults.push({
              exerciseName: exercise.name,
              exerciseId: exercise.id,
              workoutDate: exercise.workouts.workout_date,
              workoutName: exercise.workouts.name,
              workoutId: exercise.workouts.id,
              sets,
            });
          });
        }
        setPageState(prev => {
          if (latestRequestIdRef.current !== requestId) {
            return prev;
          }

          return {
            ...prev,
            results: groupedResults,
            lastUpdated: Date.now(),
            lastQuery: normalizedQuery,
          };
        });
      } catch (error: any) {
        console.error('Error searching exercises:', error);
        setPageState(prev => {
          if (latestRequestIdRef.current !== requestId) {
            return prev;
          }
          return { ...prev, results: [] };
        });
      } finally {
        setPageState(prev => {
          if (latestRequestIdRef.current !== requestId) {
            return prev;
          }
          return { ...prev, loading: false };
        });
      }
    },
    [user, setPageState],
  );

  const shouldUseCache = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) {
        return false;
      }
      if (lastQuery === q && lastUpdated && Date.now() - lastUpdated < CACHE_TTL) {
        return true;
      }
      return false;
    },
    [lastQuery, lastUpdated],
  );

  return {
    pageState,
    searchQuery,
    results,
    loading,
    hasSearched,
    lastUpdated,
    lastQuery,
    setSearchQuery,
    clearSearch,
    searchExercises,
    shouldUseCache,
  };
}
