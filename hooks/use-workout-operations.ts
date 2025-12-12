import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { workoutCache } from './use-workout-data';
import type {
  Workout,
  WorkoutTemplate,
  WorkoutExerciseWithSets,
  WorkoutExercisePositionUpdate,
} from '../types/database.types';
import type { WorkoutIconType } from '../components/workout-icons';
import type { ReorderItem } from '../components/ReorderExercisesModal';

type UseWorkoutOperationsProps = {
  user: { id: string } | null;
  normalizedDate: string | null;
  workout: Workout | null;
  exercises: WorkoutExerciseWithSets[];
  setPageState: React.Dispatch<React.SetStateAction<any>>;
  setWorkout: (next: Workout | null) => void;
  setExercises: (next: WorkoutExerciseWithSets[] | ((prev: WorkoutExerciseWithSets[]) => WorkoutExerciseWithSets[])) => void;
  setIsCreating: (next: boolean) => void;
  setIsAddingExercise: (next: boolean) => void;
  setWorkoutName: (next: string) => void;
  setIsSelectTemplateOpen: (next: boolean) => void;
  fetchWorkoutData: () => Promise<void>;
  isAddingExercise: boolean;
};

export function useWorkoutOperations({
  user,
  normalizedDate,
  workout,
  exercises,
  setPageState,
  setWorkout,
  setExercises,
  setIsCreating,
  setIsAddingExercise,
  setWorkoutName,
  setIsSelectTemplateOpen,
  fetchWorkoutData,
  isAddingExercise,
}: UseWorkoutOperationsProps) {
  const navigate = useNavigate();
  const db = supabase as any;

  const handleUpdateExercise = useCallback((updatedExercise: WorkoutExerciseWithSets) => {
    setPageState((prev: any) => {
      const updatedExercises = prev.exercises.map((ex: WorkoutExerciseWithSets) => 
        ex.id === updatedExercise.id ? updatedExercise : ex
      );

      if (user && normalizedDate && prev.workout) {
        const cacheKey = `${user.id}:${normalizedDate}`;
        workoutCache.set(cacheKey, {
          workout: prev.workout,
          exercises: updatedExercises,
          timestamp: Date.now(),
        });
      }

      return { ...prev, exercises: updatedExercises };
    });
  }, [user, normalizedDate, setPageState]);

  const handleDeleteExercise = useCallback((exerciseId: number) => {
    setPageState((prev: any) => {
      const filtered = prev.exercises.filter((ex: WorkoutExerciseWithSets) => String(ex.id) !== String(exerciseId));
      if (user && normalizedDate && prev.workout) {
        const cacheKey = `${user.id}:${normalizedDate}`;
        workoutCache.set(cacheKey, {
          workout: prev.workout,
          exercises: filtered,
          timestamp: Date.now(),
        });
      }
      return { ...prev, exercises: filtered };
    });
  }, [user, normalizedDate, setPageState]);

  const handleAddExercise = useCallback(async () => {
    if (!user || !normalizedDate || !workout || isAddingExercise) return;
    setIsAddingExercise(true);

    try {
      const nextPosition = exercises.length > 0
        ? Math.max(...exercises.map(ex => (typeof ex.position === 'number' ? ex.position : 0))) + 1
        : 1;

      const { data: insertedExercises, error: insertExerciseError } = await db
        .from('workout_exercises')
        .insert({
          workout_id: workout.id,
          name: '',
          sets: 1,
          reps: '',
          rest_seconds: 150,
          position: nextPosition,
        })
        .select('id, name, sets, reps, rest_seconds, position, workout_id');

      if (insertExerciseError) throw insertExerciseError;

      const insertedExercise = insertedExercises?.[0];
      if (!insertedExercise) throw new Error('Не удалось создать упражнение');

      const { data: insertedSets, error: insertSetError } = await db
        .from('workout_sets')
        .insert({
          workout_exercise_id: insertedExercise.id,
          set_index: 1,
          weight: null,
          reps: null,
          is_done: false,
          is_dropset: false,
          updated_at: new Date().toISOString(),
        })
        .select('id, workout_exercise_id, set_index, weight, reps, is_done, is_dropset, updated_at');

      if (insertSetError) throw insertSetError;

      const insertedSet = insertedSets?.[0];
      if (!insertedSet) throw new Error('Не удалось создать подход');

      const newExerciseWithSets: WorkoutExerciseWithSets = {
        ...insertedExercise,
        workout_sets: [insertedSet],
      };

      setPageState((prev: any) => {
        if (!prev.workout) return prev;

        const updatedExercises = [...prev.exercises, newExerciseWithSets].sort((a, b) => a.position - b.position);

        if (user && normalizedDate) {
          const cacheKey = `${user.id}:${normalizedDate}`;
          const cached = workoutCache.get(cacheKey);
          if (cached) {
            workoutCache.set(cacheKey, {
              workout: cached.workout,
              exercises: updatedExercises,
              timestamp: Date.now(),
            });
          }
        }

        return { ...prev, exercises: updatedExercises };
      });
    } catch (error: any) {
      console.error('Failed to add exercise:', error);
      alert('Не удалось добавить упражнение. Попробуйте снова.');
    } finally {
      setIsAddingExercise(false);
    }
  }, [user, normalizedDate, workout, exercises, isAddingExercise, setPageState, setIsAddingExercise]);

  const handleCreateCustomWorkout = useCallback(async () => {
    if (!user || !normalizedDate) return;
    setIsCreating(true);

    try {
      const { data: newWorkout, error } = await db
        .from('workouts')
        .insert({
          user_id: user.id,
          workout_date: normalizedDate,
          name: 'Новая тренировка',
          template_id: null,
        })
        .select()
        .single();

      if (error) throw error;
      if (!newWorkout) throw new Error('Не удалось создать тренировку');

      setWorkout(newWorkout as Workout);
      setExercises([]);
      setWorkoutName((newWorkout as Workout).name);

      const cacheKey = `${user.id}:${normalizedDate}`;
      workoutCache.set(cacheKey, {
        workout: newWorkout as Workout,
        exercises: [],
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error('Failed to create custom workout:', error);
      alert('Не удалось создать тренировку. Попробуйте снова.');
    } finally {
      setIsCreating(false);
    }
  }, [user, normalizedDate, setIsCreating, setWorkout, setExercises, setWorkoutName]);

  const handleCreateWorkout = useCallback(async (template: WorkoutTemplate) => {
    if (!user || !normalizedDate) return;
    setIsCreating(true);

    try {
      const [
        { data: templateExercises },
        { data: templateRow },
      ] = await Promise.all([
        db
          .from('template_exercises')
          .select('*')
          .eq('template_id', template.id),
        db
          .from('workout_templates')
          .select('id, name, icon')
          .eq('id', template.id)
          .single(),
      ]);

      const templateIcon = (templateRow as any)?.icon ?? (template as any).icon ?? null;
      const templateName = (templateRow as any)?.name ?? template.name;

      const { data: newWorkout } = await db
        .from('workouts')
        .insert({
          user_id: user.id,
          workout_date: normalizedDate,
          name: templateName,
          template_id: template.id,
          icon: templateIcon,
        })
        .select()
        .single();
      
      if (!newWorkout) throw new Error("Failed to create workout entry.");

      const newWorkoutExercises = (templateExercises || []).map((ex: any) => ({
        workout_id: newWorkout.id,
        name: ex.name, sets: ex.sets, reps: ex.reps, rest_seconds: ex.rest_seconds, position: ex.position,
      }));

      const { data: insertedExercises } = await db
        .from('workout_exercises')
        .insert(newWorkoutExercises)
        .select();

      if (!insertedExercises) throw new Error("Failed to create workout exercises.");

      const newSets = insertedExercises.flatMap((ex: any) => 
        Array.from({ length: ex.sets }, (_, i) => ({
          workout_exercise_id: ex.id, set_index: i + 1,
        }))
      );
      
      await db.from('workout_sets').insert(newSets);
      
      const cacheKey = `${user.id}:${normalizedDate}`;
      workoutCache.delete(cacheKey);
      
      await fetchWorkoutData();

    } catch (error: any) {
      console.error('Failed to create workout from template:', error);
      alert(`Не удалось создать тренировку: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  }, [user, normalizedDate, setIsCreating, fetchWorkoutData]);

  const handleReplaceWithTemplate = useCallback(async (template: WorkoutTemplate) => {
    if (!user || !normalizedDate || !workout) return;
    try {
      setIsCreating(true);

      const [
        { data: templateExercises, error: tErr },
        { data: templateRow, error: templateErr },
      ] = await Promise.all([
        db
          .from('template_exercises')
          .select('*')
          .eq('template_id', template.id),
        db
          .from('workout_templates')
          .select('id, name, icon')
          .eq('id', template.id)
          .single(),
      ]);
      if (tErr) throw tErr;
      if (templateErr) throw templateErr;

      const { data: existingExercises, error: exErr } = await db
        .from('workout_exercises')
        .select('id')
        .eq('workout_id', workout.id);
      if (exErr) throw exErr;

      const existingExerciseIds = (existingExercises || []).map((e: any) => e.id);

      if (existingExerciseIds.length > 0) {
        const { error: setsDelErr } = await db
          .from('workout_sets')
          .delete()
          .in('workout_exercise_id', existingExerciseIds);
        if (setsDelErr) throw setsDelErr;

        const { error: exDelErr } = await db
          .from('workout_exercises')
          .delete()
          .eq('workout_id', workout.id);
        if (exDelErr) throw exDelErr;
      }

      const templateIcon = (templateRow as any)?.icon ?? (template as any).icon ?? null;
      const templateName = (templateRow as any)?.name ?? template.name;
      const { error: updErr } = await db
        .from('workouts')
        .update({ name: templateName, template_id: template.id, icon: templateIcon })
        .eq('id', workout.id);
      if (updErr) throw updErr;

      const newWorkoutExercises = (templateExercises || []).map((ex: any) => ({
        workout_id: workout.id,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        position: ex.position,
      }));

      const { data: insertedExercises, error: insErr } = await db
        .from('workout_exercises')
        .insert(newWorkoutExercises)
        .select();
      if (insErr) throw insErr;

      const newSets = (insertedExercises || []).flatMap((ex: any) =>
        Array.from({ length: ex.sets }, (_, i) => ({
          workout_exercise_id: ex.id,
          set_index: i + 1,
        }))
      );
      if (newSets.length > 0) {
        const { error: setsInsErr } = await db.from('workout_sets').insert(newSets);
        if (setsInsErr) throw setsInsErr;
      }

      const cacheKey = `${user.id}:${normalizedDate}`;
      workoutCache.delete(cacheKey);

      setIsSelectTemplateOpen(false);
      await fetchWorkoutData();
    } catch (error: any) {
      console.error('Failed to replace workout from template:', error);
      alert(`Не удалось изменить тренировку: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  }, [user, normalizedDate, workout, setIsCreating, setIsSelectTemplateOpen, fetchWorkoutData]);

  const handleDeleteWorkout = useCallback(async () => {
    if (!workout) return;
    const { error } = await db
      .from('workouts')
      .delete()
      .eq('id', workout.id);

    if (error) {
      console.error('Error deleting workout:', error);
      alert('Не удалось удалить тренировку.');
      return;
    }

    if (user && normalizedDate) {
      const cacheKey = `${user.id}:${normalizedDate}`;
      workoutCache.delete(cacheKey);
    }
    navigate('/calendar', { state: { removedDate: normalizedDate } });
  }, [workout, user, normalizedDate, navigate]);

  const handleSaveNewOrder = useCallback(async (ordered: ReorderItem[]) => {
    if (!user || !workout) return;

    const posById = new Map<string, number>(ordered.map((it, idx) => [it.id, idx + 1]));
    setExercises(prev => {
      const next = prev.map(ex => ({ ...ex, position: posById.get(ex.id) ?? ex.position }));
      next.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      return next;
    });

    const payload: WorkoutExercisePositionUpdate[] = ordered.map((it, idx) => ({
      id: it.id,
      position: idx + 1,
    }));

    try {
      await Promise.all(
        payload.map(async p => {
          const { error } = await db
            .from('workout_exercises')
            .update({ position: p.position })
            .eq('id', p.id);

          if (error) throw error;
        })
      );

      if (user && normalizedDate) {
        const cacheKey = `${user.id}:${normalizedDate}`;
        const cached = workoutCache.get(cacheKey);
        if (cached) {
          const reordered = [...cached.exercises]
            .map(e => ({ ...e, position: posById.get(e.id) ?? e.position }))
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          workoutCache.set(cacheKey, {
            workout: cached.workout,
            exercises: reordered,
            timestamp: Date.now(),
          });
        }
      }
    } catch (e) {
      console.error('Failed to save new order:', e);
      alert('Не удалось сохранить порядок. Я вернул предыдущие данные.');
      await fetchWorkoutData();
    }
  }, [user, workout, normalizedDate, setExercises, fetchWorkoutData]);

  return {
    handleUpdateExercise,
    handleDeleteExercise,
    handleAddExercise,
    handleCreateCustomWorkout,
    handleCreateWorkout,
    handleReplaceWithTemplate,
    handleDeleteWorkout,
    handleSaveNewOrder,
  };
}
