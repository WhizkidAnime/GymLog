import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { WorkoutExerciseWithSets } from '../types/database.types';
import { supabase } from '../lib/supabase';
import { SetRow } from './SetRow';
import { RestTimer } from './RestTimer';
import { useDebounce } from '../hooks/useDebounce';
import ConfirmDialog from './confirm-dialog';

interface ExerciseCardProps {
  exercise: WorkoutExerciseWithSets;
  onUpdateExercise: (updatedExercise: WorkoutExerciseWithSets) => void;
  onDeleteExercise?: (exerciseId: number) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, onUpdateExercise, onDeleteExercise }) => {
  const [nameInput, setNameInput] = useState(exercise.name);
  const [setsCount, setSetsCount] = useState<number>(exercise.sets);
  const [restSeconds, setRestSeconds] = useState<number>(exercise.rest_seconds);
  const [busy, setBusy] = useState(false);

  const nameInputRef = useRef<HTMLTextAreaElement | null>(null);
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

  return (
    <div id={`exercise-${exercise.id}`} className="glass card-dark p-4 exercise-card">
      <div className="exercise-card-header mb-3">
        <div className="name-wrap">
          <textarea
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            ref={nameInputRef}
            rows={1}
            className="w-full text-base sm:text-lg font-bold text-white whitespace-pre-wrap bg-white/10 hover:bg-white/15 focus:bg-white/10 border border-white/20 hover:border-white/30 focus:border-white/50 focus:ring-2 focus:ring-white/25 focus:outline-none rounded-xl px-4 py-3 min-h-[3rem] resize-none overflow-y-hidden leading-relaxed transition-colors"
          />
        </div>
        <button
          aria-label="Удалить упражнение"
          className="delete-btn btn-glass btn-glass-icon btn-glass-outline"
          onClick={() => setIsDeleteOpen(true)}
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div className="space-y-3">
        <div className="flex justify-center">
          <RestTimer
            restSeconds={restSeconds}
            exerciseId={exercise.id}
            onAdjustRestSeconds={adjustRestSeconds}
          />
        </div>
        <div className="flex items-center justify-between text-xs sm:text-sm py-4 sm:py-5 px-2 rounded-lg" style={{color:'#a1a1aa', backgroundColor: 'rgba(255,255,255,0.02)'}}>
          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap font-medium">Подходы:</span>
            <div className="inline-flex items-center gap-2">
              <button
                disabled={busy || setsCount <= 1}
                onClick={() => applySetsChange(setsCount - 1)}
                className="btn-glass btn-glass-icon-round btn-glass-secondary"
              >−</button>
              <span className="min-w-[3ch] text-center text-white font-semibold text-base sm:text-lg">{setsCount}</span>
              <button
                disabled={busy || setsCount >= 30}
                onClick={() => applySetsChange(setsCount + 1)}
                className="btn-glass btn-glass-icon-round btn-glass-secondary"
              >+</button>
            </div>
          </div>
          {exercise.reps?.trim() && (
            <div className="ml-3 flex-1 text-right whitespace-nowrap text-sm sm:text-base font-medium">Повторы: {exercise.reps}</div>
          )}
        </div>
      </div>
      
      <div className="space-y-3 pt-2">
        <div className="grid grid-cols-5 gap-3 text-center text-sm sm:text-base font-semibold px-3 py-3 rounded-lg" style={{color:'#a1a1aa', backgroundColor: 'rgba(255,255,255,0.03)'}}>
          <div className="col-span-1">Подход</div>
          <div className="col-span-2">Вес (кг)</div>
          <div className="col-span-1">Повторы</div>
          <div className="col-span-1">Готово</div>
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
