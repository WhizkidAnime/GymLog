import { useCallback, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { usePageState } from './usePageState';
import { formatDate } from '../utils/date-helpers';
import type {
  Workout,
  WorkoutTemplate,
  WorkoutExerciseWithSets,
} from '../types/database.types';
import type { WorkoutIconType } from '../components/workout-icons';

// Улучшенный кеш с timestamp для отслеживания актуальности
export const workoutCache = new Map<string, { 
  workout: Workout | null; 
  exercises: WorkoutExerciseWithSets[];
  timestamp: number;
}>();

// TTL кеша в миллисекундах (30 секунд)
const CACHE_TTL = 30000;

export type WorkoutPageState = {
  workout: Workout | null;
  exercises: WorkoutExerciseWithSets[];
  templates: WorkoutTemplate[];
  loading: boolean;
  isCreating: boolean;
  isSelectTemplateOpen: boolean;
  hasInitialData: boolean;
  isAddingExercise: boolean;
  workoutName: string;
  isSavingWorkoutName: boolean;
  isCardio: boolean;
  isSavingCardio: boolean;
  workoutIcon: WorkoutIconType | null;
  workoutNotes: string;
  isSavingNotes: boolean;
};

const normalizeDateParam = (value?: string): string | null => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatDate(parsed);
};

