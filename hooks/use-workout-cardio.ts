import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getTranslations } from './use-i18n';
import { workoutCache } from './use-workout-data';
import type { Workout, WorkoutExerciseWithSets } from '../types/database.types';

type UseWorkoutCardioProps = {
  user: { id: string } | null;
  normalizedDate: string | null;
  workout: Workout | null;
  exercises: WorkoutExerciseWithSets[];
  isCardio: boolean;
  setIsCardio: (next: boolean) => void;
  setIsSavingCardio: (next: boolean) => void;
  setWorkout: (next: Workout | null) => void;
};

export function useWorkoutCardio({
  user,
  normalizedDate,
  workout,
  exercises,
  isCardio,
  setIsCardio,
  setIsSavingCardio,
  setWorkout,
}: UseWorkoutCardioProps) {
  const db = supabase as any;

  const handleToggleCardio = useCallback(async () => {
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

      if (error) throw error;
      if (!updatedWorkout) throw new Error(getTranslations().hooks.failedToUpdateCardio);

      setWorkout(updatedWorkout as Workout);

      const cacheKey = `${user.id}:${normalizedDate}`;
      workoutCache.set(cacheKey, {
        workout: updatedWorkout as Workout,
        exercises,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error('Failed to update cardio status:', error);
      alert(getTranslations().hooks.failedToSaveCardio);
      setIsCardio(!newCardioState);
    } finally {
      setIsSavingCardio(false);
    }
  }, [user, normalizedDate, workout, exercises, isCardio, setIsCardio, setIsSavingCardio, setWorkout]);

  return { handleToggleCardio };
}
