import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getTranslations } from './use-i18n';
import { workoutCache } from './use-workout-data';
import type { Workout, WorkoutExerciseWithSets } from '../types/database.types';
import type { WorkoutIconType } from '../components/workout-icons';

type UseWorkoutNameEditorProps = {
  user: { id: string } | null;
  normalizedDate: string | null;
  workout: Workout | null;
  exercises: WorkoutExerciseWithSets[];
  workoutName: string;
  workoutIcon: WorkoutIconType | null;
  setWorkout: (next: Workout | null) => void;
  setWorkoutName: (next: string) => void;
  setIsSavingWorkoutName: (next: boolean) => void;
};

export function useWorkoutNameEditor({
  user,
  normalizedDate,
  workout,
  exercises,
  workoutName,
  workoutIcon,
  setWorkout,
  setWorkoutName,
  setIsSavingWorkoutName,
}: UseWorkoutNameEditorProps) {
  const db = supabase as any;
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(workoutName);
  const [editIconValue, setEditIconValue] = useState<WorkoutIconType | null>(workoutIcon);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleStartEditName = useCallback(() => {
    setEditNameValue(workoutName);
    setEditIconValue(workoutIcon);
    setIsEditingName(true);
  }, [workoutName, workoutIcon]);

  const handleSaveEditName = useCallback(async () => {
    if (!user || !normalizedDate || !workout) return;
    const trimmedName = editNameValue.trim();

    if (trimmedName.length === 0) {
      setEditNameValue(workoutName);
      setEditIconValue(workoutIcon);
      setIsEditingName(false);
      return;
    }

    const nameChanged = trimmedName !== workout.name;
    const iconChanged = editIconValue !== (workout.icon as WorkoutIconType | null);

    if (!nameChanged && !iconChanged) {
      setIsEditingName(false);
      return;
    }

    setIsSavingWorkoutName(true);

    try {
      const updateData: { name?: string; icon?: string | null } = {};
      if (nameChanged) updateData.name = trimmedName;
      if (iconChanged) updateData.icon = editIconValue;

      const { data: updatedWorkout, error } = await db
        .from('workouts')
        .update(updateData)
        .eq('id', workout.id)
        .select()
        .single();

      if (error) throw error;
      if (!updatedWorkout) throw new Error(getTranslations().hooks.failedToUpdateWorkout);

      setWorkout(updatedWorkout as Workout);
      setEditNameValue(trimmedName);
      setEditIconValue((updatedWorkout as Workout).icon as WorkoutIconType | null);
      setIsEditingName(false);

      const cacheKey = `${user.id}:${normalizedDate}`;
      workoutCache.set(cacheKey, {
        workout: updatedWorkout as Workout,
        exercises,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error('Failed to update workout:', error);
      alert(getTranslations().hooks.failedToSaveChanges);
    } finally {
      setIsSavingWorkoutName(false);
    }
  }, [user, normalizedDate, workout, exercises, editNameValue, editIconValue, workoutName, workoutIcon, setWorkout, setIsSavingWorkoutName]);

  const handleCancelEditName = useCallback(() => {
    setEditNameValue(workoutName);
    setEditIconValue(workoutIcon);
    setIsEditingName(false);
  }, [workoutName, workoutIcon]);

  const handleOpenIconPicker = useCallback(() => {
    setIsIconPickerOpen(true);
  }, []);

  const handleIconChange = useCallback((icon: WorkoutIconType | null) => {
    setEditIconValue(icon);
  }, []);

  const handleSaveWorkoutName = useCallback(async () => {
    if (!user || !normalizedDate || !workout) return;
    const trimmedName = workoutName.trim();

    if (trimmedName.length === 0) {
      setWorkoutName(workout.name);
      return;
    }

    if (trimmedName === workout.name) {
      return;
    }

    setIsSavingWorkoutName(true);

    try {
      const { data: updatedWorkout, error } = await db
        .from('workouts')
        .update({ name: trimmedName })
        .eq('id', workout.id)
        .select()
        .single();

      if (error) throw error;
      if (!updatedWorkout) throw new Error(getTranslations().hooks.failedToUpdateWorkoutName);

      setWorkout(updatedWorkout as Workout);

      const cacheKey = `${user.id}:${normalizedDate}`;
      workoutCache.set(cacheKey, {
        workout: updatedWorkout as Workout,
        exercises,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error('Failed to update workout name:', error);
      alert(getTranslations().hooks.failedToSaveName);
      setWorkoutName(workout.name);
    } finally {
      setIsSavingWorkoutName(false);
    }
  }, [user, normalizedDate, workout, exercises, workoutName, setWorkout, setWorkoutName, setIsSavingWorkoutName]);

  const handleWorkoutNameKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
  }, []);

  return {
    inputRef,
    isEditingName,
    editNameValue,
    editIconValue,
    isIconPickerOpen,
    setIsIconPickerOpen,
    setEditNameValue,
    handleStartEditName,
    handleSaveEditName,
    handleCancelEditName,
    handleOpenIconPicker,
    handleIconChange,
    handleSaveWorkoutName,
    handleWorkoutNameKeyDown,
  };
}
