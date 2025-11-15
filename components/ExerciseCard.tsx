import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { WorkoutExerciseWithSets, WorkoutSet } from '../types/database.types';
import { supabase } from '../lib/supabase';
import { SetRow } from './SetRow';
import { RestTimer } from './RestTimer';
import { useDebounce } from '../hooks/useDebounce';
import ConfirmDialog from './confirm-dialog';
import { useAuth } from '../hooks/useAuth';
import { formatDateForDisplay } from '../utils/date-helpers';
import { processProgressData } from '../utils/progress-helpers';

const normalizeExerciseName = (value: string) =>
  (value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
    .replace(/[-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, workoutDate, onUpdateExercise, onDeleteExercise }) => {

  const [nameInput, setNameInput] = useState(exercise.name);
  const [setsCount, setSetsCount] = useState<number>(exercise.sets);
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
  }, [exercise.id, exercise.sets, exercise.rest_seconds]);

  useEffect(() => {
    if (!user) return;

    const rawName = debouncedName.trim();
    const normalizedTarget = normalizeExerciseName(rawName);
    if (!normalizedTarget) {
      setLastPerformance(null);
      setLastPerformanceStatus('idle');
      return;
    }

    let cancelled = false;
    setLastPerformanceStatus('loading');

    const fetchLastPerformance = async () => {
      try {
        let query = supabase
          .from('workouts')
          .select('id, workout_date, name, user_id')
          .eq('user_id', user.id);

        if (workoutDate) {
          query = query.lt('workout_date', workoutDate);
        }

        const { data: workouts, error: wErr } = await query.order('workout_date', { ascending: true });

        if (cancelled) return;
        if (wErr) throw wErr;

        const workoutMap = new Map<string, { date: string; name: string }>();
        const workoutIds = (workouts || []).map((w: any) => {
          workoutMap.set(w.id as string, { date: w.workout_date as string, name: w.name as string });
          return w.id as string;
        });

        if (workoutIds.length === 0) {
          setLastPerformance(null);
          setLastPerformanceStatus('ready');
          return;
        }

        const { data: exData, error: exErr } = await supabase
          .from('workout_exercises')
          .select('id, name, workout_id, workout_sets ( weight, reps, is_done )')
          .in('workout_id', workoutIds);

        if (cancelled) return;
        if (exErr) throw exErr;

        const normalizeLocal = (s: string) => normalizeExerciseName(s);
        const filtered = (exData || []).filter((ex: any) => normalizeLocal(ex.name as string) === normalizedTarget);

        const rawData = filtered
          .map((ex: any) => {
            const w = workoutMap.get(ex.workout_id as string);
            if (!w) return null;
            return {
              workout_date: w.date,
              workout_name: w.name,
              workout_id: ex.workout_id as string,
              exercise_id: ex.id as string,
              sets: (ex.workout_sets || []) as WorkoutSet[],
            };
          })
          .filter(Boolean) as {
            workout_date: string;
            workout_name: string;
            workout_id: string;
            exercise_id: string;
            sets: WorkoutSet[];
          }[];

        if (rawData.length === 0) {
          setLastPerformance(null);
          setLastPerformanceStatus('ready');
          return;
        }

        const processed = processProgressData(rawName, rawData);
        const lastPoint = processed.dataPoints[processed.dataPoints.length - 1];

        if (!lastPoint) {
          setLastPerformance(null);
          setLastPerformanceStatus('ready');
          return;
        }

        setLastPerformance({
          weight: lastPoint.weight,
          reps: lastPoint.reps,
          workoutDate: lastPoint.date,
        });
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
        await supabase
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
        await supabase
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
        // Добавляем недостающие подходы
        const toAdd = Array.from({ length: next - setsCount }, (_, i) => ({
          workout_exercise_id: exercise.id,
          set_index: setsCount + i + 1,
        }));
        const { data: inserted, error: addErr } = await supabase
          .from('workout_sets')
          .insert(toAdd)
          .select();
        if (addErr) throw addErr;

        const updatedSets = [...exercise.workout_sets, ...(inserted || [])].sort((a, b) => a.set_index - b.set_index);
        // Обновим количество в упражнении
        await supabase.from('workout_exercises').update({ sets: next }).eq('id', exercise.id);
        const updated: WorkoutExerciseWithSets = { ...exercise, sets: next, workout_sets: updatedSets };
        onUpdateExercise(updated);
      } else {
        // Удаляем «хвост»
        const { error: delErr } = await supabase
          .from('workout_sets')
          .delete()
          .eq('workout_exercise_id', exercise.id)
          .gt('set_index', next);
        if (delErr) throw delErr;

        const updatedSets = exercise.workout_sets.filter(s => s.set_index <= next);
        await supabase.from('workout_exercises').update({ sets: next }).eq('id', exercise.id);
        const updated: WorkoutExerciseWithSets = { ...exercise, sets: next, workout_sets: updatedSets };
        onUpdateExercise(updated);
      }
      setSetsCount(next);
    } catch (e) {
      console.error('Failed to change sets count', e);
      alert('Не удалось изменить количество подходов');
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
      alert('Не удалось удалить подходы упражнения. Попробуйте снова.');
      return;
    }

    const { error: exDelErr } = await supabase
      .from('workout_exercises')
      .delete()
      .eq('id', exercise.id);
    if (exDelErr) {
      console.error('Failed to delete exercise', exDelErr);
      alert('Не удалось удалить упражнение. Попробуйте снова.');
      return;
    }

    if (onDeleteExercise) onDeleteExercise(exercise.id);
  };

  const formatWeight = (value: number | null) => {
    if (value === null || value === undefined) return '—';
    return String(value).replace('.', ',');
  };

  const renderLastPerformance = () => {
    if (!nameInput.trim()) {
      return <span className="text-gray-500">Введите название, чтобы увидеть прошлый результат</span>;
    }

    if (lastPerformanceStatus === 'loading') {
      return <span className="text-gray-400">Поиск последнего результата…</span>;
    }

    if (lastPerformanceStatus === 'error') {
      return <span className="text-red-300">Не удалось загрузить данные</span>;
    }

    if (lastPerformance) {
      return (
        <span className="text-white text-base font-semibold">
          {formatWeight(lastPerformance.weight)} кг × {lastPerformance.reps ?? '—'}
        </span>
      );
    }

    return <span className="text-gray-500">До этой даты нет данных по этому упражнению</span>;
  };

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
              aria-label="Очистить"
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
          aria-label="Удалить упражнение"
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
            <span className="font-semibold text-white">Последний рабочий вес</span>
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
        <div className="flex items-center justify-between text-sm py-3 sm:py-4 px-2 rounded-lg" style={{color:'#a1a1aa', backgroundColor: 'rgba(255,255,255,0.02)'}}>
          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap font-medium">Подходы:</span>
            <div className="inline-flex items-center gap-2">
              <button
                disabled={busy || setsCount <= 1}
                onClick={() => applySetsChange(setsCount - 1)}
                className="btn-glass btn-glass-icon-round btn-glass-secondary"
              >−</button>
              <span className="min-w-[3ch] text-center text-white font-semibold text-sm sm:text-base">{setsCount}</span>
              <button
                disabled={busy || setsCount >= 30}
                onClick={() => applySetsChange(setsCount + 1)}
                className="btn-glass btn-glass-icon-round btn-glass-secondary"
              >+</button>
            </div>
          </div>
          {exercise.reps?.trim() && (
            <div className="ml-3 flex-1 text-right whitespace-nowrap font-medium">Повторы: {exercise.reps}</div>
          )}
        </div>
      </div>
      
      <div className="space-y-3 pt-1">
        <div className="grid grid-cols-6 gap-3 text-center text-sm font-semibold px-2 py-2 rounded-lg" style={{color:'#a1a1aa', backgroundColor: 'rgba(255,255,255,0.03)'}}>
          <div className="col-span-1">Подход</div>
          <div className="col-span-2">Вес (кг)</div>
          <div className="col-span-2">Повторы</div>
          <div className="col-span-1 whitespace-nowrap">В отказ</div>
        </div>
        <div className="space-y-2">
          {exercise.workout_sets.map((set) => (
            <SetRow key={set.id} set={set} onChange={(updated) => {
              const updatedExercise: WorkoutExerciseWithSets = {
                ...exercise,
                workout_sets: exercise.workout_sets.map(s => (s.id === updated.id ? updated : s)),
              };
              onUpdateExercise(updatedExercise);
            }} />
          ))}
        </div>
      </div>
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Удалить упражнение?"
        description={exercise.name ? `Вы собираетесь удалить упражнение "${exercise.name}". Действие необратимо.` : 'Вы собираетесь удалить упражнение. Действие необратимо.'}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
