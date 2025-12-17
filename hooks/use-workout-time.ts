import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Workout } from '../types/database.types';
import type { User } from '@supabase/supabase-js';

interface UseWorkoutTimeProps {
  user: User | null;
  workout: Workout | null;
  setWorkout: (workout: Workout | null) => void;
}

export function useWorkoutTime({ user, workout, setWorkout }: UseWorkoutTimeProps) {
  const db = supabase as any;

  const handleStartWorkout = useCallback(async () => {
    if (!user || !workout) return;

    const now = new Date().toISOString();

    const { error } = await db
      .from('workouts')
      .update({ start_time: now })
      .eq('id', workout.id);

    if (error) {
      console.error('Error starting workout:', error);
      return;
    }

    setWorkout({ ...workout, start_time: now });
  }, [user, workout, setWorkout, db]);

  const handleEndWorkout = useCallback(async () => {
    if (!user || !workout) return;

    const now = new Date().toISOString();

    const { error } = await db
      .from('workouts')
      .update({ end_time: now })
      .eq('id', workout.id);

    if (error) {
      console.error('Error ending workout:', error);
      return;
    }

    setWorkout({ ...workout, end_time: now });
  }, [user, workout, setWorkout, db]);

  const handleUpdateStartTime = useCallback(async (newTime: string) => {
    if (!user || !workout) return;

    const { error } = await db
      .from('workouts')
      .update({ start_time: newTime })
      .eq('id', workout.id);

    if (error) {
      console.error('Error updating start time:', error);
      return;
    }

    setWorkout({ ...workout, start_time: newTime });
  }, [user, workout, setWorkout, db]);

  const handleUpdateEndTime = useCallback(async (newTime: string) => {
    if (!user || !workout) return;

    const { error } = await db
      .from('workouts')
      .update({ end_time: newTime })
      .eq('id', workout.id);

    if (error) {
      console.error('Error updating end time:', error);
      return;
    }

    setWorkout({ ...workout, end_time: newTime });
  }, [user, workout, setWorkout, db]);

  const handleClearWorkoutTime = useCallback(async () => {
    if (!user || !workout) return;

    const { error } = await db
      .from('workouts')
      .update({ start_time: null, end_time: null })
      .eq('id', workout.id);

    if (error) {
      console.error('Error clearing workout time:', error);
      return;
    }

    setWorkout({ ...workout, start_time: null, end_time: null });
  }, [user, workout, setWorkout, db]);

  return {
    startTime: workout?.start_time ?? null,
    endTime: workout?.end_time ?? null,
    handleStartWorkout,
    handleEndWorkout,
    handleUpdateStartTime,
    handleUpdateEndTime,
    handleClearWorkoutTime,
  };
}
