import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { WorkoutExerciseWithSets } from '../types/database.types';
import { supabase } from '../lib/supabase';
import { SetRow } from './SetRow';
import { WarmupSetRow } from './WarmupSetRow';
import { RestTimer } from './RestTimer';
import { useDebounce } from '../hooks/useDebounce';
import ConfirmDialog from './confirm-dialog';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../hooks/use-i18n';
import { formatDateForDisplay } from '../utils/date-helpers';
import { processProgressData } from '../utils/progress-helpers';
import { normalizeExerciseName } from '../utils/exercise-name';

interface ExerciseCardProps {
  exercise: WorkoutExerciseWithSets;
  workoutDate?: string | null;
  onUpdateExercise: (updatedExercise: WorkoutExerciseWithSets) => void;
  onDeleteExercise?: (exerciseId: number) => void;
}

type LastPerformance = {
  weight: number | null;
  reps: string | null;
  workoutDate: string | null;
};

const LAST_PERFORMANCE_TTL = 2 * 60 * 60 * 1000; // 2 часа

type LastPerformanceCacheEntry = {
  data: LastPerformance | null;
  timestamp: number;
};

const lastPerformanceCache = new Map<string, LastPerformanceCacheEntry>();

const getLastPerformanceCacheKey = (
  userId: string,
  normalizedName: string,
  workoutDate?: string | null
) => `${userId}:${normalizedName}:${workoutDate || 'none'}`;

const getCachedLastPerformance = (key: string): LastPerformance | null | undefined => {
  const entry = lastPerformanceCache.get(key);
  if (!entry) return undefined;
  const age = Date.now() - entry.timestamp;
  if (age > LAST_PERFORMANCE_TTL) {
    lastPerformanceCache.delete(key);
    return undefined;
  }
  return entry.data;
};

