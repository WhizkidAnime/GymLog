import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePageState } from '../hooks/usePageState';
import { useDebounce } from '../hooks/useDebounce';
import type {
  Workout,
  WorkoutTemplate,
  WorkoutExerciseWithSets,
  WorkoutExercisePositionUpdate,
} from '../types/database.types';
import { ExerciseCard } from '../components/ExerciseCard';
import { BackButton } from '../components/back-button';
import { WorkoutHeader } from '../components/workout-header';
import { WorkoutTemplateSelectModal } from '../components/workout-template-select-modal';
import { WorkoutLoadingOverlay } from '../components/workout-loading-overlay';
import { useWorkoutScrollAndFocus } from '../hooks/use-workout-scroll-and-focus';
import { useModalScrollLock } from '../hooks/use-modal-scroll-lock';
import { useWorkoutActionsMenu } from '../hooks/use-workout-actions-menu';
import { formatDateForDisplay, formatDate } from '../utils/date-helpers';
import ConfirmDialog from '../components/confirm-dialog';
import ReorderExercisesModal, { ReorderItem } from '../components/ReorderExercisesModal';
import WorkoutIconPickerModal from '../components/workout-icon-picker-modal';
import type { WorkoutIconType } from '../components/workout-icons';

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

const WorkoutPage = () => {
  const { date } = useParams<{ date: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const {
    isActionsOpen,
    menuPos,
    actionsRef,
    actionsBtnRef,
    toggleActions,
    closeActions,
  } = useWorkoutActionsMenu();

  const setWorkout = (next: Workout | null) => setPageState(prev => ({
    ...prev,
    workout: next,
    workoutName: next?.name ?? '',
    isSavingWorkoutName: false,
    isCardio: next?.is_cardio ?? false,
    isSavingCardio: false,
    workoutIcon: (next?.icon as WorkoutIconType | null) ?? null,
    workoutNotes: next?.notes ?? '',
    isSavingNotes: false,
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
  const setWorkoutIcon = (next: WorkoutIconType | null) => setPageState(prev => ({ ...prev, workoutIcon: next }));
  const setWorkoutNotes = (next: string) => setPageState(prev => ({ ...prev, workoutNotes: next }));
  const setIsSavingNotes = (next: boolean) => setPageState(prev => ({ ...prev, isSavingNotes: next }));

  const [isDeleteWorkoutOpen, setIsDeleteWorkoutOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(workoutName);
  const [editIconValue, setEditIconValue] = useState<WorkoutIconType | null>(workoutIcon);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isReorderOpen, setIsReorderOpen] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  const scrollKey = `scroll:workout:${normalizedDate ?? ''}`;
  const { isScrolling } = useWorkoutScrollAndFocus({
    normalizedDate,
    exercisesLength: exercises.length,
    scrollKey,
    location,
  });

  useModalScrollLock(isSelectTemplateOpen);

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
      // Если тренировка создана по шаблону и иконка в workouts ещё не сохранена,
      // подтягиваем её из шаблона один раз и сохраняем обратно
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
            // Сортировка: сначала по родительскому индексу (для дропсетов) или set_index (для обычных),
            // затем дропсеты идут после обычных подходов с тем же индексом,
            // затем по set_index для определения порядка дропсетов
            exercise.workout_sets.sort((a, b) => {
              const aIsDropset = a.is_dropset ?? false;
              const bIsDropset = b.is_dropset ?? false;
              const aKey = aIsDropset ? (a.parent_set_index ?? a.set_index) : a.set_index;
              const bKey = bIsDropset ? (b.parent_set_index ?? b.set_index) : b.set_index;
              if (aKey !== bKey) return aKey - bKey;
              // Обычный подход первее дропсета
              if (aIsDropset !== bIsDropset) return aIsDropset ? 1 : -1;
              // Среди дропсетов одного родителя — по set_index
              return a.set_index - b.set_index;
            });
          }
        });
        setExercises(exercisesWithSets);
        // Кешируем в памяти с текущим timestamp
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
    localStorage.setItem('lastWorkoutTimestamp', Date.now().toString());
  }, [normalizedDate]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleUpdateExercise = useCallback((updatedExercise: WorkoutExerciseWithSets) => {
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
  }, [user, normalizedDate]);

  const handleDeleteExercise = useCallback((exerciseId: number) => {
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
  }, [user, normalizedDate]);

  const handleAddExercise = async () => {
    if (!user || !normalizedDate || !workout || isAddingExercise) return;
    setIsAddingExercise(true);

    try {
      const nextPosition = exercises.length > 0
        ? Math.max(...exercises.map(ex => (typeof ex.position === 'number' ? ex.position : 0))) + 1
        : 1;

      const { data: insertedExercises, error: insertExerciseError } = await db
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

      const { data: insertedSets, error: insertSetError } = await db
        .from('workout_sets')
        .insert({
          workout_exercise_id: insertedExercise.id,
          set_index: 1,
          weight: null,
          reps: null,
          is_done: false,
          is_dropset: false,
          updated_at: new Date().toISOString(),
        })
        .select('id, workout_exercise_id, set_index, weight, reps, is_done, is_dropset, updated_at');

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
      const { data: newWorkout, error } = await db
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
      const [
        { data: templateExercises },
        { data: templateRow },
      ] = await Promise.all([
        db
          .from('template_exercises')
          .select('*')
          .eq('template_id', template.id),
        db
          .from('workout_templates')
          .select('id, name, icon')
          .eq('id', template.id)
          .single(),
      ]);

      const templateIcon = (templateRow as any)?.icon ?? (template as any).icon ?? null;
      const templateName = (templateRow as any)?.name ?? template.name;

      const { data: newWorkout } = await db
        .from('workouts')
        .insert({
          user_id: user.id,
          workout_date: normalizedDate,
          name: templateName,
          template_id: template.id,
          icon: templateIcon,
        })
        .select()
        .single();
      
      if (!newWorkout) throw new Error("Failed to create workout entry.");

      const newWorkoutExercises = (templateExercises || []).map(ex => ({
        workout_id: newWorkout.id,
        name: ex.name, sets: ex.sets, reps: ex.reps, rest_seconds: ex.rest_seconds, position: ex.position,
      }));

      const { data: insertedExercises } = await db
        .from('workout_exercises')
        .insert(newWorkoutExercises)
        .select();

      if (!insertedExercises) throw new Error("Failed to create workout exercises.");

      const newSets = insertedExercises.flatMap(ex => 
        Array.from({ length: ex.sets }, (_, i) => ({
          workout_exercise_id: ex.id, set_index: i + 1,
        }))
      );
      
      await db.from('workout_sets').insert(newSets);
      
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
      const { data: updatedWorkout, error } = await db
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
    setEditIconValue(workoutIcon);
    setIsEditingName(true);
  };

  const handleSaveEditName = async () => {
    if (!user || !normalizedDate || !workout) return;
    const trimmedName = editNameValue.trim();

    if (trimmedName.length === 0) {
      setEditNameValue(workoutName);
      setEditIconValue(workoutIcon);
      setIsEditingName(false);
      return;
    }

    const nameChanged = trimmedName !== workout.name;
    const iconChanged = editIconValue !== (workout.icon as WorkoutIconType | null);

    if (!nameChanged && !iconChanged) {
      setIsEditingName(false);
      return;
    }

    setIsSavingWorkoutName(true);

    try {
      const updateData: { name?: string; icon?: string | null } = {};
      if (nameChanged) updateData.name = trimmedName;
      if (iconChanged) updateData.icon = editIconValue;

      const { data: updatedWorkout, error } = await db
        .from('workouts')
        .update(updateData)
        .eq('id', workout.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!updatedWorkout) {
        throw new Error('Не удалось обновить тренировку');
      }

      setWorkout(updatedWorkout as Workout);
      setEditNameValue(trimmedName);
      setEditIconValue((updatedWorkout as Workout).icon as WorkoutIconType | null);
      setIsEditingName(false);

      const cacheKey = `${user.id}:${normalizedDate}`;
      workoutCache.set(cacheKey, {
        workout: updatedWorkout as Workout,
        exercises,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error('Failed to update workout:', error);
      alert('Не удалось сохранить изменения. Попробуйте снова.');
    } finally {
      setIsSavingWorkoutName(false);
    }
  };

  const handleCancelEditName = () => {
    setEditNameValue(workoutName);
    setEditIconValue(workoutIcon);
    setIsEditingName(false);
  };

  const handleOpenIconPicker = () => {
    setIsIconPickerOpen(true);
  };

  const handleIconChange = (icon: WorkoutIconType | null) => {
    setEditIconValue(icon);
  };

  const handleToggleCardio = async () => {
    if (!user || !normalizedDate || !workout) return;
    const newCardioState = !isCardio;
    setIsCardio(newCardioState);
    setIsSavingCardio(true);

    try {
      const { data: updatedWorkout, error } = await db
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

  const debouncedNotes = useDebounce(workoutNotes, 800);
  const notesRef = useRef(workoutNotes);

  useEffect(() => {
    notesRef.current = workoutNotes;
  }, [workoutNotes]);

  useEffect(() => {
    if (!user || !normalizedDate || !workout) return;
    if (debouncedNotes === (workout.notes ?? '')) return;

    const saveNotes = async () => {
      setIsSavingNotes(true);
      try {
        const { error } = await db
          .from('workouts')
          .update({ notes: debouncedNotes || null })
          .eq('id', workout.id);

        if (error) throw error;

        const cacheKey = `${user.id}:${normalizedDate}`;
        const cached = workoutCache.get(cacheKey);
        if (cached && cached.workout) {
          workoutCache.set(cacheKey, {
            ...cached,
            workout: { ...cached.workout, notes: debouncedNotes || null },
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error('Failed to save notes:', error);
      } finally {
        setIsSavingNotes(false);
      }
    };

    saveNotes();
  }, [debouncedNotes, user, normalizedDate, workout?.id]);
  
  const handleDeleteWorkout = () => {
    if (!workout) return;
    setIsDeleteWorkoutOpen(true);
  };

  const handleSaveNewOrder = async (ordered: ReorderItem[]) => {
    if (!user || !workout) return;

    const posById = new Map<string, number>(ordered.map((it, idx) => [it.id, idx + 1]));
    setExercises(prev => {
      const next = prev.map(ex => ({ ...ex, position: posById.get(ex.id) ?? ex.position }));
      next.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      return next;
    });

    const payload: WorkoutExercisePositionUpdate[] = ordered.map((it, idx) => ({
      id: it.id,
      position: idx + 1,
    }));

    try {
      await Promise.all(
        payload.map(async p => {
          const { error } = await db
            .from('workout_exercises')
            .update({ position: p.position })
            .eq('id', p.id);

          if (error) {
            throw error;
          }
        })
      );

      if (user && normalizedDate) {
        const cacheKey = `${user.id}:${normalizedDate}`;
        const cached = workoutCache.get(cacheKey);
        if (cached) {
          const reordered = [...cached.exercises]
            .map(e => ({ ...e, position: posById.get(e.id) ?? e.position }))
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          workoutCache.set(cacheKey, {
            workout: cached.workout,
            exercises: reordered,
            timestamp: Date.now(),
          });
        }
      }
    } catch (e) {
      console.error('Failed to save new order:', e);
      alert('Не удалось сохранить порядок. Я вернул предыдущие данные.');
      await fetchWorkoutData();
    }
  };

  const confirmDeleteWorkout = async () => {
    if (!workout) return;
    const { error } = await db
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

      const [
        { data: templateExercises, error: tErr },
        { data: templateRow, error: templateErr },
      ] = await Promise.all([
        db
          .from('template_exercises')
          .select('*')
          .eq('template_id', template.id),
        db
          .from('workout_templates')
          .select('id, name, icon')
          .eq('id', template.id)
          .single(),
      ]);
      if (tErr) throw tErr;
      if (templateErr) throw templateErr;

      const { data: existingExercises, error: exErr } = await db
        .from('workout_exercises')
        .select('id')
        .eq('workout_id', workout.id);
      if (exErr) throw exErr;

      const existingExerciseIds = (existingExercises || []).map(e => e.id);

      if (existingExerciseIds.length > 0) {
        const { error: setsDelErr } = await db
          .from('workout_sets')
          .delete()
          .in('workout_exercise_id', existingExerciseIds);
        if (setsDelErr) throw setsDelErr;

        const { error: exDelErr } = await db
          .from('workout_exercises')
          .delete()
          .eq('workout_id', workout.id);
        if (exDelErr) throw exDelErr;
      }

      // Копируем иконку из шаблона в воркаут
      const templateIcon = (templateRow as any)?.icon ?? (template as any).icon ?? null;
      const templateName = (templateRow as any)?.name ?? template.name;
      const { error: updErr } = await db
        .from('workouts')
        .update({ name: templateName, template_id: template.id, icon: templateIcon })
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

      const { data: insertedExercises, error: insErr } = await db
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
        const { error: setsInsErr } = await db.from('workout_sets').insert(newSets);
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
  
  if (!hasInitialData) {
    return <WorkoutLoadingOverlay message="Загрузка..." />;
  }
  
  if (!normalizedDate) {
    return null;
  }

  if (!workout) {
    if (isCreating) {
      return (
        <div className="px-4 pt-4">
          <WorkoutLoadingOverlay message="Создание..." />
        </div>
      );
    }
    return (
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <BackButton normalizedDate={normalizedDate} />
          <h1 className="flex-1 text-xl font-bold text-center">Тренировка на {formatDateForDisplay(normalizedDate)}</h1>
        </div>
        <div className="mt-4 p-6 text-center">
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
                    {t.name}
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
              {'Создать свой день'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative px-4 space-y-4 pt-4 pb-10">
      {/* Основной контент страницы тренировки */}
      {/* CSS стили вынесены в styles/header-scroll.css */}
      <div className={`status-bar-blur ${isScrolling ? 'visible' : ''}`} />
      <WorkoutHeader
        normalizedDate={normalizedDate}
        workoutName={workoutName}
        isEditingName={isEditingName}
        editNameValue={editNameValue}
        isSavingWorkoutName={isSavingWorkoutName}
        isScrolling={isScrolling}
        inputRef={inputRef}
        onStartEditName={handleStartEditName}
        onChangeEditName={setEditNameValue}
        onSaveEditName={handleSaveEditName}
        onCancelEditName={handleCancelEditName}
        actionsRef={actionsRef}
        actionsBtnRef={actionsBtnRef}
        onToggleActions={toggleActions}
        workoutIcon={workoutIcon}
        editIconValue={editIconValue}
        onOpenIconPicker={handleOpenIconPicker}
      />

      <div className="space-y-4">
        {exercises.map(exercise => (
          <ExerciseCard 
            key={exercise.id} 
            exercise={exercise}
            workoutDate={normalizedDate}
            onUpdateExercise={handleUpdateExercise}
            onDeleteExercise={handleDeleteExercise}
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
                ? 'bg-red-500/80 text-white shadow-lg scale-100'
                : 'bg-red-500/20 text-red-300 hover:bg-red-500/30 scale-95'
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
                ? 'bg-green-500/80 text-white shadow-lg scale-100'
                : 'bg-green-500/20 text-green-300 hover:bg-green-500/30 scale-95'
            } disabled:opacity-50`}
          >
            Да
          </button>
        </div>
      </div>

      <div className="glass card-dark p-4 rounded-md">
        <div className="flex items-center justify-between mb-2">
          <p className="text-white text-lg font-bold">Заметки</p>
          {isSavingNotes && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
              Сохранение...
            </span>
          )}
        </div>
        <textarea
          value={workoutNotes}
          onChange={(e) => setWorkoutNotes(e.target.value)}
          placeholder="Как себя чувствовали, что получилось, над чем надо поработать"
          rows={5}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-400 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 transition-colors"
        />
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

      <WorkoutTemplateSelectModal
        open={isSelectTemplateOpen}
        templates={templates}
        isCreating={isCreating}
        onClose={() => setIsSelectTemplateOpen(false)}
        onReplaceWithTemplate={handleReplaceWithTemplate}
      />

      <ReorderExercisesModal
        open={isReorderOpen}
        onClose={() => setIsReorderOpen(false)}
        items={exercises.map(exercise => ({
          id: exercise.id,
          name: exercise.name,
          position: exercise.position ?? 0,
        }))}
        onSave={handleSaveNewOrder}
      />

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

      <WorkoutIconPickerModal
        open={isIconPickerOpen}
        value={editIconValue}
        onClose={() => setIsIconPickerOpen(false)}
        onChange={handleIconChange}
      />

      {isActionsOpen && menuPos && createPortal(
        <div
          className="fixed menu-popover"
          style={{ top: menuPos.top, left: menuPos.left, width: 192 }}
          role="menu"
        >
          <button
            onClick={() => {
              closeActions();
              setIsReorderOpen(true);
            }}
            className="w-full text-left px-4 py-2 hover:bg-white/10 text-gray-100 transition-colors rounded-lg"
          >
            Поменять порядок упражнений
          </button>
          <button
            onClick={() => {
              closeActions();
              handleOpenChangeTemplate();
            }}
            className="w-full text-left px-4 py-2 hover:bg-white/10 text-gray-100 transition-colors rounded-lg"
          >
            Изменить тренировку
          </button>
          <button
            onClick={() => {
              closeActions();
              handleDeleteWorkout();
            }}
            className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 transition-colors rounded-lg"
          >
            Удалить
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default WorkoutPage;
