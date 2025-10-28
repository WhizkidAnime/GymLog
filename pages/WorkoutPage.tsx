import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePageState } from '../hooks/usePageState';
import type { Workout, WorkoutTemplate, WorkoutExerciseWithSets } from '../types/database.types';
import { ExerciseCard } from '../components/ExerciseCard';
import { formatDateForDisplay, formatDate } from '../utils/date-helpers';
import ConfirmDialog from '../components/confirm-dialog';

// Улучшенный кеш с timestamp для отслеживания актуальности
const workoutCache = new Map<string, { 
  workout: Workout | null; 
  exercises: WorkoutExerciseWithSets[];
  timestamp: number;
}>();

// TTL кеша в миллисекундах (30 секунд)
const CACHE_TTL = 30000;

type WorkoutPageState = {
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
};

const normalizeDateParam = (value?: string): string | null => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return formatDate(parsed);
};

const WorkoutPage = () => {
  const { date } = useParams<{ date: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

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
    },
    ttl: 30 * 60 * 1000,
  });

  const { workout, exercises, templates, loading, isCreating, isSelectTemplateOpen, hasInitialData, isAddingExercise, workoutName, isSavingWorkoutName, isCardio, isSavingCardio } = pageState;

  const [isScrolling, setIsScrolling] = useState(false);

  const setWorkout = (next: Workout | null) => setPageState(prev => ({
    ...prev,
    workout: next,
    workoutName: next?.name ?? '',
    isSavingWorkoutName: false,
    isCardio: next?.is_cardio ?? false,
    isSavingCardio: false,
  }));
  const setExercises = (
    next: WorkoutExerciseWithSets[] | ((prev: WorkoutExerciseWithSets[]) => WorkoutExerciseWithSets[])
  ) => setPageState(prev => ({
    ...prev,
    exercises: typeof next === 'function' ? (next as (prev: WorkoutExerciseWithSets[]) => WorkoutExerciseWithSets[])(prev.exercises) : next,
  }));
  const setTemplates = (next: WorkoutTemplate[] | ((prev: WorkoutTemplate[]) => WorkoutTemplate[])) => setPageState(prev => ({
    ...prev,
    templates: typeof next === 'function' ? (next as (prev: WorkoutTemplate[]) => WorkoutTemplate[])(prev.templates) : next,
  }));
  const setLoading = (next: boolean) => setPageState(prev => ({ ...prev, loading: next }));
  const setIsCreating = (next: boolean) => setPageState(prev => ({ ...prev, isCreating: next }));
  const setIsSelectTemplateOpen = (next: boolean) => setPageState(prev => ({ ...prev, isSelectTemplateOpen: next }));
  const setHasInitialData = (next: boolean) => setPageState(prev => ({ ...prev, hasInitialData: next }));
  const setIsAddingExercise = (next: boolean) => setPageState(prev => ({ ...prev, isAddingExercise: next }));
  const setWorkoutName = (next: string) => setPageState(prev => ({ ...prev, workoutName: next }));
  const setIsSavingWorkoutName = (next: boolean) => setPageState(prev => ({ ...prev, isSavingWorkoutName: next }));
  const setIsCardio = (next: boolean) => setPageState(prev => ({ ...prev, isCardio: next }));
  const setIsSavingCardio = (next: boolean) => setPageState(prev => ({ ...prev, isSavingCardio: next }));

  const [isDeleteWorkoutOpen, setIsDeleteWorkoutOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(workoutName);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollKey = `scroll:workout:${normalizedDate ?? ''}`;
  const isRestoringScroll = useRef(false);
  const lastScrollPosition = useRef(0);

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
        // Данные актуальны, просто восстанавливаем без запроса
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
        // Продолжаем с silent=true для фонового обновления
        silent = true;
      }
    }

    // Показываем индикатор загрузки только если это не silent режим
    if (!silent) {
      setLoading(true);
    }

    const { data: workoutsData, error: workoutError } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .eq('workout_date', normalizedDate)
      .order('created_at', { ascending: false })
      .limit(1);

    const workoutData = workoutsData?.[0] ?? null;

    if (workoutError) {
      console.error('Error fetching workout:', workoutError);
    } else if (workoutData) {
      setWorkout(workoutData);
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select('id, name, sets, reps, rest_seconds, position, workout_id, workout_sets ( id, workout_exercise_id, set_index, weight, reps, is_done, updated_at )')
        .eq('workout_id', workoutData.id)
        .order('position');
        
      if (exercisesError) {
        console.error("Error fetching exercises:", exercisesError);
      } else {
        const exercisesWithSets = (exercisesData as unknown as WorkoutExerciseWithSets[]) || [];
        exercisesWithSets.forEach(exercise => {
          if (exercise.workout_sets) {
            exercise.workout_sets.sort((a, b) => a.set_index - b.set_index);
          }
        });
        setExercises(exercisesWithSets);
        // Кешируем в памяти с текущим timestamp
        workoutCache.set(cacheKey, { 
          workout: workoutData, 
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

    supabase
      .from('workout_templates')
      .select('id, name, created_at, user_id')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
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
  }, [user, normalizedDate, hasInitialData]);

  useEffect(() => {
    fetchWorkoutData();
  }, [fetchWorkoutData]);

  // Обработка видимости страницы: восстанавливаем из кеша при возврате на вкладку
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Страница стала видимой — проверяем кеш и обновляем в фоне если нужно
        // fromCache=true означает "используй кеш если он свежий"
        // silent режим активируется автоматически если кеш устарел
        fetchWorkoutData(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchWorkoutData]);

  // Сохраняем последний открытый workout и позицию скролла
  useEffect(() => {
    if (!normalizedDate) return;
    localStorage.setItem('lastWorkoutPath', `/workout/${normalizedDate}`);
  }, [normalizedDate]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (!normalizedDate || exercises.length === 0) return;

    const restoreScroll = () => {
      try {
        const saved = localStorage.getItem(scrollKey);
        if (saved) {
          const y = parseInt(saved, 10);
          if (!Number.isNaN(y)) {
            isRestoringScroll.current = true;

            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                window.scrollTo({ top: y, behavior: 'auto' });
                lastScrollPosition.current = y;
                setTimeout(() => {
                  isRestoringScroll.current = false;
                }, 100);
              });
            });
          }
        }
      } catch (e) {
        console.error('Error restoring scroll:', e);
      }
    };

    restoreScroll();
  }, [normalizedDate, exercises.length, scrollKey]);

  useEffect(() => {
    if (!normalizedDate) return;

    let ticking = false;

    const handleScroll = () => {
      lastScrollPosition.current = window.scrollY;
      setIsScrolling(window.scrollY > 0);

      if (!ticking && !isRestoringScroll.current) {
        window.requestAnimationFrame(() => {
          try {
            localStorage.setItem(scrollKey, String(lastScrollPosition.current));
          } catch (e) {
            // Ignore quota errors
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [normalizedDate, scrollKey]);

  useEffect(() => {
    return () => {
      if (normalizedDate && lastScrollPosition.current > 0) {
        try {
          localStorage.setItem(scrollKey, String(lastScrollPosition.current));
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [normalizedDate, scrollKey]);

  const handleUpdateExercise = (updatedExercise: WorkoutExerciseWithSets) => {
    setPageState(prev => {
      const updatedExercises = prev.exercises.map(ex => (ex.id === updatedExercise.id ? updatedExercise : ex));

      if (user && normalizedDate && prev.workout) {
        const cacheKey = `${user.id}:${normalizedDate}`;
        workoutCache.set(cacheKey, {
          workout: prev.workout,
          exercises: updatedExercises,
          timestamp: Date.now(),
        });
      }

      return { ...prev, exercises: updatedExercises };
    });
  };

  const handleAddExercise = async () => {
    if (!user || !normalizedDate || !workout || isAddingExercise) return;
    setIsAddingExercise(true);

    try {
      const nextPosition = exercises.length > 0
        ? Math.max(...exercises.map(ex => (typeof ex.position === 'number' ? ex.position : 0))) + 1
        : 1;

      const { data: insertedExercises, error: insertExerciseError } = await supabase
        .from('workout_exercises')
        .insert({
          workout_id: workout.id,
          name: '',
          sets: 1,
          reps: '',
          rest_seconds: 150,
          position: nextPosition,
        })
        .select('id, name, sets, reps, rest_seconds, position, workout_id');

      if (insertExerciseError) {
        throw insertExerciseError;
      }

      const insertedExercise = insertedExercises?.[0];
      if (!insertedExercise) {
        throw new Error('Не удалось создать упражнение');
      }

      const { data: insertedSets, error: insertSetError } = await supabase
        .from('workout_sets')
        .insert({
          workout_exercise_id: insertedExercise.id,
          set_index: 1,
          weight: null,
          reps: null,
          is_done: false,
          updated_at: new Date().toISOString(),
        })
        .select('id, workout_exercise_id, set_index, weight, reps, is_done, updated_at');

      if (insertSetError) {
        throw insertSetError;
      }

      const insertedSet = insertedSets?.[0];
      if (!insertedSet) {
        throw new Error('Не удалось создать подход');
      }

      const newExerciseWithSets: WorkoutExerciseWithSets = {
        ...insertedExercise,
        workout_sets: [insertedSet],
      };

      setPageState(prev => {
        if (!prev.workout) {
          return prev;
        }

        const updatedExercises = [...prev.exercises, newExerciseWithSets].sort((a, b) => a.position - b.position);

        if (user && normalizedDate) {
          const cacheKey = `${user.id}:${normalizedDate}`;
          const cached = workoutCache.get(cacheKey);
          if (cached) {
            workoutCache.set(cacheKey, {
              workout: cached.workout,
              exercises: updatedExercises,
              timestamp: Date.now(),
            });
          }
        }

        return { ...prev, exercises: updatedExercises };
      });
    } catch (error: any) {
      console.error('Failed to add exercise:', error);
      alert('Не удалось добавить упражнение. Попробуйте снова.');
    } finally {
      setIsAddingExercise(false);
    }
  };

  const handleCreateCustomWorkout = async () => {
    if (!user || !normalizedDate) return;
    setIsCreating(true);

    try {
      const { data: newWorkout, error } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          workout_date: normalizedDate,
          name: 'Новая тренировка',
          template_id: null,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!newWorkout) {
        throw new Error('Не удалось создать тренировку');
      }

      setWorkout(newWorkout as Workout);
      setExercises([]);
      setWorkoutName((newWorkout as Workout).name);

      const cacheKey = `${user.id}:${normalizedDate}`;
      workoutCache.set(cacheKey, {
        workout: newWorkout as Workout,
        exercises: [],
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error('Failed to create custom workout:', error);
      alert('Не удалось создать тренировку. Попробуйте снова.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateWorkout = async (template: WorkoutTemplate) => {
    if (!user || !normalizedDate) return;
    setIsCreating(true);

    try {
      const { data: templateExercises } = await supabase
        .from('template_exercises')
        .select('*')
        .eq('template_id', template.id);

      const { data: newWorkout } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          workout_date: normalizedDate,
          name: template.name,
          template_id: template.id,
        })
        .select()
        .single();
      
      if (!newWorkout) throw new Error("Failed to create workout entry.");

      const newWorkoutExercises = (templateExercises || []).map(ex => ({
        workout_id: newWorkout.id,
        name: ex.name, sets: ex.sets, reps: ex.reps, rest_seconds: ex.rest_seconds, position: ex.position,
      }));

      const { data: insertedExercises } = await supabase
        .from('workout_exercises')
        .insert(newWorkoutExercises)
        .select();

      if (!insertedExercises) throw new Error("Failed to create workout exercises.");

      const newSets = insertedExercises.flatMap(ex => 
        Array.from({ length: ex.sets }, (_, i) => ({
          workout_exercise_id: ex.id, set_index: i + 1,
        }))
      );
      
      await supabase.from('workout_sets').insert(newSets);
      
      // Инвалидируем кеш, чтобы загрузить свежие данные
      const cacheKey = `${user.id}:${normalizedDate}`;
      workoutCache.delete(cacheKey);
      
      await fetchWorkoutData();

    } catch (error: any) {
      console.error('Failed to create workout from template:', error);
      alert(`Не удалось создать тренировку: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveWorkoutName = async () => {
    if (!user || !normalizedDate || !workout) return;
    const trimmedName = workoutName.trim();

    if (trimmedName.length === 0) {
      setWorkoutName(workout.name);
      return;
    }

    if (trimmedName === workout.name) {
      return;
    }

    setIsSavingWorkoutName(true);

    try {
      const { data: updatedWorkout, error } = await supabase
        .from('workouts')
        .update({ name: trimmedName })
        .eq('id', workout.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!updatedWorkout) {
        throw new Error('Не удалось обновить название тренировки');
      }

      setWorkout(updatedWorkout as Workout);

      const cacheKey = `${user.id}:${normalizedDate}`;
      workoutCache.set(cacheKey, {
        workout: updatedWorkout as Workout,
        exercises,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error('Failed to update workout name:', error);
      alert('Не удалось сохранить название. Попробуйте снова.');
      setWorkoutName(workout.name);
    } finally {
      setIsSavingWorkoutName(false);
    }
  };

  const handleWorkoutNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
  };

  const handleStartEditName = () => {
    setEditNameValue(workoutName);
    setIsEditingName(true);
  };

  const handleSaveEditName = async () => {
    if (!user || !normalizedDate || !workout) return;
    const trimmedName = editNameValue.trim();

    if (trimmedName.length === 0) {
      setEditNameValue(workoutName);
      setIsEditingName(false);
      return;
    }

    if (trimmedName === workout.name) {
      setIsEditingName(false);
      return;
    }

    setIsSavingWorkoutName(true);

    try {
      const { data: updatedWorkout, error } = await supabase
        .from('workouts')
        .update({ name: trimmedName })
        .eq('id', workout.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!updatedWorkout) {
        throw new Error('Не удалось обновить название тренировки');
      }

      setWorkout(updatedWorkout as Workout);
      setEditNameValue(trimmedName);
      setIsEditingName(false);

      const cacheKey = `${user.id}:${normalizedDate}`;
      workoutCache.set(cacheKey, {
        workout: updatedWorkout as Workout,
        exercises,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error('Failed to update workout name:', error);
      alert('Не удалось сохранить название. Попробуйте снова.');
    } finally {
      setIsSavingWorkoutName(false);
    }
  };

  const handleCancelEditName = () => {
    setEditNameValue(workoutName);
    setIsEditingName(false);
  };

  const handleToggleCardio = async () => {
    if (!user || !normalizedDate || !workout) return;
    const newCardioState = !isCardio;
    setIsCardio(newCardioState);
    setIsSavingCardio(true);

    try {
      const { data: updatedWorkout, error } = await supabase
        .from('workouts')
        .update({ is_cardio: newCardioState })
        .eq('id', workout.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!updatedWorkout) {
        throw new Error('Не удалось обновить статус кардио');
      }

      setWorkout(updatedWorkout as Workout);

      const cacheKey = `${user.id}:${normalizedDate}`;
      workoutCache.set(cacheKey, {
        workout: updatedWorkout as Workout,
        exercises,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error('Failed to update cardio status:', error);
      alert('Не удалось сохранить статус кардио.');
      setIsCardio(!newCardioState);
    } finally {
      setIsSavingCardio(false);
    }
  };
  
  const handleDeleteWorkout = () => {
    if (!workout) return;
    setIsDeleteWorkoutOpen(true);
  };

  const confirmDeleteWorkout = async () => {
    if (!workout) return;
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', workout.id);

    if (error) {
      console.error('Error deleting workout:', error);
      alert('Не удалось удалить тренировку.');
      return;
    }

    if (user && normalizedDate) {
      const cacheKey = `${user.id}:${normalizedDate}`;
      workoutCache.delete(cacheKey);
    }
    // Передаем дату удаленной тренировки, чтобы календарь обновил индикатор сразу
    navigate('/calendar', { state: { removedDate: normalizedDate } });
  };

  const handleOpenChangeTemplate = () => {
    setIsSelectTemplateOpen(true);
  };

  const handleReplaceWithTemplate = async (template: WorkoutTemplate) => {
    if (!user || !normalizedDate || !workout) return;
    try {
      setIsCreating(true);

      const { data: templateExercises, error: tErr } = await supabase
        .from('template_exercises')
        .select('*')
        .eq('template_id', template.id);
      if (tErr) throw tErr;

      const { data: existingExercises, error: exErr } = await supabase
        .from('workout_exercises')
        .select('id')
        .eq('workout_id', workout.id);
      if (exErr) throw exErr;

      const existingExerciseIds = (existingExercises || []).map(e => e.id);

      if (existingExerciseIds.length > 0) {
        const { error: setsDelErr } = await supabase
          .from('workout_sets')
          .delete()
          .in('workout_exercise_id', existingExerciseIds);
        if (setsDelErr) throw setsDelErr;

        const { error: exDelErr } = await supabase
          .from('workout_exercises')
          .delete()
          .eq('workout_id', workout.id);
        if (exDelErr) throw exDelErr;
      }

      const { error: updErr } = await supabase
        .from('workouts')
        .update({ name: template.name, template_id: template.id })
        .eq('id', workout.id);
      if (updErr) throw updErr;

      const newWorkoutExercises = (templateExercises || []).map(ex => ({
        workout_id: workout.id,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        position: ex.position,
      }));

      const { data: insertedExercises, error: insErr } = await supabase
        .from('workout_exercises')
        .insert(newWorkoutExercises)
        .select();
      if (insErr) throw insErr;

      const newSets = (insertedExercises || []).flatMap(ex =>
        Array.from({ length: ex.sets }, (_, i) => ({
          workout_exercise_id: ex.id,
          set_index: i + 1,
        }))
      );
      if (newSets.length > 0) {
        const { error: setsInsErr } = await supabase.from('workout_sets').insert(newSets);
        if (setsInsErr) throw setsInsErr;
      }

      // Инвалидируем кеш
      const cacheKey = `${user.id}:${normalizedDate}`;
      workoutCache.delete(cacheKey);

      setIsSelectTemplateOpen(false);
      await fetchWorkoutData();
    } catch (error: any) {
      console.error('Failed to replace workout from template:', error);
      alert(`Не удалось изменить тренировку: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };
  
  const BackButton = ({ className = '' }: { className?: string }) => (
    <button
      onClick={() => navigate('/calendar', { state: { refreshDate: normalizedDate } })}
      className={`inline-flex items-center justify-center p-2 rounded-full border border-transparent text-white transition-colors z-10 bg-transparent hover:border-white active:border-white focus:outline-none ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );

  if (!hasInitialData) {
    return <div className="p-4 text-center">Загрузка...</div>;
  }
  
  if (!normalizedDate) {
    return null;
  }

  if (!workout) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-safe">
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
          <h1 className="flex-1 text-xl font-bold text-center">Тренировка на {formatDateForDisplay(normalizedDate)}</h1>
        </div>
        <div className="mt-4 p-6 text-center">
          <p className="text-gray-500 mb-4">Тренировка не запланирована.</p>
          {templates.length > 0 ? (
            <>
              <h2 className="text-lg font-semibold mb-3">Выбрать шаблон</h2>
              <div className="space-y-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleCreateWorkout(t)}
                    disabled={isCreating}
                    className="btn-glass btn-glass-primary btn-glass-full btn-glass-md disabled:opacity-50"
                  >
                    {isCreating ? 'Создание...' : t.name}
                  </button>
                ))}
              </div>
            </>
          ) : (
             <div className="flex flex-col items-center space-y-3">
                <p className="text-gray-400">Сначала создайте шаблон.</p>
                <Link 
                    to="/templates/new"
                    className="btn-glass btn-glass-primary btn-glass-full btn-glass-md"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Создать шаблон
                </Link>
            </div>
          )}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleCreateCustomWorkout}
              disabled={isCreating}
              className="btn-dashed"
            >
              {isCreating ? 'Создание...' : 'Создать свой день'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative px-4 space-y-4 pt-safe pb-10">
      {/* Показываем индикатор только при начальной загрузке или явной перезагрузке */}
      {loading && !hasInitialData && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'transparent' }}>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-white text-center">Загрузка данных...</p>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .header-container {
          transition: all 0.3s ease-out;
          position: sticky;
          top: 1rem;
          z-index: 30;
        }
        .header-container.scrolling {
          padding: 0.5rem 1rem;
        }
        .header-container.scrolling input {
          font-size: 1.25rem;
          pointer-events: none;
          cursor: default;
        }
        .header-container.scrolling p {
          font-size: 0.875rem;
        }
      `}</style>
      <div className={`glass card-dark p-4 flex items-center gap-4 header-container ${isScrolling ? 'scrolling' : ''}`}>
        <BackButton className="shrink-0" />
        <div className="flex-1 text-center">
          {!isEditingName ? (
            <div className="flex items-center justify-center gap-2">
              <div>
                <h1 className="text-2xl font-bold text-white">{workoutName}</h1>
                <p className="text-lg transition-all duration-300" style={{color:'#a1a1aa'}}>Дата: {formatDateForDisplay(normalizedDate)}</p>
              </div>
              <button
                onClick={handleStartEditName}
                className="shrink-0 p-1.5 rounded-full hover:bg-white/10 transition-colors"
                title="Редактировать название"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-full">
              <input
                ref={inputRef}
                type="text"
                value={editNameValue}
                onChange={event => setEditNameValue(event.target.value)}
                disabled={isSavingWorkoutName}
                className="w-full bg-white/10 text-lg font-bold text-white placeholder:text-gray-500 focus:outline-none focus:bg-white/20 rounded-md px-3 py-2 transition-colors disabled:opacity-70"
                placeholder="Название тренировки"
              />
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleSaveEditName}
                  disabled={isSavingWorkoutName}
                  className="shrink-0 p-1.5 rounded-full hover:bg-green-500/20 transition-colors disabled:opacity-50"
                  title="Сохранить"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={handleCancelEditName}
                  disabled={isSavingWorkoutName}
                  className="shrink-0 p-1.5 rounded-full hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  title="Отмена"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="glass card-dark p-3 rounded-md flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleOpenChangeTemplate}
          className="glass-button-create"
        >
          Изменить тренировку
        </button>
        <button
          type="button"
          onClick={handleDeleteWorkout}
          className="glass-button-danger"
        >
          Удалить
        </button>
      </div>

      <div className="space-y-4">
        {exercises.map(exercise => (
          <ExerciseCard 
            key={exercise.id} 
            exercise={exercise}
            onUpdateExercise={handleUpdateExercise}
            onDeleteExercise={(exerciseId) => {
              setPageState(prev => {
                const filtered = prev.exercises.filter(ex => ex.id !== exerciseId);
                if (user && normalizedDate && prev.workout) {
                  const cacheKey = `${user.id}:${normalizedDate}`;
                  workoutCache.set(cacheKey, {
                    workout: prev.workout,
                    exercises: filtered,
                    timestamp: Date.now(),
                  });
                }
                return { ...prev, exercises: filtered };
              });
            }}
          />
        ))}
      </div>

      <div className="glass card-dark p-4 rounded-md">
        <p className="text-white text-lg font-bold mb-3 text-center">Было кардио?</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isCardio) {
                setIsCardio(false);
                handleToggleCardio();
              }
            }}
            disabled={isSavingCardio}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ease-out ${
              !isCardio
                ? 'bg-white/20 text-white shadow-lg scale-100'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 scale-95'
            } disabled:opacity-50`}
          >
            Нет
          </button>
          <button
            onClick={() => {
              if (!isCardio) {
                setIsCardio(true);
                handleToggleCardio();
              }
            }}
            disabled={isSavingCardio}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ease-out ${
              isCardio
                ? 'bg-white/20 text-white shadow-lg scale-100'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 scale-95'
            } disabled:opacity-50`}
          >
            Да
          </button>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={handleAddExercise}
          disabled={isAddingExercise}
          className="btn-glass btn-glass-full btn-glass-md btn-glass-primary disabled:opacity-50"
        >
          {isAddingExercise ? 'Добавление...' : 'Добавить упражнение'}
        </button>
      </div>

      {isSelectTemplateOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md glass card-dark rounded-xl shadow-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Выберите шаблон</h2>
              <button onClick={() => setIsSelectTemplateOpen(false)} className="px-2 py-1 text-sm text-gray-300 hover:text-white">✕</button>
            </div>
            {templates.length === 0 ? (
              <p className="text-gray-400">Нет доступных шаблонов.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleReplaceWithTemplate(t)}
                    disabled={isCreating}
                    className="w-full text-left px-4 py-2 rounded-md border border-white/20 text-gray-100 hover:bg-white/5 disabled:opacity-50"
                  >
                    {isCreating ? 'Применение...' : t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={isDeleteWorkoutOpen}
        onOpenChange={setIsDeleteWorkoutOpen}
        title="Удалить тренировку?"
        description={`Вы собираетесь удалить тренировку на ${formatDateForDisplay(normalizedDate!)}. Действие необратимо.`}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        onConfirm={confirmDeleteWorkout}
      />
    </div>
  );
};

export default WorkoutPage;
