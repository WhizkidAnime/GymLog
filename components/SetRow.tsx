import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDebounce } from '../hooks/useDebounce';
import type { WorkoutSet } from '../types/database.types';

interface SetRowProps {
  set: WorkoutSet;
  onChange?: (updated: WorkoutSet) => void;
}

export const SetRow: React.FC<SetRowProps> = ({ set, onChange }) => {
  const storageKey = `workout_set_draft:${set.id}`;

  const [weight, setWeight] = useState<string | number>(set.weight ?? '');
  const [reps, setRps] = useState<string>(set.reps ?? '');
  const [isDone, setIsDone] = useState<boolean>(set.is_done);
  const [isSaving, setIsSaving] = useState(false);

  const debouncedWeight = useDebounce(weight, 500);
  const debouncedReps = useDebounce(reps, 500);
  
  // При маунте пробуем восстановиться из localStorage, если данные свежее, чем в БД
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { weight: number | '' ; reps: string | null; isDone: boolean; updatedAt: number };
      const dbUpdatedAt = new Date(set.updated_at).getTime();
      if (draft.updatedAt > dbUpdatedAt) {
        setWeight(draft.weight === null ? '' : draft.weight);
        setRps(draft.reps ?? '');
        setIsDone(draft.isDone);
      }
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Синхронизируем локальное состояние, если проп поменялся из БД
  useEffect(() => {
    setIsDone(set.is_done);
  }, [set.is_done]);
  
  useEffect(() => {
    const saveSet = async () => {
      // Только если действительно что-то изменилось
      if (debouncedWeight !== (set.weight ?? '') || debouncedReps !== (set.reps ?? '')) {
        const draft = { weight: debouncedWeight === '' ? '' : Number(debouncedWeight), reps: debouncedReps === '' ? null : debouncedReps, isDone, updatedAt: Date.now() };
        try { localStorage.setItem(storageKey, JSON.stringify(draft)); } catch {}

        setIsSaving(true);
        const { error } = await supabase
          .from('workout_sets')
          .update({
            weight: debouncedWeight === '' ? null : Number(debouncedWeight),
            reps: debouncedReps === '' ? null : debouncedReps,
            updated_at: new Date().toISOString(),
          })
          .eq('id', set.id);

        if (error) {
          console.error('Error saving set:', error);
        } else {
          // Успешно сохранили — черновик больше не нужен
          try { localStorage.removeItem(storageKey); } catch {}
          // Сообщим вверх об изменении
          onChange?.({
            ...set,
            weight: debouncedWeight === '' ? null : Number(debouncedWeight),
            reps: debouncedReps === '' ? null : debouncedReps,
            is_done: isDone,
            updated_at: new Date().toISOString(),
          });
        }
        setTimeout(() => setIsSaving(false), 500);
      }
    };
    saveSet();
  }, [debouncedWeight, debouncedReps, set.id, set.weight, set.reps, isDone, storageKey]);

  const handleDoneToggle = async () => {
    const newDoneState = !isDone;
    setIsDone(newDoneState);
    setIsSaving(true);
    // Обновим черновик сразу
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ weight: weight === '' ? '' : Number(weight), reps: reps === '' ? null : reps, isDone: newDoneState, updatedAt: Date.now() })
      );
    } catch {}
    const { error } = await supabase
      .from('workout_sets')
      .update({ is_done: newDoneState, updated_at: new Date().toISOString() })
      .eq('id', set.id);
    if (error) {
      console.error("Error updating done status:", error);
      setIsDone(!newDoneState); // Revert on error
    }
    try { localStorage.removeItem(storageKey); } catch {}
    setTimeout(() => setIsSaving(false), 500);
    onChange?.({ ...set, is_done: newDoneState, updated_at: new Date().toISOString() });
  };
  
  const doneBg = isDone ? 'bg-green-500' : 'bg-transparent';
  const textColor = isDone ? 'text-black' : 'text-inherit';

  return (
    <div className={`relative grid grid-cols-5 gap-2 items-center p-2 rounded-md transition-colors duration-300 ${doneBg}`}>
      <div className={`col-span-1 text-center font-medium ${textColor}`}>{set.set_index}</div>
      <div className="col-span-2">
        <input
          type="number"
          step="0.25"
          placeholder="0"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className={`w-full p-1 text-center rounded-md border-gray-600 shadow-sm ${textColor}`}
          style={{backgroundColor: isDone ? '#ffffff' : '#18181b', color: isDone ? '#0a0a0a' : '#fafafa'}}
        />
      </div>
      <div className="col-span-1">
        <input
          type="text"
          placeholder="0"
          value={reps}
          onChange={(e) => setRps(e.target.value)}
          className={`w-full p-1 text-center rounded-md border-gray-600 shadow-sm ${textColor}`}
          style={{backgroundColor: isDone ? '#ffffff' : '#18181b', color: isDone ? '#0a0a0a' : '#fafafa'}}
        />
      </div>
      <div className="col-span-1 flex justify-center">
        <input
          type="checkbox"
          checked={isDone}
          onChange={handleDoneToggle}
          className="h-6 w-6 rounded-sm border border-gray-300 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          style={{ accentColor: '#ffffff', color: '#0a0a0a' }}
        />
      </div>
       {isSaving && <div className="absolute right-2 top-2 h-2 w-2 bg-blue-500 rounded-full animate-ping"></div>}
    </div>
  );
};