import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDebounce } from '../hooks/useDebounce';
import type { WorkoutSet } from '../types/database.types';

interface SetRowProps {
  set: WorkoutSet;
}

export const SetRow: React.FC<SetRowProps> = ({ set }) => {
  const [weight, setWeight] = useState(set.weight ?? '');
  const [reps, setRps] = useState(set.reps ?? '');
  const [isDone, setIsDone] = useState(set.is_done);
  const [isSaving, setIsSaving] = useState(false);

  const debouncedWeight = useDebounce(weight, 500);
  const debouncedReps = useDebounce(reps, 500);
  
  // Sync local state if the prop changes from the parent
  useEffect(() => {
    setIsDone(set.is_done);
  }, [set.is_done]);
  
  useEffect(() => {
    const saveSet = async () => {
        // Only save if there's an actual change from the initial debounced value
        if (debouncedWeight !== (set.weight ?? '') || debouncedReps !== (set.reps ?? '')) {
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
              console.error("Error saving set:", error);
            }
            setTimeout(() => setIsSaving(false), 500); // Visual feedback
        }
    };
    saveSet();
  }, [debouncedWeight, debouncedReps, set.id, set.weight, set.reps]);

  const handleDoneToggle = async () => {
    const newDoneState = !isDone;
    setIsDone(newDoneState);
    setIsSaving(true);
    const { error } = await supabase
      .from('workout_sets')
      .update({ is_done: newDoneState, updated_at: new Date().toISOString() })
      .eq('id', set.id);
    if (error) {
      console.error("Error updating done status:", error);
      setIsDone(!newDoneState); // Revert on error
    }
    setTimeout(() => setIsSaving(false), 500);
  };
  
  return (
    <div className={`relative grid grid-cols-5 gap-2 items-center p-2 rounded-md transition-colors duration-300 ${isDone ? 'bg-green-100' : 'bg-transparent'}`}>
      <div className="col-span-1 text-center font-medium">{set.set_index}</div>
      <div className="col-span-2">
        <input
          type="number"
          step="0.25"
          placeholder="0"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="w-full p-1 text-center rounded-md border-gray-600 shadow-sm"
          style={{backgroundColor:'#18181b', color:'#fafafa'}}
        />
      </div>
      <div className="col-span-1">
        <input
          type="text"
          placeholder="0"
          value={reps}
          onChange={(e) => setRps(e.target.value)}
          className="w-full p-1 text-center rounded-md border-gray-600 shadow-sm"
          style={{backgroundColor:'#18181b', color:'#fafafa'}}
        />
      </div>
      <div className="col-span-1 flex justify-center">
        <input
          type="checkbox"
          checked={isDone}
          onChange={handleDoneToggle}
          className="h-6 w-6 rounded-full text-blue-600 focus:ring-blue-500 border-gray-300"
        />
      </div>
       {isSaving && <div className="absolute right-2 top-2 h-2 w-2 bg-blue-500 rounded-full animate-ping"></div>}
    </div>
  );
};