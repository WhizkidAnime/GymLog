import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useDebounce } from './useDebounce';
import { workoutCache } from './use-workout-data';
import type { Workout } from '../types/database.types';

type UseWorkoutNotesProps = {
  user: { id: string } | null;
  normalizedDate: string | null;
  workout: Workout | null;
  workoutNotes: string;
  setIsSavingNotes: (next: boolean) => void;
};

export function useWorkoutNotes({
  user,
  normalizedDate,
  workout,
  workoutNotes,
  setIsSavingNotes,
}: UseWorkoutNotesProps) {
  const db = supabase as any;
  const debouncedNotes = useDebounce(workoutNotes, 800);
  const initialNotesRef = useRef<string | null>(null);
  const hasUserEditedRef = useRef(false);

  // Сбрасываем флаги при смене тренировки
  useEffect(() => {
    initialNotesRef.current = workout?.notes ?? '';
    hasUserEditedRef.current = false;
  }, [workout?.id]);

  // Отслеживаем, редактировал ли пользователь заметку
  useEffect(() => {
    if (initialNotesRef.current !== null && workoutNotes !== initialNotesRef.current) {
      hasUserEditedRef.current = true;
    }
  }, [workoutNotes]);

  useEffect(() => {
    if (!user || !normalizedDate || !workout) return;
    if (debouncedNotes === (workout.notes ?? '')) return;
    // Не сохраняем, если пользователь не редактировал заметку
    if (!hasUserEditedRef.current) return;

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
  }, [debouncedNotes, user, normalizedDate, workout?.id, workout?.notes, setIsSavingNotes]);
}