export function useWorkoutData() {
  const { date } = useParams<{ date: string }>();
  const { user } = useAuth();
  const location = useLocation();
  const db = supabase as any;

  const normalizedDate = useMemo(() => normalizeDateParam(date), [date]);
  const pageStateKey = normalizedDate ? `workout-page:${normalizedDate}` : 'workout-page';

  const [pageState, setPageState] = usePageState<WorkoutPageState>({
    key: pageStateKey,
    initialState: {
      workout: null,
      exercises: [],
      templates: [],
      loading: true,
      isCreating: false,
      isSelectTemplateOpen: false,
      hasInitialData: false,
      isAddingExercise: false,
      workoutName: '',
      isSavingWorkoutName: false,
      isCardio: false,
      isSavingCardio: false,
      workoutIcon: null,
      workoutNotes: '',
      isSavingNotes: false,
    },
    ttl: 30 * 60 * 1000,
  });

  const { workout, exercises, templates, loading, isCreating, isSelectTemplateOpen, hasInitialData, isAddingExercise, workoutName, isSavingWorkoutName, isCardio, isSavingCardio, workoutIcon, workoutNotes, isSavingNotes } = pageState;

  // Сеттеры состояния
  const setWorkout = useCallback((next: Workout | null) => setPageState(prev => ({
    ...prev,
    workout: next,
    workoutName: next?.name ?? '',
    isSavingWorkoutName: false,
    isCardio: next?.is_cardio ?? false,
    isSavingCardio: false,
    workoutIcon: (next?.icon as WorkoutIconType | null) ?? null,
    workoutNotes: next?.notes ?? '',
    isSavingNotes: false,
  })), [setPageState]);

  const setExercises = useCallback((
    next: WorkoutExerciseWithSets[] | ((prev: WorkoutExerciseWithSets[]) => WorkoutExerciseWithSets[])
  ) => setPageState(prev => ({
    ...prev,
    exercises: typeof next === 'function' ? next(prev.exercises) : next,
  })), [setPageState]);

  const setTemplates = useCallback((next: WorkoutTemplate[] | ((prev: WorkoutTemplate[]) => WorkoutTemplate[])) => setPageState(prev => ({
    ...prev,
    templates: typeof next === 'function' ? next(prev.templates) : next,
  })), [setPageState]);

  const setLoading = useCallback((next: boolean) => setPageState(prev => ({ ...prev, loading: next })), [setPageState]);
  const setIsCreating = useCallback((next: boolean) => setPageState(prev => ({ ...prev, isCreating: next })), [setPageState]);
  const setIsSelectTemplateOpen = useCallback((next: boolean) => setPageState(prev => ({ ...prev, isSelectTemplateOpen: next })), [setPageState]);
  const setHasInitialData = useCallback((next: boolean) => setPageState(prev => ({ ...prev, hasInitialData: next })), [setPageState]);
  const setIsAddingExercise = useCallback((next: boolean) => setPageState(prev => ({ ...prev, isAddingExercise: next })), [setPageState]);
  const setWorkoutName = useCallback((next: string) => setPageState(prev => ({ ...prev, workoutName: next })), [setPageState]);
  const setIsSavingWorkoutName = useCallback((next: boolean) => setPageState(prev => ({ ...prev, isSavingWorkoutName: next })), [setPageState]);
  const setIsCardio = useCallback((next: boolean) => setPageState(prev => ({ ...prev, isCardio: next })), [setPageState]);
  const setIsSavingCardio = useCallback((next: boolean) => setPageState(prev => ({ ...prev, isSavingCardio: next })), [setPageState]);
  const setWorkoutIcon = useCallback((next: WorkoutIconType | null) => setPageState(prev => ({ ...prev, workoutIcon: next })), [setPageState]);
  const setWorkoutNotes = useCallback((next: string) => setPageState(prev => ({ ...prev, workoutNotes: next })), [setPageState]);
  const setIsSavingNotes = useCallback((next: boolean) => setPageState(prev => ({ ...prev, isSavingNotes: next })), [setPageState]);

  const fetchWorkoutData = useCallback(async (fromCache = false, silent = false) => {
    if (!user || !normalizedDate) {
      setWorkout(null);
      setExercises([]);
      setLoading(false);
      setHasInitialData(true);
      return;
    }

    const cacheKey = `${user.id}:${normalizedDate}`;
    const now = Date.now();
    
    // Проверяем актуальность кеша
    if (workoutCache.has(cacheKey)) {
      const cached = workoutCache.get(cacheKey)!;
      const cacheAge = now - cached.timestamp;
      
      // Если кеш свежий и мы в режиме fromCache, используем кеш без запроса
      if (fromCache && cacheAge < CACHE_TTL) {
        if (!hasInitialData) {
          setWorkout(cached.workout);
          setExercises(cached.exercises);
          setLoading(false);
          setHasInitialData(true);
        }
        return;
      }
      
      // Если кеш есть, но устарел, показываем старые данные и обновляем в фоне
      if (cacheAge >= CACHE_TTL) {
        if (!hasInitialData) {
          setWorkout(cached.workout);
          setExercises(cached.exercises);
          setHasInitialData(true);
        }
        silent = true;
      }
    }

    if (!silent) {
      setLoading(true);
    }

    const { data: workoutsData, error: workoutError } = await db
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .eq('workout_date', normalizedDate)
      .order('created_at', { ascending: false })
      .limit(1);

    let workoutData = workoutsData?.[0] ?? null;

    if (workoutError) {
      console.error('Error fetching workout:', workoutError);
    } else if (workoutData) {
      // Если тренировка создана по шаблону и иконка в workouts ещё не сохранена
      if (workoutData.template_id && !workoutData.icon) {
        try {
          const { data: templateRow } = await db
            .from('workout_templates')
            .select('icon')
            .eq('id', workoutData.template_id)
            .single();

          if (templateRow?.icon) {
            workoutData = { ...workoutData, icon: templateRow.icon };
            db
              .from('workouts')
              .update({ icon: templateRow.icon })
              .eq('id', workoutData.id)
              .then(() => {}, () => {});
          }
        } catch {}
      }

      setWorkout(workoutData as Workout);
      const { data: exercisesData, error: exercisesError } = await db
        .from('workout_exercises')
        .select('id, name, sets, reps, rest_seconds, position, workout_id, workout_sets ( id, workout_exercise_id, set_index, weight, reps, is_done, is_dropset, parent_set_index, updated_at )')
        .eq('workout_id', workoutData.id)
        .order('position');
        
      if (exercisesError) {
        console.error("Error fetching exercises:", exercisesError);
      } else {
        const exercisesWithSets = (exercisesData as unknown as WorkoutExerciseWithSets[]) || [];
        exercisesWithSets.forEach(exercise => {
          if (exercise.workout_sets) {
            exercise.workout_sets.sort((a, b) => {
              const aIsDropset = a.is_dropset ?? false;
              const bIsDropset = b.is_dropset ?? false;
              const aKey = aIsDropset ? (a.parent_set_index ?? a.set_index) : a.set_index;
              const bKey = bIsDropset ? (b.parent_set_index ?? b.set_index) : b.set_index;
              if (aKey !== bKey) return aKey - bKey;
              if (aIsDropset !== bIsDropset) return aIsDropset ? 1 : -1;
              return a.set_index - b.set_index;
            });
          }
        });
        setExercises(exercisesWithSets);
        workoutCache.set(cacheKey, { 
          workout: workoutData as Workout, 
          exercises: exercisesWithSets,
          timestamp: now 
        });
      }
    } else {
      setWorkout(null);
      setExercises([]);
      workoutCache.set(cacheKey, { 
        workout: null, 
        exercises: [],
        timestamp: now 
      });
    }

    // Загружаем список шаблонов фоном
    const templatesCacheKey = user ? `templates-cache:${user.id}` : undefined;
    if (templatesCacheKey) {
      try {
        const cached = localStorage.getItem(templatesCacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as { ts: number; data: WorkoutTemplate[] };
          if (parsed.data) {
            setTemplates(parsed.data as WorkoutTemplate[]);
          }
        }
      } catch {}
    }

    db
      .from('workout_templates')
      .select('id, name, created_at, user_id, icon')
      .eq('user_id', user.id)
      .then(({ data, error }: { data: WorkoutTemplate[] | null; error: any }) => {
        if (error) {
          console.error('Error fetching templates:', error.message);
        } else {
          setTemplates((data as WorkoutTemplate[]) || []);
          if (templatesCacheKey) {
            try { localStorage.setItem(templatesCacheKey, JSON.stringify({ ts: Date.now(), data })); } catch {}
          }
        }
      });
    
    setLoading(false);
    setHasInitialData(true);
  }, [user, normalizedDate, hasInitialData, setWorkout, setExercises, setLoading, setHasInitialData, setTemplates]);

  // Загрузка данных при монтировании
  useEffect(() => {
    fetchWorkoutData();
  }, [fetchWorkoutData]);

  // Обработка видимости страницы
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchWorkoutData(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchWorkoutData]);

  // Сохраняем последний открытый workout
  useEffect(() => {
    if (!normalizedDate) return;
    localStorage.setItem('lastWorkoutPath', `/workout/${normalizedDate}`);
    localStorage.setItem('lastWorkoutTimestamp', Date.now().toString());
  }, [normalizedDate]);

  return {
    // Данные
    user,
    normalizedDate,
    location,
    workout,
    exercises,
    templates,
    loading,
    isCreating,
    isSelectTemplateOpen,
    hasInitialData,
    isAddingExercise,
    workoutName,
    isSavingWorkoutName,
    isCardio,
    isSavingCardio,
    workoutIcon,
    workoutNotes,
    isSavingNotes,
    // Сеттеры
    setPageState,
    setWorkout,
    setExercises,
    setTemplates,
    setLoading,
    setIsCreating,
    setIsSelectTemplateOpen,
    setHasInitialData,
    setIsAddingExercise,
    setWorkoutName,
    setIsSavingWorkoutName,
    setIsCardio,
    setIsSavingCardio,
    setWorkoutIcon,
    setWorkoutNotes,
    setIsSavingNotes,
    // Методы
    fetchWorkoutData,
  };
}