const setCachedLastPerformance = (key: string, data: LastPerformance | null) => {
  lastPerformanceCache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

const ExerciseCardComponent: React.FC<ExerciseCardProps> = ({ exercise, workoutDate, onUpdateExercise, onDeleteExercise }) => {
  const { t } = useI18n();
  const [nameInput, setNameInput] = useState(exercise.name);
  const [setsCount, setSetsCount] = useState<number>(exercise.sets);
  const [warmupSetsCount, setWarmupSetsCount] = useState<number>(() => {
    return exercise.workout_sets.filter(s => s.is_warmup).length;
  });
  const [restSeconds, setRestSeconds] = useState<number>(exercise.rest_seconds);
  const [busy, setBusy] = useState(false);
  const [lastPerformance, setLastPerformance] = useState<LastPerformance | null>(null);
  const [lastPerformanceStatus, setLastPerformanceStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const nameInputRef = useRef<HTMLTextAreaElement | null>(null);
  const { user } = useAuth();
  const debouncedName = useDebounce(nameInput, 500);
  const debouncedRestSeconds = useDebounce(restSeconds, 500);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const prevExerciseNameRef = useRef(exercise.name);

  // Ref для актуального exercise, чтобы избежать stale closure в callbacks
  const exerciseRef = useRef(exercise);
  useEffect(() => {
    exerciseRef.current = exercise;
  }, [exercise]);

  const adjustNameInputHeight = useCallback(() => {
    const element = nameInputRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, []);

  useEffect(() => {
    // Обновляем состояние только если имя упражнения изменилось из-за внешних причин (не из-за нашего ввода)
    if (exercise.name !== prevExerciseNameRef.current) {
      setNameInput(exercise.name);
      prevExerciseNameRef.current = exercise.name;
    }
    setSetsCount(exercise.sets);
    setRestSeconds(exercise.rest_seconds);
    setWarmupSetsCount(exercise.workout_sets.filter(s => s.is_warmup).length);
  }, [exercise.id, exercise.sets, exercise.rest_seconds, exercise.workout_sets]);

  useEffect(() => {
    if (!user) return;

    const rawName = debouncedName.trim();
    const normalizedTarget = normalizeExerciseName(rawName);
    if (!normalizedTarget) {
      setLastPerformance(null);
      setLastPerformanceStatus('idle');
      return;
    }

    const cacheKey = getLastPerformanceCacheKey(user.id, normalizedTarget, workoutDate ?? null);
    const cached = getCachedLastPerformance(cacheKey);
    if (cached !== undefined) {
      setLastPerformance(cached);
      setLastPerformanceStatus('ready');
      return;
    }

    let cancelled = false;
    setLastPerformanceStatus('loading');

    const fetchLastPerformance = async () => {
      try {
        let workoutsQuery = supabase
          .from('workouts')
          .select('id, workout_date, name, user_id')
          .eq('user_id', user.id);

        if (workoutDate) {
          workoutsQuery = workoutsQuery.lt('workout_date', workoutDate);
        }

        const { data: workouts, error: wErr } = await workoutsQuery.order('workout_date', { ascending: true });

        if (cancelled) return;
        if (wErr) throw wErr;

        const workoutsList = (workouts || []).map((w: any) => ({
          id: w.id as string,
          date: w.workout_date as string,
          name: w.name as string,
        }));

        const workoutMetaById = new Map<string, { date: string; name: string }>();
        workoutsList.forEach((w) => workoutMetaById.set(w.id, { date: w.date, name: w.name }));

        const workoutIds = workoutsList.map((w) => w.id);

        if (workoutIds.length === 0) {
          setLastPerformance(null);
          setCachedLastPerformance(cacheKey, null);
          setLastPerformanceStatus('ready');
          return;
        }

        const { data: exList, error: exListErr } = await supabase
          .from('workout_exercises')
          .select('id, name, workout_id')
          .in('workout_id', workoutIds);

        if (cancelled) return;
        if (exListErr) throw exListErr;

        const exerciseIds = new Set<string>();
        const exerciseToWorkoutId = new Map<string, string>();

        (exList || []).forEach((ex: any) => {
          const raw = (ex.name ?? '').trim();
          if (!raw) return;
          if (normalizeExerciseName(raw) === normalizedTarget) {
            const exId = ex.id as string;
            exerciseIds.add(exId);
            const wId = ex.workout_id as string | null;
            if (wId) {
              exerciseToWorkoutId.set(exId, wId);
            }
          }
        });

        if (exerciseIds.size === 0) {
          setLastPerformance(null);
          setCachedLastPerformance(cacheKey, null);
          setLastPerformanceStatus('ready');
          return;
        }

        const { data: viewRows, error: viewErr } = await supabase
          .from('exercise_progress_view')
          .select('workout_date, workout_name, workout_id, exercise_id, max_weight, reps_at_max_weight')
          .in('workout_id', workoutIds)
          .in('exercise_id', Array.from(exerciseIds));

        if (cancelled) return;
        if (viewErr) throw viewErr;

        let rawData = (viewRows || []).map((row: any) => ({
          workout_date: row.workout_date as string,
          workout_name: row.workout_name as string,
          workout_id: row.workout_id as string,
          exercise_id: row.exercise_id as string,
          max_weight: row.max_weight as number | null,
          reps_at_max_weight: row.reps_at_max_weight as string | null,
        }));

        if (rawData.length === 0) {
          const { data: zeroSets, error: zeroErr } = await supabase
            .from('workout_sets')
            .select('id, workout_exercise_id, weight, reps, is_done, updated_at')
            .in('workout_exercise_id', Array.from(exerciseIds))
            .order('updated_at', { ascending: false });

          if (cancelled) return;
          if (zeroErr) throw zeroErr;

          rawData = (zeroSets || [])
            .filter((set: any) => set.weight !== null && Number(set.weight) === 0)
            .filter((set: any) => set.is_done || (typeof set.reps === 'string' && set.reps.trim() !== ''))
            .map((set: any) => {
              const exerciseId = set.workout_exercise_id as string;
              const workoutId = exerciseToWorkoutId.get(exerciseId);
              if (!workoutId) return null;
              const meta = workoutMetaById.get(workoutId);
              if (!meta) return null;
              return {
                workout_date: meta.date,
                workout_name: meta.name,
                workout_id: workoutId,
                exercise_id: exerciseId,
                max_weight: 0,
                reps_at_max_weight: set.reps as string | null,
              };
            })
            .filter((row): row is {
              workout_date: string;
              workout_name: string;
              workout_id: string;
              exercise_id: string;
              max_weight: number;
              reps_at_max_weight: string | null;
            } => row !== null);
        }

        if (rawData.length === 0) {
          setLastPerformance(null);
          setCachedLastPerformance(cacheKey, null);
          setLastPerformanceStatus('ready');
          return;
        }

        const processed = processProgressData(rawName, rawData);
        const lastPoint = processed.dataPoints[processed.dataPoints.length - 1];

        if (!lastPoint) {
          setLastPerformance(null);
          setCachedLastPerformance(cacheKey, null);
          setLastPerformanceStatus('ready');
          return;
        }

        const result: LastPerformance = {
          weight: lastPoint.weight,
          reps: lastPoint.reps,
          workoutDate: lastPoint.date,
        };

        setLastPerformance(result);
        setCachedLastPerformance(cacheKey, result);
        setLastPerformanceStatus('ready');
      } catch (err) {
        console.error('Failed to fetch last exercise performance', err);
        setLastPerformanceStatus('error');
      }
    };

    fetchLastPerformance();

    return () => {
      cancelled = true;
    };
  }, [debouncedName, user, workoutDate]);

  useLayoutEffect(() => {
    adjustNameInputHeight();
  }, [adjustNameInputHeight, nameInput]);

  useLayoutEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const element = nameInputRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      adjustNameInputHeight();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [adjustNameInputHeight]);

  // Автосохранение имени упражнения (debounce)
  useEffect(() => {
    const saveName = async () => {
      if (debouncedName.trim() === '' || debouncedName === exercise.name) return;
      try {
        await (supabase as any)
          .from('workout_exercises')
          .update({ name: debouncedName })
          .eq('id', exercise.id);
        const updated: WorkoutExerciseWithSets = { ...exercise, name: debouncedName };
        prevExerciseNameRef.current = debouncedName;
        onUpdateExercise(updated);
      } catch (e) {
        console.error('Failed to update exercise name', e);
      }
    };
    saveName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName]);

  useEffect(() => {
    const saveRestSeconds = async () => {
      if (debouncedRestSeconds === exercise.rest_seconds) return;
      try {
        await (supabase as any)
          .from('workout_exercises')
          .update({ rest_seconds: debouncedRestSeconds })
          .eq('id', exercise.id);
        const updated: WorkoutExerciseWithSets = {
          ...exercise,
          rest_seconds: debouncedRestSeconds,
        };
        onUpdateExercise(updated);
      } catch (e) {
        console.error('Failed to update rest seconds', e);
      }
    };
    saveRestSeconds();
  }, [debouncedRestSeconds, exercise, onUpdateExercise]);

  const adjustRestSeconds = (delta: number) => {
    setRestSeconds((prev) => Math.max(0, prev + delta));
  };

  const applySetsChange = async (next: number) => {
    if (next < 1 || next === setsCount || busy) return;
    setBusy(true);
    try {
      if (next > setsCount) {
        // Добавляем недостающие подходы (обычные, не дропсеты)
        const toAdd = Array.from({ length: next - setsCount }, (_, i) => ({
          workout_exercise_id: exercise.id,
          set_index: setsCount + i + 1,
          is_dropset: false,
        }));
        const { data: inserted, error: addErr } = await (supabase as any)
          .from('workout_sets')
          .insert(toAdd)
          .select();
        if (addErr) throw addErr;

        const updatedSets = [...exercise.workout_sets, ...(inserted || [])].sort((a, b) => {
          // Сортировка: дропсеты после родительского подхода
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
        // Обновим количество в упражнении
        await (supabase as any).from('workout_exercises').update({ sets: next }).eq('id', exercise.id);
        const updated: WorkoutExerciseWithSets = { ...exercise, sets: next, workout_sets: updatedSets };
        onUpdateExercise(updated);
      } else {
        // Удаляем «хвост» — только обычные подходы (не дропсеты) с set_index > next
        // Дропсеты привязаны к конкретному подходу и удаляются вместе с ним
        const setsToDelete = exercise.workout_sets.filter(
          s => !s.is_dropset && s.set_index > next
        );
        const idsToDelete = setsToDelete.map(s => s.id);
        
        // Также удаляем все дропсеты, которые были привязаны к удаляемым подходам
        // (дропсеты находятся в массиве сразу после своего родительского подхода)
        const allIdsToDelete = new Set(idsToDelete);
        let currentIndex = 0;
        for (const set of exercise.workout_sets) {
          if (!set.is_dropset && set.set_index > next) {
            // Удаляем этот подход и все следующие за ним дропсеты
            allIdsToDelete.add(set.id);
            let nextIdx = currentIndex + 1;
            while (nextIdx < exercise.workout_sets.length && exercise.workout_sets[nextIdx].is_dropset) {
              allIdsToDelete.add(exercise.workout_sets[nextIdx].id);
              nextIdx++;
            }
          }
          currentIndex++;
        }

        if (allIdsToDelete.size > 0) {
          const { error: delErr } = await supabase
            .from('workout_sets')
            .delete()
            .in('id', Array.from(allIdsToDelete));
          if (delErr) throw delErr;
        }

        const updatedSets = exercise.workout_sets.filter(s => !allIdsToDelete.has(s.id));
        await (supabase as any).from('workout_exercises').update({ sets: next }).eq('id', exercise.id);
        const updated: WorkoutExerciseWithSets = { ...exercise, sets: next, workout_sets: updatedSets };
        onUpdateExercise(updated);
      }
      setSetsCount(next);
    } catch (e) {
      console.error('Failed to change sets count', e);
      alert(t.exercise.errors.failedToChangeSets);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    // Сначала удаляем подходы, затем упражнение
    const { error: setsDelErr } = await supabase
      .from('workout_sets')
      .delete()
      .eq('workout_exercise_id', exercise.id);
    if (setsDelErr) {
      console.error('Failed to delete sets of exercise', setsDelErr);
      alert(t.exercise.errors.failedToDeleteSets);
      return;
    }

    const { error: exDelErr } = await supabase
      .from('workout_exercises')
      .delete()
      .eq('id', exercise.id);
    if (exDelErr) {
      console.error('Failed to delete exercise', exDelErr);
      alert(t.exercise.errors.failedToDeleteExercise);
      return;
    }

    if (onDeleteExercise) onDeleteExercise(exercise.id);
  };

  const MAX_REPS_LABEL = t.common.max;

  const formatWeight = (value: number | null) => {
    if (value === null || value === undefined) return '—';
    return String(value).replace('.', ',');
  };

  const formatReps = (value: string | null) => {
    if (value === null || value === undefined) return '—';
    const trimmed = value.trim();
    if (!trimmed) return '—';
    if (trimmed === '0') return MAX_REPS_LABEL;
    return trimmed;
  };

  const renderLastPerformance = () => {
    if (!nameInput.trim()) {
      return <span className="text-gray-500">{t.exercise.enterNameToSeeResult}</span>;
    }

    if (lastPerformanceStatus === 'loading') {
      return <span className="text-gray-400">{t.exercise.searchingLastResult}</span>;
    }

    if (lastPerformanceStatus === 'error') {
      return <span className="text-red-300">{t.exercise.loadError}</span>;
    }

    if (lastPerformance) {
      return (
        <span className="text-white text-base font-semibold">
          {formatWeight(lastPerformance.weight)} {t.common.kg} × {formatReps(lastPerformance.reps)}
        </span>
      );
    }

    return <span className="text-gray-500">{t.exercise.noDataBeforeDate}</span>;
  };

  // Стабильный callback для обновления подхода, использует ref для актуального exercise
  const handleSetChange = useCallback((updated: WorkoutExerciseWithSets['workout_sets'][0]) => {
    const currentExercise = exerciseRef.current;
    const updatedExercise: WorkoutExerciseWithSets = {
      ...currentExercise,
      workout_sets: currentExercise.workout_sets.map((s) => (s.id === updated.id ? updated : s)),
    };
    onUpdateExercise(updatedExercise);
  }, [onUpdateExercise]);

  // Добавление дропсета после указанного подхода
  const handleAddDropset = useCallback(async (afterSetId: string) => {
    const currentExercise = exerciseRef.current;
    const afterSetIndex = currentExercise.workout_sets.findIndex(s => s.id === afterSetId);
    if (afterSetIndex === -1) return;

    const afterSet = currentExercise.workout_sets[afterSetIndex];

    try {
      // Определяем parent_set_index:
      // - Если afterSet — обычный подход, то parent = afterSet.set_index
      // - Если afterSet — дропсет, то parent = afterSet.parent_set_index (тот же родитель)
      const parentSetIndex = afterSet.is_dropset 
        ? (afterSet.parent_set_index ?? afterSet.set_index)
        : afterSet.set_index;

      const maxSetIndex = Math.max(...currentExercise.workout_sets.map(s => s.set_index));
      const newSetIndex = maxSetIndex + 1;

      const { data: insertedSet, error } = await (supabase as any)
        .from('workout_sets')
        .insert({
          workout_exercise_id: currentExercise.id,
          set_index: newSetIndex,
          weight: null, // Вес не копируется, пользователь вводит сам
          reps: null,
          is_done: false,
          is_dropset: true,
          parent_set_index: parentSetIndex, // Связь с родительским подходом
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Вставляем дропсет сразу после родительского подхода (или после последнего дропсета этой группы)
      let insertPosition = afterSetIndex + 1;
      while (
        insertPosition < currentExercise.workout_sets.length &&
        currentExercise.workout_sets[insertPosition].is_dropset
      ) {
        insertPosition++;
      }

      const newSets = [...currentExercise.workout_sets];
      newSets.splice(insertPosition, 0, insertedSet);

      const updatedExercise: WorkoutExerciseWithSets = {
        ...currentExercise,
        workout_sets: newSets,
      };
      onUpdateExercise(updatedExercise);
    } catch (e) {
      console.error('Failed to add dropset', e);
      alert(t.exercise.errors.failedToAddDropset);
    }
  }, [onUpdateExercise]);

  // Удаление дропсета
  const handleDeleteDropset = useCallback(async (setId: string) => {
    const currentExercise = exerciseRef.current;
    const setToDelete = currentExercise.workout_sets.find(s => s.id === setId);
    if (!setToDelete || !setToDelete.is_dropset) return;

    try {
      const { error } = await supabase
        .from('workout_sets')
        .delete()
        .eq('id', setId);

      if (error) throw error;

      const updatedExercise: WorkoutExerciseWithSets = {
        ...currentExercise,
        workout_sets: currentExercise.workout_sets.filter(s => s.id !== setId),
      };
      onUpdateExercise(updatedExercise);
    } catch (e) {
      console.error('Failed to delete dropset', e);
      alert(t.exercise.errors.failedToDeleteDropset);
    }
  }, [onUpdateExercise]);

  // Функция для определения, является ли подход последним в своей группе (для показа кнопки "+")
  const isLastInGroup = useCallback((set: WorkoutExerciseWithSets['workout_sets'][0], index: number, allSets: WorkoutExerciseWithSets['workout_sets']) => {
    const nextSet = allSets[index + 1];
    
    // Для обычного подхода: показываем "+" если следующий — не дропсет или это конец списка
    if (!set.is_dropset) {
      return !nextSet || !nextSet.is_dropset;
    }
    
    // Для дропсета: показываем "+" если это последний дропсет в группе
    // (следующий — обычный подход или конец списка)
    return !nextSet || !nextSet.is_dropset;
  }, []);

  // Изменение количества разминочных подходов
  const applyWarmupSetsChange = async (next: number) => {
    if (next < 0 || next === warmupSetsCount || busy) return;
    setBusy(true);
    try {
      const currentWarmupSets = exercise.workout_sets.filter(s => s.is_warmup);
      const currentCount = currentWarmupSets.length;

      if (next > currentCount) {
        // Добавляем разминочные подходы
        const maxSetIndex = exercise.workout_sets.length > 0 
          ? Math.max(...exercise.workout_sets.map(s => s.set_index)) 
          : 0;
        const toAdd = Array.from({ length: next - currentCount }, (_, i) => ({
          workout_exercise_id: exercise.id,
          set_index: maxSetIndex + i + 1,
          is_dropset: false,
          is_warmup: true,
        }));
        const { data: inserted, error: addErr } = await (supabase as any)
          .from('workout_sets')
          .insert(toAdd)
          .select();
        if (addErr) throw addErr;

        // Разминочные в начале, обычные после
        const warmupSets = [...currentWarmupSets, ...(inserted || [])];
        const regularSets = exercise.workout_sets.filter(s => !s.is_warmup);
        const updatedSets = [...warmupSets, ...regularSets];
        
        const updated: WorkoutExerciseWithSets = { ...exercise, workout_sets: updatedSets };
        onUpdateExercise(updated);
      } else {
        // Удаляем лишние разминочные подходы (с конца)
        const toRemove = currentWarmupSets.slice(next);
        const idsToRemove = toRemove.map(s => s.id);
        
        if (idsToRemove.length > 0) {
          const { error: delErr } = await supabase
            .from('workout_sets')
            .delete()
            .in('id', idsToRemove);
          if (delErr) throw delErr;
        }

        const updatedSets = exercise.workout_sets.filter(s => !idsToRemove.includes(s.id));
        const updated: WorkoutExerciseWithSets = { ...exercise, workout_sets: updatedSets };
        onUpdateExercise(updated);
      }
      setWarmupSetsCount(next);
    } catch (e) {
      console.error('Failed to change warmup sets count', e);
      alert(t.exercise.errors.failedToChangeSets);
    } finally {
      setBusy(false);
    }
  };

  // Удаление разминочного подхода
  const handleDeleteWarmupSet = useCallback(async (setId: string) => {
    const currentExercise = exerciseRef.current;
    const setToDelete = currentExercise.workout_sets.find(s => s.id === setId);
    if (!setToDelete || !setToDelete.is_warmup) return;

    try {
      const { error } = await supabase
        .from('workout_sets')
        .delete()
        .eq('id', setId);

      if (error) throw error;

      const updatedSets = currentExercise.workout_sets.filter(s => s.id !== setId);
      const updatedExercise: WorkoutExerciseWithSets = {
        ...currentExercise,
        workout_sets: updatedSets,
      };
      onUpdateExercise(updatedExercise);
    } catch (e) {
      console.error('Failed to delete warmup set', e);
    }
  }, [onUpdateExercise]);

  // Разделяем подходы на разминочные и обычные
  const warmupSets = exercise.workout_sets.filter(s => s.is_warmup);
  const regularSets = exercise.workout_sets.filter(s => !s.is_warmup);

  return (
    <div id={`exercise-${exercise.id}`} className="glass card-dark p-4 exercise-card">
      <div className="exercise-card-header mb-3">
        <div className="name-wrap relative">
          <textarea
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            ref={nameInputRef}
            rows={1}
            className="w-full text-base sm:text-lg font-bold text-white whitespace-pre-wrap bg-white/10 hover:bg-white/15 focus:bg-white/10 border border-white/20 hover:border-white/30 focus:border-white/50 focus:ring-2 focus:ring-white/25 focus:outline-none rounded-xl px-4 pr-9 py-3 min-h-[3rem] resize-none overflow-y-hidden leading-relaxed transition-colors"
          />
          {nameInput && nameInput.trim() !== '' && (
            <button
              type="button"
              onClick={() => {
                setNameInput('');
                // после очистки пересчитать высоту
                requestAnimationFrame(() => adjustNameInputHeight());
              }}
              aria-label={t.common.clear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 text-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
        <button
          aria-label={t.exercise.deleteExercise}
          className="delete-btn btn-glass btn-glass-icon btn-glass-outline"
          onClick={() => setIsDeleteOpen(true)}
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6l1-2h6l1 2" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
          </svg>
        </button>
      </div>
      <div className="space-y-3">
        <div className="rounded-2xl bg-white/5 px-4 py-3 text-xs sm:text-sm text-gray-300">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="font-semibold text-white">{t.exercise.lastWeight}</span>
            {lastPerformance?.workoutDate && (
              <span className="text-[0.7rem] uppercase tracking-wide text-gray-400">
                {formatDateForDisplay(lastPerformance.workoutDate)}
              </span>
            )}
          </div>
          {renderLastPerformance()}
        </div>
        <div className="flex justify-center">
          <RestTimer
            restSeconds={restSeconds}
            exerciseId={exercise.id}
            onAdjustRestSeconds={adjustRestSeconds}
          />
        </div>
        {/* Разминочные подходы */}
        <div className="flex items-center text-sm py-3 sm:py-4 px-2 rounded-lg warmup-row-header">
          <span className="w-[100px] whitespace-nowrap font-medium text-sky-300">{t.exercise.warmupSets}:</span>
          <div className="inline-flex items-center gap-2">
            <button
              disabled={busy || warmupSetsCount <= 0}
              onClick={() => applyWarmupSetsChange(warmupSetsCount - 1)}
              className="btn-glass btn-glass-icon-round btn-glass-secondary"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <span className="min-w-[3ch] text-center text-white font-semibold">{warmupSetsCount}</span>
            <button
              disabled={busy || warmupSetsCount >= 10}
              onClick={() => applyWarmupSetsChange(warmupSetsCount + 1)}
              className="btn-glass btn-glass-icon-round btn-glass-secondary"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        {warmupSets.length > 0 && (
          <div className="space-y-2 !mt-0 pt-1">
            <div className="warmup-sets-header grid grid-cols-6 gap-3 text-sm sm:text-base font-semibold px-2 sm:px-3 py-2 rounded-lg overflow-hidden">
              <div className="col-span-1 flex items-center justify-start pl-1 sm:pl-2 whitespace-nowrap">{t.exercise.set}</div>
              <div className="col-span-2 flex items-center justify-center whitespace-nowrap">{t.exercise.weight}</div>
              <div className="col-span-2 flex items-center justify-center whitespace-nowrap">{t.exercise.reps}</div>
              <div className="col-span-1"></div>
            </div>
            <div className="space-y-2">
              {warmupSets.map((set, index) => (
                <WarmupSetRow
                  key={set.id}
                  set={set}
                  displayIndex={index + 1}
                  onChange={handleSetChange}
                  onDelete={handleDeleteWarmupSet}
                />
              ))}
            </div>
          </div>
        )}

        {/* Обычные подходы */}
        <div className="flex items-center text-sm py-3 sm:py-4 px-2 rounded-lg exercise-row-header">
          <span className="w-[100px] whitespace-nowrap font-medium">{t.exercise.sets}:</span>
          <div className="inline-flex items-center gap-2">
            <button
              disabled={busy || setsCount <= 1}
              onClick={() => applySetsChange(setsCount - 1)}
              className="btn-glass btn-glass-icon-round btn-glass-secondary"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            <span className="min-w-[3ch] text-center text-white font-semibold">{setsCount}</span>
            <button
              disabled={busy || setsCount >= 30}
              onClick={() => applySetsChange(setsCount + 1)}
              className="btn-glass btn-glass-icon-round btn-glass-secondary"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          {exercise.reps?.trim() && (
            <div className="ml-auto whitespace-nowrap font-medium">{t.exercise.reps}: {exercise.reps}</div>
          )}
        </div>
      </div>
      <div className="space-y-3 pt-1">
        <div className="grid grid-cols-6 gap-3 text-sm sm:text-base font-semibold px-2 sm:px-3 py-2 rounded-lg overflow-hidden exercise-sets-header">
          <div className="col-span-1 flex items-center justify-start pl-1 sm:pl-2 whitespace-nowrap">{t.exercise.set}</div>
          <div className="col-span-2 flex items-center justify-center whitespace-nowrap">{t.exercise.weight}</div>
          <div className="col-span-2 flex items-center justify-center whitespace-nowrap">{t.exercise.reps}</div>
          <div className="col-span-1 flex items-center justify-end pr-1 sm:pr-2 whitespace-nowrap">{t.exercise.toFailure}</div>
        </div>
        <div className="space-y-2">
          {regularSets.map((set, index, allSets) => {
            // Для обычного подхода ищем предыдущий ОБЫЧНЫЙ подход (пропуская дропсеты)
            // Для дропсета previousSet не нужен (кнопка копирования веса не показывается)
            let previousSet: typeof set | undefined = undefined;
            if (!set.is_dropset) {
              for (let i = index - 1; i >= 0; i--) {
                if (!allSets[i].is_dropset) {
                  previousSet = allSets[i];
                  break;
                }
              }
            }
            return (
              <SetRow
                key={set.id}
                set={set}
                previousSet={previousSet}
                onChange={handleSetChange}
                onAddDropset={handleAddDropset}
                onDeleteDropset={handleDeleteDropset}
                isLastInGroup={isLastInGroup(set, index, allSets)}
              />
            );
          })}
        </div>
      </div>
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={t.exercise.deleteExercise}
        description={exercise.name ? t.exercise.deleteExerciseDesc.replace('{name}', exercise.name) : t.exercise.deleteExerciseDescNoName}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

// Мемоизация для предотвращения лишних ре-рендеров
export const ExerciseCard = React.memo(ExerciseCardComponent, (prevProps, nextProps) => {
  // Перерисовываем только если изменились ключевые данные
  const prevEx = prevProps.exercise;
  const nextEx = nextProps.exercise;
  
  if (prevEx.id !== nextEx.id) return false;
  if (prevEx.name !== nextEx.name) return false;
  if (prevEx.sets !== nextEx.sets) return false;
  if (prevEx.rest_seconds !== nextEx.rest_seconds) return false;
  if (prevEx.reps !== nextEx.reps) return false;
  if (prevProps.workoutDate !== nextProps.workoutDate) return false;
  
  // Сравниваем workout_sets
  if (prevEx.workout_sets.length !== nextEx.workout_sets.length) return false;
  
  for (let i = 0; i < prevEx.workout_sets.length; i++) {
    const prevSet = prevEx.workout_sets[i];
    const nextSet = nextEx.workout_sets[i];
    if (
      prevSet.id !== nextSet.id ||
      prevSet.weight !== nextSet.weight ||
      prevSet.reps !== nextSet.reps ||
      prevSet.is_done !== nextSet.is_done ||
      prevSet.is_dropset !== nextSet.is_dropset ||
      prevSet.parent_set_index !== nextSet.parent_set_index ||
      prevSet.is_warmup !== nextSet.is_warmup
    ) {
      return false;
    }
  }
  
  return true;
});
