import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePageState } from '../hooks/usePageState';
import type { Workout, WorkoutTemplate, WorkoutExerciseWithSets } from '../types/database.types';
import { ExerciseCard } from '../components/ExerciseCard';
import { formatDateForDisplay, formatDate } from '../utils/date-helpers';

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
    },
    ttl: 30 * 60 * 1000,
  });

  const { workout, exercises, templates, loading, isCreating, isSelectTemplateOpen, hasInitialData } = pageState;

  const setWorkout = (next: Workout | null) => setPageState(prev => ({ ...prev, workout: next }));
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

  const handleDeleteWorkout = async () => {
    if (!workout) return;

    const isConfirmed = window.confirm('Вы уверены, что хотите удалить эту тренировку? Это действие необратимо.');
    if (isConfirmed) {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workout.id);
      
      if (error) {
        console.error('Error deleting workout:', error);
        alert('Не удалось удалить тренировку.');
      } else {
        // Инвалидируем кеш
        if (user && normalizedDate) {
          const cacheKey = `${user.id}:${normalizedDate}`;
          workoutCache.delete(cacheKey);
        }
        alert('Тренировка удалена.');
        navigate('/calendar');
      }
    }
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
      onClick={() => navigate('/calendar')}
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
        <div className="mt-4 p-6 text-center border-2 border-dashed rounded-lg">
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
                    className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
                    className="flex items-center justify-center w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Создать шаблон
                </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative px-4 space-y-4 pt-safe">
      {/* Показываем индикатор только при начальной загрузке или явной перезагрузке */}
      {loading && !hasInitialData && (
        <div className="fixed top-4 left-1/2 z-40 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1 text-sm text-white shadow-lg">
          Загрузка данных...
        </div>
      )}
      
      <div className="glass card-dark p-4 flex items-center gap-4">
        <BackButton className="shrink-0" />
        <div className="flex-1 text-center">
          <h1 className="text-3xl font-bold capitalize">{workout.name}</h1>
          <p className="text-lg" style={{color:'#a1a1aa'}}>Дата: {formatDateForDisplay(normalizedDate)}</p>
        </div>
      </div>
      
      <div className="glass card-dark p-3 rounded-md flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleOpenChangeTemplate}
          className="px-4 py-2 rounded-md border border-white text-white hover:bg-white/10 transition-colors"
        >
          Изменить тренировку
        </button>
        <button
          type="button"
          onClick={handleDeleteWorkout}
          className="px-4 py-2 rounded-md border border-red-500 text-red-400 hover:bg-red-500/10 transition-colors"
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
          />
        ))}
      </div>

      {isSelectTemplateOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md card-dark rounded-lg shadow-lg p-4">
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
    </div>
  );
};

export default WorkoutPage;