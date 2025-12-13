import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getTranslations } from './use-i18n';

export type WorkoutDateGroup = {
  date: string;
  workoutIds: string[];
  count: number;
};

export type TemplateForDeletion = {
  id: string;
  name: string;
};

export type UseDataCleanupProps = {
  userId: string | undefined;
  setToastVariant: (variant: 'success' | 'error') => void;
  setImportSuccessMessage: (msg: string | null) => void;
  setIsImportSuccessOpen: (open: boolean) => void;
};

export type UseDataCleanupReturn = {
  // Clean data dialog
  isCleanDataDialogOpen: boolean;
  setIsCleanDataDialogOpen: (open: boolean) => void;

  // Delete workouts
  isDeleteWorkoutsDialogOpen: boolean;
  isLoadingWorkoutsForDeletion: boolean;
  workoutDateGroups: WorkoutDateGroup[];
  selectedWorkoutDates: string[];
  isDeletingWorkouts: boolean;
  areAllWorkoutDatesSelected: boolean;

  // Delete templates
  isDeleteTemplatesDialogOpen: boolean;
  isLoadingTemplatesForDeletion: boolean;
  templatesForDeletion: TemplateForDeletion[];
  selectedTemplateIds: string[];
  isDeletingTemplates: boolean;
  areAllTemplatesSelected: boolean;

  // Workouts actions
  openDeleteWorkoutsDialog: () => Promise<void>;
  toggleWorkoutDateSelection: (date: string) => void;
  selectAllWorkoutDates: () => void;
  clearWorkoutSelection: () => void;
  handleDeleteSelectedWorkouts: () => Promise<void>;
  closeDeleteWorkoutsDialog: () => void;

  // Templates actions
  openDeleteTemplatesDialog: () => Promise<void>;
  toggleTemplateSelection: (id: string) => void;
  selectAllTemplates: () => void;
  clearTemplateSelection: () => void;
  handleDeleteSelectedTemplates: () => Promise<void>;
  closeDeleteTemplatesDialog: () => void;
};

