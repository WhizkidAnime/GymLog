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
  const lastNonMaxKey = `workout_set_last_non_max_reps:${set.id}`;
  // Внутреннее представление веса — всегда строка с запятой в качестве разделителя
  const toDisplay = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n).replace('.', ','));
  const toNumber = (s: string) => {
    if (s === '') return null;
    const n = Number(s.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  const normalizeInput = (v: string) => {
    let s = v.replace('.', ',');
    s = s.replace(/[^\d,]/g, '');
    const idx = s.indexOf(',');
    if (idx !== -1) {
      s = s.slice(0, idx + 1) + s.slice(idx + 1).replace(/,/g, '');
    }
    return s;
  };

  const MAX_REPS_LABEL = 'макс.';

  const repsFromDbToDisplay = (value: string | null) => {
    if (value === null || value === undefined) return '';
    if (value === '0') return MAX_REPS_LABEL;
    return value;
  };

  const repsDisplayToDb = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const lower = trimmed.toLowerCase();
    if (lower === 'макс' || lower === 'макс.' || /^0+$/.test(trimmed)) return '0';
    return trimmed;
  };

  const normalizeRepsInput = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === '') return '';
    if (/^0+$/.test(trimmed)) return MAX_REPS_LABEL;
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('макс')) return MAX_REPS_LABEL;
    const digitsOnly = trimmed.replace(/[^0-9]/g, '');
    return digitsOnly;
  };

  const initialRepsDisplay = repsFromDbToDisplay(set.reps);
  const [weight, setWeight] = useState<string>(toDisplay(set.weight));
  const [reps, setRps] = useState<string>(initialRepsDisplay);
  const [lastNonMaxReps, setLastNonMaxReps] = useState<string | null>(
    repsDisplayToDb(initialRepsDisplay) === '0' ? null : (initialRepsDisplay || null)
  );
  const [isDone, setIsDone] = useState<boolean>(set.is_done);
  const [isSaving, setIsSaving] = useState(false);

  const debouncedWeight = useDebounce(weight, 500);
  const debouncedReps = useDebounce(reps, 500);
 
  const persistLastNonMaxReps = (value: string | null) => {
    setLastNonMaxReps(value);
    try {
      if (value && value.trim() !== '') {
        localStorage.setItem(lastNonMaxKey, value);
      } else {
        localStorage.removeItem(lastNonMaxKey);
      }
    } catch {
      // ignore
    }
  };
  
  // При маунте пробуем восстановиться из localStorage, если данные свежее, чем в БД
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { weight: number | ''; reps: string | null; isDone: boolean; updatedAt: number };
      const dbUpdatedAt = new Date(set.updated_at).getTime();
      if (draft.updatedAt > dbUpdatedAt) {
        setWeight(draft.weight === '' ? '' : toDisplay(draft.weight as number));
        const restoredRepsDisplay = repsFromDbToDisplay(draft.reps);
        setRps(restoredRepsDisplay);
        const nonMax =
          repsDisplayToDb(restoredRepsDisplay) === '0' ? null : (restoredRepsDisplay || null);
        persistLastNonMaxReps(nonMax);
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
    if (set.reps !== '0') return;
    try {
      const saved = localStorage.getItem(lastNonMaxKey);
      if (saved && saved.trim() !== '') {
        setLastNonMaxReps(saved);
      }
    } catch {
      // ignore
    }
  }, [set.reps, lastNonMaxKey]);
  
  useEffect(() => {
    const saveSet = async () => {
      // Только если действительно что-то изменилось
      const weightNum = toNumber(debouncedWeight as string);
      const repsForDb = repsDisplayToDb(debouncedReps as string);
      if (weightNum !== (set.weight ?? null) || repsForDb !== (set.reps ?? null) || isDone !== set.is_done) {
        const draft = { weight: weightNum === null ? '' : weightNum, reps: repsForDb, isDone, updatedAt: Date.now() };
        try { localStorage.setItem(storageKey, JSON.stringify(draft)); } catch {}

        setIsSaving(true);
        const { error } = await supabase
          .from('workout_sets')
          .update({
            weight: weightNum,
            reps: repsForDb,
            is_done: isDone,
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
            weight: weightNum,
            reps: repsForDb,
            is_done: isDone,
            updated_at: new Date().toISOString(),
          });
        }
        setTimeout(() => setIsSaving(false), 500);
      }
    };
    saveSet();
  }, [debouncedWeight, debouncedReps, set.id, set.weight, set.reps, set.is_done, isDone, storageKey]);

  // Автоматическое выставление/отключение галочки при изменении веса или повторов
  useEffect(() => {
    const hasWeight = toNumber(debouncedWeight as string) !== null;
    const hasReps = repsDisplayToDb(debouncedReps as string) !== null;
    const shouldBeDone = hasWeight && hasReps;

    if (shouldBeDone && !isDone) {
      setIsDone(true);
    } else if (!shouldBeDone && isDone) {
      setIsDone(false);
    }
  }, [debouncedWeight, debouncedReps, isDone]);

  const doneBg = isDone ? 'bg-green-500' : 'bg-transparent';
  const textColor = isDone ? 'text-black' : 'text-inherit';

  const isMaxMode = repsDisplayToDb(reps) === '0';

  const handleToggleMax = () => {
    if (isMaxMode) {
      if (lastNonMaxReps !== null && lastNonMaxReps.trim() !== '') {
        setRps(lastNonMaxReps);
      } else {
        setRps('');
      }
    } else {
      if (repsDisplayToDb(reps) !== '0' && reps.trim() !== '') {
        persistLastNonMaxReps(reps);
      }
      setRps(MAX_REPS_LABEL);
    }
  };

  return (
    <div className={`relative grid grid-cols-6 gap-3 items-center p-2 rounded-md transition-colors duration-300 ${doneBg}`}>
      <div className={`col-span-1 text-center font-medium ${textColor}`}>{set.set_index}</div>
      <div className="col-span-2 flex justify-center">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={weight}
          onChange={(e) => setWeight(normalizeInput(e.target.value))}
          className={`w-[72px] p-1 text-center rounded-md border-gray-600 shadow-sm ${textColor}`}
          style={{backgroundColor: isDone ? '#ffffff' : '#18181b', color: isDone ? '#0a0a0a' : '#fafafa'}}
        />
      </div>
      <div className="col-span-2 flex justify-center">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="0"
          value={reps}
          onChange={(e) => {
            const next = normalizeRepsInput(e.target.value);
            setRps(next);
            if (repsDisplayToDb(next) !== '0') {
              const value = next.trim() === '' ? null : next;
              persistLastNonMaxReps(value);
            }
          }}
          className={`w-[64px] p-1 text-center rounded-md border-gray-600 shadow-sm ${textColor}`}
          style={{backgroundColor: isDone ? '#ffffff' : '#18181b', color: isDone ? '#0a0a0a' : '#fafafa'}}
        />
      </div>
      <div className="col-span-1 flex justify-center">
        <input
          type="checkbox"
          checked={isMaxMode}
          onChange={handleToggleMax}
          aria-label="Подход в отказ (макс.)"
          className="h-6 w-6 rounded-md border border-gray-300 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          style={{ accentColor: '#000000', color: '#0a0a0a' }}
        />
      </div>
       {isSaving && <div className="absolute right-2 top-2 h-2 w-2 bg-blue-500 rounded-full animate-ping"></div>}
    </div>
  );
};