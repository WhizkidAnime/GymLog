import React, { useEffect, useState } from 'react';
import type { WorkoutExerciseWithSets } from '../types/database.types';
import { supabase } from '../lib/supabase';
import { SetRow } from './SetRow';
import { RestTimer } from './RestTimer';
import { useDebounce } from '../hooks/useDebounce';

interface ExerciseCardProps {
  exercise: WorkoutExerciseWithSets;
  onUpdateExercise: (updatedExercise: WorkoutExerciseWithSets) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, onUpdateExercise }) => {
  const allSetsDone = exercise.workout_sets.every(set => set.is_done);

  const [nameInput, setNameInput] = useState(exercise.name);
  const [setsCount, setSetsCount] = useState<number>(exercise.sets);
  const [busy, setBusy] = useState(false);

  const debouncedName = useDebounce(nameInput, 500);

  useEffect(() => {
    setNameInput(exercise.name);
    setSetsCount(exercise.sets);
  }, [exercise.id, exercise.name, exercise.sets]);

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
        onUpdateExercise(updated);
      } catch (e) {
        console.error('Failed to update exercise name', e);
      }
    };
    saveName();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName]);

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

  const handleToggleCompleteExercise = async () => {
    if (!exercise.workout_sets || exercise.workout_sets.length === 0) return;

    const nextDone = !exercise.workout_sets.every(s => s.is_done);
    const setIds = exercise.workout_sets.map(set => set.id);
    const { error } = await supabase
      .from('workout_sets')
      .update({ is_done: nextDone, updated_at: new Date().toISOString() })
      .in('id', setIds);

    if (error) {
      console.error('Error toggling all sets:', error);
      alert('Не удалось изменить состояние упражнения. Попробуйте снова.');
      return;
    }

    const updatedExercise: WorkoutExerciseWithSets = {
      ...exercise,
      workout_sets: exercise.workout_sets.map(s => ({ ...s, is_done: nextDone, updated_at: new Date().toISOString() })),
    };
    onUpdateExercise(updatedExercise);
  };

  return (
    <div className="glass card-dark p-4">
      <div className="mb-3 grid grid-cols-[1fr_auto] gap-2 items-start">
        <div className="pr-1">
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="w-full text-base sm:text-lg font-bold bg-transparent border-b border-white/20 focus:outline-none focus:border-white/50 truncate"
            style={{color:'#fff'}}
          />
        </div>
        <div className="justify-self-end"><RestTimer restSeconds={exercise.rest_seconds} exerciseId={exercise.id} /></div>
        <div className="col-span-2 flex items-center justify-between text-xs sm:text-sm mt-1" style={{color:'#a1a1aa'}}>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap">Подходы:</span>
            <div className="inline-flex items-center gap-1">
              <button
                disabled={busy || setsCount <= 1}
                onClick={() => applySetsChange(setsCount - 1)}
                className="w-7 h-7 flex items-center justify-center rounded border border-white/30 text-white hover:bg-white/10 disabled:opacity-50"
              >-</button>
              <span className="min-w-[2ch] text-center text-white">{setsCount}</span>
              <button
                disabled={busy || setsCount >= 30}
                onClick={() => applySetsChange(setsCount + 1)}
                className="w-7 h-7 flex items-center justify-center rounded border border-white/30 text-white hover:bg-white/10 disabled:opacity-50"
              >+</button>
            </div>
          </div>
          <div className="ml-3 flex-1 text-right whitespace-nowrap">Повторы: {exercise.reps}</div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-2 text-center text-xs font-semibold px-2" style={{color:'#a1a1aa'}}>
          <div className="col-span-1">Подход</div>
          <div className="col-span-2">Вес (кг)</div>
          <div className="col-span-1">Повторы</div>
          <div className="col-span-1">Готово</div>
        </div>
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
      <div className="mt-4">
        <button
          onClick={handleToggleCompleteExercise}
          className={`w-full px-4 py-2 text-sm font-semibold text-white rounded-md transition-colors ${allSetsDone ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {allSetsDone ? 'Отменить завершение' : 'Завершить упражнение'}
        </button>
      </div>
    </div>
  );
};