export function useDataCleanup({
  userId,
  setToastVariant,
  setImportSuccessMessage,
  setIsImportSuccessOpen,
}: UseDataCleanupProps): UseDataCleanupReturn {
  const db = supabase as any;

  const [isCleanDataDialogOpen, setIsCleanDataDialogOpen] = useState(false);

  // Workouts deletion state
  const [isDeleteWorkoutsDialogOpen, setIsDeleteWorkoutsDialogOpen] = useState(false);
  const [isLoadingWorkoutsForDeletion, setIsLoadingWorkoutsForDeletion] = useState(false);
  const [workoutDateGroups, setWorkoutDateGroups] = useState<WorkoutDateGroup[]>([]);
  const [selectedWorkoutDates, setSelectedWorkoutDates] = useState<string[]>([]);
  const [isDeletingWorkouts, setIsDeletingWorkouts] = useState(false);

  // Templates deletion state
  const [isDeleteTemplatesDialogOpen, setIsDeleteTemplatesDialogOpen] = useState(false);
  const [isLoadingTemplatesForDeletion, setIsLoadingTemplatesForDeletion] = useState(false);
  const [templatesForDeletion, setTemplatesForDeletion] = useState<TemplateForDeletion[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [isDeletingTemplates, setIsDeletingTemplates] = useState(false);

  const areAllWorkoutDatesSelected =
    workoutDateGroups.length > 0 && selectedWorkoutDates.length === workoutDateGroups.length;

  const areAllTemplatesSelected =
    templatesForDeletion.length > 0 && selectedTemplateIds.length === templatesForDeletion.length;

  const openDeleteWorkoutsDialog = useCallback(async () => {
    if (!userId || isLoadingWorkoutsForDeletion) return;

    setIsLoadingWorkoutsForDeletion(true);
    setSelectedWorkoutDates([]);

    try {
      const { data, error } = await db
        .from('workouts')
        .select('id, workout_date')
        .eq('user_id', userId)
        .order('workout_date', { ascending: false });

      if (error) {
        console.error('Error loading workouts for deletion:', error);
        alert(getTranslations().hooks.failedToLoadWorkoutsForDeletion);
        return;
      }

      const groupsMap = new Map<string, string[]>();
      (data || []).forEach((w: any) => {
        const date = w.workout_date as string | null;
        const id = w.id as string | null;
        if (!date || !id) return;
        if (!groupsMap.has(date)) {
          groupsMap.set(date, []);
        }
        groupsMap.get(date)!.push(id);
      });

      const groups: WorkoutDateGroup[] = Array.from(groupsMap.entries())
        .map(([date, workoutIds]) => ({
          date,
          workoutIds,
          count: workoutIds.length,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));

      if (groups.length === 0) {
        setToastVariant('error');
        setImportSuccessMessage(getTranslations().hooks.noWorkoutsToDelete);
        setIsImportSuccessOpen(true);
        return;
      }

      setWorkoutDateGroups(groups);
      setIsCleanDataDialogOpen(false);
      setIsDeleteWorkoutsDialogOpen(true);
    } catch (error) {
      console.error('Unexpected error while loading workouts for deletion:', error);
      alert(getTranslations().hooks.errorLoadingWorkoutsForDeletion);
    } finally {
      setIsLoadingWorkoutsForDeletion(false);
    }
  }, [userId, isLoadingWorkoutsForDeletion, db, setToastVariant, setImportSuccessMessage, setIsImportSuccessOpen]);

  const openDeleteTemplatesDialog = useCallback(async () => {
    if (!userId || isLoadingTemplatesForDeletion) return;

    setIsLoadingTemplatesForDeletion(true);
    setSelectedTemplateIds([]);

    try {
      const { data, error } = await db
        .from('workout_templates')
        .select('id, name')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading templates for deletion:', error);
        alert(getTranslations().hooks.failedToLoadTemplatesForDeletion);
        return;
      }

      const list: TemplateForDeletion[] = (data || []).map((t: any) => ({
        id: t.id as string,
        name: (t.name as string) || getTranslations().hooks.noName,
      }));

      if (list.length === 0) {
        setToastVariant('error');
        setImportSuccessMessage(getTranslations().hooks.noTemplatesToDelete);
        setIsImportSuccessOpen(true);
        return;
      }

      setTemplatesForDeletion(list);
      setIsCleanDataDialogOpen(false);
      setIsDeleteTemplatesDialogOpen(true);
    } catch (error) {
      console.error('Unexpected error while loading templates for deletion:', error);
      alert(getTranslations().hooks.errorLoadingTemplatesForDeletion);
    } finally {
      setIsLoadingTemplatesForDeletion(false);
    }
  }, [userId, isLoadingTemplatesForDeletion, db, setToastVariant, setImportSuccessMessage, setIsImportSuccessOpen]);

  const toggleWorkoutDateSelection = useCallback((date: string) => {
    setSelectedWorkoutDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  }, []);

  const selectAllWorkoutDates = useCallback(() => {
    if (workoutDateGroups.length === 0) return;
    const allSelected = selectedWorkoutDates.length === workoutDateGroups.length;
    setSelectedWorkoutDates(allSelected ? [] : workoutDateGroups.map((g) => g.date));
  }, [workoutDateGroups, selectedWorkoutDates.length]);

  const clearWorkoutSelection = useCallback(() => {
    setSelectedWorkoutDates([]);
  }, []);

  const toggleTemplateSelection = useCallback((id: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const selectAllTemplates = useCallback(() => {
    if (templatesForDeletion.length === 0) return;
    const allSelected = selectedTemplateIds.length === templatesForDeletion.length;
    setSelectedTemplateIds(allSelected ? [] : templatesForDeletion.map((t) => t.id));
  }, [templatesForDeletion, selectedTemplateIds.length]);

  const clearTemplateSelection = useCallback(() => {
    setSelectedTemplateIds([]);
  }, []);

  const handleDeleteSelectedWorkouts = useCallback(async () => {
    if (!userId) return;
    if (selectedWorkoutDates.length === 0) return;

    const idsToDelete = workoutDateGroups
      .filter((g) => selectedWorkoutDates.includes(g.date))
      .flatMap((g) => g.workoutIds);

    if (idsToDelete.length === 0) return;

    setIsDeletingWorkouts(true);

    try {
      const { data: existingExercises, error: exErr } = await db
        .from('workout_exercises')
        .select('id, workout_id')
        .in('workout_id', idsToDelete);

      if (exErr) {
        throw exErr;
      }

      const existingExerciseIds = (existingExercises || []).map((e: any) => e.id as string);

      if (existingExerciseIds.length > 0) {
        const { error: setsDelErr } = await db
          .from('workout_sets')
          .delete()
          .in('workout_exercise_id', existingExerciseIds);
        if (setsDelErr) {
          throw setsDelErr;
        }
      }

      if (idsToDelete.length > 0) {
        const { error: exDelErr } = await db
          .from('workout_exercises')
          .delete()
          .in('workout_id', idsToDelete);
        if (exDelErr) {
          throw exDelErr;
        }

        const { error: workoutsDelErr } = await db
          .from('workouts')
          .delete()
          .in('id', idsToDelete);
        if (workoutsDelErr) {
          throw workoutsDelErr;
        }
      }

      setIsDeleteWorkoutsDialogOpen(false);
      setWorkoutDateGroups([]);
      setSelectedWorkoutDates([]);
      setToastVariant('success');
      setImportSuccessMessage(getTranslations().hooks.workoutsDeletedSuccess);
      setIsImportSuccessOpen(true);
    } catch (error: any) {
      console.error('Error deleting workouts:', error);
      setToastVariant('error');
      setImportSuccessMessage(getTranslations().hooks.failedToDeleteWorkouts);
      setIsImportSuccessOpen(true);
    } finally {
      setIsDeletingWorkouts(false);
    }
  }, [userId, selectedWorkoutDates, workoutDateGroups, db, setToastVariant, setImportSuccessMessage, setIsImportSuccessOpen]);

  const handleDeleteSelectedTemplates = useCallback(async () => {
    if (!userId) return;
    if (selectedTemplateIds.length === 0) return;

    setIsDeletingTemplates(true);

    try {
      const idsToDelete = selectedTemplateIds;

      if (idsToDelete.length > 0) {
        const { error: exDelErr } = await db
          .from('template_exercises')
          .delete()
          .in('template_id', idsToDelete);
        if (exDelErr) {
          throw exDelErr;
        }

        const { error: tDelErr } = await db
          .from('workout_templates')
          .delete()
          .in('id', idsToDelete);
        if (tDelErr) {
          throw tDelErr;
        }
      }

      setIsDeleteTemplatesDialogOpen(false);
      setTemplatesForDeletion([]);
      setSelectedTemplateIds([]);
      setToastVariant('success');
      setImportSuccessMessage(getTranslations().hooks.templatesDeletedSuccess);
      setIsImportSuccessOpen(true);
    } catch (error: any) {
      console.error('Error deleting templates:', error);
      setToastVariant('error');
      setImportSuccessMessage(getTranslations().hooks.failedToDeleteTemplates);
      setIsImportSuccessOpen(true);
    } finally {
      setIsDeletingTemplates(false);
    }
  }, [userId, selectedTemplateIds, db, setToastVariant, setImportSuccessMessage, setIsImportSuccessOpen]);

  const closeDeleteWorkoutsDialog = useCallback(() => {
    if (isDeletingWorkouts) return;
    setIsDeleteWorkoutsDialogOpen(false);
  }, [isDeletingWorkouts]);

  const closeDeleteTemplatesDialog = useCallback(() => {
    if (isDeletingTemplates) return;
    setIsDeleteTemplatesDialogOpen(false);
  }, [isDeletingTemplates]);

  return {
    isCleanDataDialogOpen,
    setIsCleanDataDialogOpen,
    isDeleteWorkoutsDialogOpen,
    isLoadingWorkoutsForDeletion,
    workoutDateGroups,
    selectedWorkoutDates,
    isDeletingWorkouts,
    areAllWorkoutDatesSelected,
    isDeleteTemplatesDialogOpen,
    isLoadingTemplatesForDeletion,
    templatesForDeletion,
    selectedTemplateIds,
    isDeletingTemplates,
    areAllTemplatesSelected,
    openDeleteWorkoutsDialog,
    toggleWorkoutDateSelection,
    selectAllWorkoutDates,
    clearWorkoutSelection,
    handleDeleteSelectedWorkouts,
    closeDeleteWorkoutsDialog,
    openDeleteTemplatesDialog,
    toggleTemplateSelection,
    selectAllTemplates,
    clearTemplateSelection,
    handleDeleteSelectedTemplates,
    closeDeleteTemplatesDialog,
  };
}
