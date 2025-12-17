import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDebounce } from '../hooks/useDebounce';
import type { WorkoutSet } from '../types/database.types';

interface WarmupSetRowProps {
  set: WorkoutSet;
  displayIndex: number;
  onChange?: (updated: WorkoutSet) => void;
  onDelete?: (setId: string) => void;
}

const WarmupSetRowComponent: React.FC<WarmupSetRowProps> = ({
  set,
  displayIndex,
  onChange,
  onDelete,
}) => {
  const storageKey = `workout_set_draft:${set.id}`;
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

  const normalizeRepsInput = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === '') return '';
    const digitsOnly = trimmed.replace(/[^0-9]/g, '');
    return digitsOnly;
  };

  const [weight, setWeight] = useState<string>(toDisplay(set.weight));
  const [reps, setReps] = useState<string>(set.reps ?? '');
  const [isDone, setIsDone] = useState<boolean>(set.is_done);
  const [isSaving, setIsSaving] = useState(false);

  const debouncedWeight = useDebounce(weight, 500);
  const debouncedReps = useDebounce(reps, 500);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { weight: number | ''; reps: string | null; isDone: boolean; updatedAt: number };
      const dbUpdatedAt = new Date(set.updated_at).getTime();
      if (draft.updatedAt > dbUpdatedAt) {
        setWeight(draft.weight === '' ? '' : toDisplay(draft.weight as number));
        setReps(draft.reps ?? '');
        setIsDone(draft.isDone);
      }
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setIsDone(set.is_done);
  }, [set.is_done]);

  const onChangeRef = React.useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const saveSet = async () => {
      const weightNum = toNumber(debouncedWeight as string);
      const repsForDb = debouncedReps.trim() === '' ? null : debouncedReps.trim();
      if (weightNum !== (set.weight ?? null) || repsForDb !== (set.reps ?? null) || isDone !== set.is_done) {
        const draft = { weight: weightNum === null ? '' : weightNum, reps: repsForDb, isDone, updatedAt: Date.now() };
        try { localStorage.setItem(storageKey, JSON.stringify(draft)); } catch {}

        setIsSaving(true);
        const { error } = await (supabase as any)
          .from('workout_sets')
          .update({
            weight: weightNum,
            reps: repsForDb,
            is_done: isDone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', set.id);

        if (error) {
          console.error('Error saving warmup set:', error);
        } else {
          try { localStorage.removeItem(storageKey); } catch {}
          const updatedSet: WorkoutSet = {
            ...set,
            weight: weightNum,
            reps: repsForDb,
            is_done: isDone,
            updated_at: new Date().toISOString(),
          };
          onChangeRef.current?.(updatedSet);
        }
        setTimeout(() => setIsSaving(false), 500);
      }
    };
    saveSet();
  }, [debouncedWeight, debouncedReps, set.id, set.weight, set.reps, set.is_done, isDone, storageKey]);

  useEffect(() => {
    const hasWeight = toNumber(debouncedWeight as string) !== null;
    const hasReps = debouncedReps.trim() !== '';
    const shouldBeDone = hasWeight && hasReps;

    if (shouldBeDone && !isDone) {
      setIsDone(true);
    } else if (!shouldBeDone && isDone) {
      setIsDone(false);
    }
  }, [debouncedWeight, debouncedReps, isDone]);

  const doneBg = isDone ? 'bg-sky-400/80' : 'bg-transparent';
  const textColor = isDone ? 'text-black' : 'text-inherit';
  const inputBgClass = isDone ? 'setrow-input-done-white' : '';

  return (
    <div className={`relative grid grid-cols-6 gap-3 items-center p-2 rounded-md transition-colors duration-300 ${doneBg}`}>
      <div className={`col-span-1 text-center font-medium ${textColor} flex items-center justify-start pl-1 sm:pl-2`}>
        <span>{displayIndex}</span>
      </div>
      <div className="col-span-2 flex justify-center">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={weight}
          onChange={(e) => setWeight(normalizeInput(e.target.value))}
          className={`w-[72px] p-1 text-center rounded-md border-gray-600 shadow-sm placeholder:text-gray-400 focus:placeholder-transparent outline-none focus-visible:outline-none setrow-input ${inputBgClass} ${textColor}`}
        />
      </div>
      <div className="col-span-2 flex justify-center">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="0"
          value={reps}
          onChange={(e) => setReps(normalizeRepsInput(e.target.value))}
          className={`w-[64px] p-1 text-center rounded-md border-gray-600 shadow-sm placeholder:text-gray-400 focus:placeholder-transparent outline-none focus-visible:outline-none setrow-input ${inputBgClass} ${textColor}`}
        />
      </div>
      <div className="col-span-1 flex items-center justify-end pr-1 sm:pr-2">
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(set.id)}
            className={`warmup-delete-btn w-6 h-6 flex items-center justify-center rounded transition-colors flex-shrink-0 ${isDone ? 'hover:bg-black/10 text-black/70' : 'hover:bg-white/20 text-white/70'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      {isSaving && <div className="absolute right-2 top-2 h-2 w-2 bg-blue-500 rounded-full animate-ping"></div>}
    </div>
  );
};

export const WarmupSetRow = React.memo(WarmupSetRowComponent, (prevProps, nextProps) => {
  return (
    prevProps.set.id === nextProps.set.id &&
    prevProps.set.weight === nextProps.set.weight &&
    prevProps.set.reps === nextProps.set.reps &&
    prevProps.set.is_done === nextProps.set.is_done &&
    prevProps.set.updated_at === nextProps.set.updated_at &&
    prevProps.displayIndex === nextProps.displayIndex &&
    prevProps.onDelete === nextProps.onDelete
  );
});
