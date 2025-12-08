import React, { useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { WorkoutIconType } from '../components/workout-icons';

export type ToastVariant = 'success' | 'error';

export type ImportAction = 'none' | 'import' | 'exportThenImport' | 'onlyNew';

export type UseWorkoutsImportExportProps = {
  userId: string | undefined;
  userEmail: string | undefined;
};

export type UseWorkoutsImportExportReturn = {
  // Export state
  isExporting: boolean;

  // Import state
  isImportingWorkouts: boolean;
  isWorkoutsImportDialogOpen: boolean;
  pendingWorkoutsImport: any | null;
  pendingWorkoutsFileName: string | null;
  pendingWorkoutsNewDates: string[];
  pendingWorkoutsNewDatesSummary: Array<{ date: string; count: number }>;
  importAction: ImportAction;

  // Toast state
  isImportSuccessOpen: boolean;
  importSuccessMessage: string | null;
  toastVariant: ToastVariant;

  // Refs
  workoutsFileInputRef: React.RefObject<HTMLInputElement | null>;

  // Actions
  handleExportWorkouts: () => Promise<void>;
  handleStartImportWorkouts: () => void;
  handleWorkoutsFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleConfirmImportWorkoutsOnly: () => Promise<void>;
  handleImportOnlyNewWorkouts: () => Promise<void>;
  handleExportThenImportWorkouts: () => Promise<void>;
  closeWorkoutsImportDialog: () => void;
  closeImportSuccessToast: () => void;
  setIsImportSuccessOpen: (open: boolean) => void;
  setImportSuccessMessage: (msg: string | null) => void;
  setToastVariant: (variant: ToastVariant) => void;
};

const WORKOUT_ICON_VALUES: WorkoutIconType[] = [
  'upper', 'lower', 'push', 'pull', 'legs', 'arms', 'shoulders', 'chest', 'back', 'core', 'cardio', 'full'
];

function sanitizeIcon(icon: any): WorkoutIconType | null {
  if (typeof icon !== 'string') return null;
  const trimmed = icon.trim() as WorkoutIconType;
  return WORKOUT_ICON_VALUES.includes(trimmed) ? trimmed : null;
}

export function useWorkoutsImportExport({
  userId,
  userEmail,
}: UseWorkoutsImportExportProps): UseWorkoutsImportExportReturn {
  const db = supabase as any;

  const [isExporting, setIsExporting] = useState(false);
  const [isImportingWorkouts, setIsImportingWorkouts] = useState(false);
  const [isWorkoutsImportDialogOpen, setIsWorkoutsImportDialogOpen] = useState(false);
  const [pendingWorkoutsImport, setPendingWorkoutsImport] = useState<any | null>(null);
  const [pendingWorkoutsFileName, setPendingWorkoutsFileName] = useState<string | null>(null);
  const [pendingWorkoutsNewDates, setPendingWorkoutsNewDates] = useState<string[]>([]);
  const [pendingWorkoutsNewDatesSummary, setPendingWorkoutsNewDatesSummary] = useState<
    Array<{ date: string; count: number }>
  >([]);
  const [importAction, setImportAction] = useState<ImportAction>('none');

  const [isImportSuccessOpen, setIsImportSuccessOpen] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<ToastVariant>('success');

  const workoutsFileInputRef = useRef<HTMLInputElement | null>(null);

  const performWorkoutsImport = useCallback(async (payload: any) => {
    if (!userId) return;

    const workouts = Array.isArray(payload.workouts) ? payload.workouts : [];
    if (workouts.length === 0) {
      setToastVariant('error');
      setImportSuccessMessage('В файле нет тренировок для импорта.');
      setIsImportSuccessOpen(true);
      return;
    }

    const { data: existingWorkouts, error: existingErr } = await db
      .from('workouts')
      .select('id, workout_date')
      .eq('user_id', userId);

    if (existingErr) {
      throw existingErr;
    }

    const importDates = new Set<string>();
    workouts.forEach((w: any) => {
      const date = typeof w.date === 'string' && w.date
        ? w.date
        : typeof w.workout_date === 'string' && w.workout_date
          ? w.workout_date
          : '';
      if (date) {
        importDates.add(date);
      }
    });

    const allExisting = (existingWorkouts || []) as Array<{ id: string; workout_date: string }>;
    const workoutsToReplaceIds = allExisting
      .filter(w => importDates.has(w.workout_date))
      .map(w => w.id);

    if (workoutsToReplaceIds.length > 0) {
      const { data: existingExercises, error: exErr } = await db
        .from('workout_exercises')
        .select('id, workout_id')
        .in('workout_id', workoutsToReplaceIds);

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

      if (workoutsToReplaceIds.length > 0) {
        const { error: exDelErr } = await db
          .from('workout_exercises')
          .delete()
          .in('workout_id', workoutsToReplaceIds);
        if (exDelErr) {
          throw exDelErr;
        }

        const { error: workoutsDelErr } = await db
          .from('workouts')
          .delete()
          .in('id', workoutsToReplaceIds);
        if (workoutsDelErr) {
          throw workoutsDelErr;
        }
      }
    }

    for (const workout of workouts) {
      const name = typeof workout.name === 'string' && workout.name.trim().length > 0
        ? workout.name.trim()
        : 'Импортированная тренировка';

      const date = typeof workout.date === 'string' && workout.date
        ? workout.date
        : new Date().toISOString().slice(0, 10);

      const { data: newWorkout, error: insertWorkoutError } = await db
        .from('workouts')
        .insert({
          user_id: userId,
          name,
          icon: sanitizeIcon(workout.icon),
          workout_date: date,
          is_cardio: !!workout.isCardio,
          template_id: null,
        })
        .select()
        .single();

      if (insertWorkoutError || !newWorkout) {
        throw insertWorkoutError || new Error('Не удалось создать тренировку при импорте.');
      }

      const exercisesSource = Array.isArray(workout.exercises) ? workout.exercises : [];
      if (exercisesSource.length === 0) {
        continue;
      }

      const exercisesToInsert = exercisesSource.map((ex: any, index: number) => ({
        workout_id: newWorkout.id,
        name: typeof ex.name === 'string' ? ex.name : '',
        position: typeof ex.position === 'number' ? ex.position : index + 1,
        reps: typeof ex.reps === 'string' ? ex.reps : '',
        rest_seconds: typeof ex.restSeconds === 'number'
          ? ex.restSeconds
          : typeof ex.rest_seconds === 'number'
            ? ex.rest_seconds
            : 150,
        sets: typeof ex.setsPlanned === 'number'
          ? ex.setsPlanned
          : Array.isArray(ex.sets)
            ? ex.sets.length
            : 1,
      }));

      const { data: insertedExercises, error: exInsertError } = await db
        .from('workout_exercises')
        .insert(exercisesToInsert)
        .select();

      if (exInsertError || !insertedExercises) {
        throw exInsertError || new Error('Не удалось создать упражнения при импорте.');
      }

      const setsPayload: any[] = [];

      const sortedSourceExercises = [...exercisesSource].sort((a: any, b: any) => {
        const aPos = typeof a.position === 'number' ? a.position : 0;
        const bPos = typeof b.position === 'number' ? b.position : 0;
        return aPos - bPos;
      });

      const sortedInsertedExercises = [...insertedExercises].sort((a: any, b: any) => {
        const aPos = typeof a.position === 'number' ? a.position : 0;
        const bPos = typeof b.position === 'number' ? b.position : 0;
        return aPos - bPos;
      });

      sortedSourceExercises.forEach((srcEx: any, index: number) => {
        const targetEx = sortedInsertedExercises[index];
        if (!targetEx) return;

        const setsSource = Array.isArray(srcEx.sets) ? srcEx.sets : [];
        setsSource.forEach((s: any) => {
          setsPayload.push({
            workout_exercise_id: targetEx.id,
            set_index: typeof s.index === 'number' ? s.index : 1,
            weight: typeof s.weight === 'number' ? s.weight : null,
            reps: s.reps == null ? null : String(s.reps),
            is_done: !!s.isDone,
            updated_at: typeof s.updatedAt === 'string' && s.updatedAt
              ? s.updatedAt
              : new Date().toISOString(),
          });
        });
      });

      if (setsPayload.length > 0) {
        const { error: setsInsertError } = await db
          .from('workout_sets')
          .insert(setsPayload);

        if (setsInsertError) {
          throw setsInsertError;
        }
      }
    }
  }, [userId, db]);

  const handleExportWorkouts = useCallback(async () => {
    if (!userId) return;

    setIsExporting(true);
    try {
      const { data: workouts, error: workoutsError } = await db
        .from('workouts')
        .select(`
          id,
          name,
          icon,
          workout_date,
          is_cardio,
          template_id,
          workout_exercises (
            id,
            name,
            position,
            reps,
            rest_seconds,
            sets,
            workout_sets (
              id,
              set_index,
              weight,
              reps,
              is_done,
              updated_at
            )
          )
        `)
        .eq('user_id', userId)
        .order('workout_date', { ascending: false });

      if (workoutsError) {
        console.error('Error exporting workouts:', workoutsError);
        alert('Не удалось загрузить данные тренировок для экспорта.');
        return;
      }

      const safeWorkouts = (workouts || []).map((w: any) => ({
        id: w.id,
        name: w.name,
        icon: sanitizeIcon(w.icon),
        date: w.workout_date,
        isCardio: !!w.is_cardio,
        templateId: w.template_id,
        exercises: (w.workout_exercises || []).map((ex: any) => ({
          id: ex.id,
          name: ex.name,
          position: ex.position,
          reps: ex.reps,
          restSeconds: ex.rest_seconds,
          setsPlanned: ex.sets,
          sets: (ex.workout_sets || []).map((s: any) => ({
            id: s.id,
            index: s.set_index,
            weight: s.weight,
            reps: s.reps,
            isDone: s.is_done,
            updatedAt: s.updated_at,
          })),
        })),
      }));

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        user: {
          id: userId,
          email: userEmail,
        },
        workouts: safeWorkouts,
      };

      const json = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `gymlog-workouts-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Unexpected error while exporting workouts:', error);
      alert('Произошла непредвиденная ошибка при экспорте данных.');
    } finally {
      setIsExporting(false);
    }
  }, [userId, userEmail, db]);

  const handleStartImportWorkouts = useCallback(() => {
    if (!userId || isImportingWorkouts) return;
    if (workoutsFileInputRef.current) {
      workoutsFileInputRef.current.value = '';
      workoutsFileInputRef.current.click();
    }
  }, [userId, isImportingWorkouts]);

  const handleWorkoutsFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      setPendingWorkoutsNewDates([]);
      setPendingWorkoutsNewDatesSummary([]);

      const text = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        setToastVariant('error');
        setImportSuccessMessage('Файл не является корректным JSON.');
        setIsImportSuccessOpen(true);
        return;
      }

      if (!parsed || !Array.isArray(parsed.workouts)) {
        setToastVariant('error');
        setImportSuccessMessage('Файл не похож на экспорт тренировок из GymLog.');
        setIsImportSuccessOpen(true);
        return;
      }
      if (!userId) {
        return;
      }

      const importedWorkouts = Array.isArray(parsed.workouts) ? parsed.workouts : [];
      const importedDates = new Set<string>();

      importedWorkouts.forEach((w: any) => {
        const date = typeof w.date === 'string' && w.date
          ? w.date
          : typeof w.workout_date === 'string' && w.workout_date
            ? w.workout_date
            : '';
        if (date) {
          importedDates.add(date);
        }
      });

      const { data: existing, error: existingErr } = await db
        .from('workouts')
        .select('workout_date')
        .eq('user_id', userId);

      if (existingErr) {
        console.error('Error checking existing workouts before import:', existingErr);
        setToastVariant('error');
        setImportSuccessMessage('Не удалось проверить существующие тренировки перед импортом.');
        setIsImportSuccessOpen(true);
        return;
      }

      const existingDatesSet = new Set<string>(
        (existing || []).map((w: any) => w.workout_date as string),
      );
      const hasAnyExisting = existingDatesSet.size > 0;

      const dateCounters = new Map<string, number>();
      importedWorkouts.forEach((w: any) => {
        const date = typeof w.date === 'string' && w.date
          ? w.date
          : typeof w.workout_date === 'string' && w.workout_date
            ? w.workout_date
            : '';
        if (!date) return;
        dateCounters.set(date, (dateCounters.get(date) || 0) + 1);
      });

      const overlapDates: string[] = [];
      const newDates: string[] = [];

      importedDates.forEach((d) => {
        if (existingDatesSet.has(d)) {
          overlapDates.push(d);
        } else {
          newDates.push(d);
        }
      });

      const hasOverlap = overlapDates.length > 0;

      if (!hasAnyExisting || !hasOverlap) {
        setToastVariant('success');
        setIsImportingWorkouts(true);
        try {
          await performWorkoutsImport(parsed);
          setImportSuccessMessage('Импорт тренировок завершён. Откройте календарь, чтобы посмотреть тренировки.');
          setIsImportSuccessOpen(true);
        } catch (error: any) {
          console.error('Error importing workouts:', error);
          alert('Не удалось импортировать тренировки: ' + (error?.message || String(error)));
        } finally {
          setIsImportingWorkouts(false);
        }
        return;
      }

      if (newDates.length === 0) {
        setToastVariant('error');
        setImportSuccessMessage(
          'Все тренировки из файла уже есть в вашем календаре. Новых тренировок нет.',
        );
        setIsImportSuccessOpen(true);
        return;
      }

      setPendingWorkoutsImport(parsed);
      setPendingWorkoutsFileName(file.name);
      if (newDates.length > 0) {
        const summary = newDates
          .map((date) => ({
            date,
            count: dateCounters.get(date) || 0,
          }))
          .sort((a, b) => b.date.localeCompare(a.date));
        setPendingWorkoutsNewDates(newDates);
        setPendingWorkoutsNewDatesSummary(summary);
      } else {
        setPendingWorkoutsNewDates([]);
        setPendingWorkoutsNewDatesSummary([]);
      }
      setIsWorkoutsImportDialogOpen(true);
    } catch (error) {
      console.error('Error reading workouts import file:', error);
      alert('Не удалось прочитать файл тренировок.');
    } finally {
      event.target.value = '';
    }
  }, [userId, db, performWorkoutsImport]);

  const handleConfirmImportWorkoutsOnly = useCallback(async () => {
    if (!pendingWorkoutsImport) return;

    setImportAction('import');
    setIsImportingWorkouts(true);
    try {
      await performWorkoutsImport(pendingWorkoutsImport);
      setPendingWorkoutsImport(null);
      setPendingWorkoutsFileName(null);
      setPendingWorkoutsNewDates([]);
      setPendingWorkoutsNewDatesSummary([]);
      setIsWorkoutsImportDialogOpen(false);
      setToastVariant('success');
      setImportSuccessMessage('Импорт тренировок завершён. Откройте календарь, чтобы посмотреть тренировки.');
      setIsImportSuccessOpen(true);
    } catch (error: any) {
      console.error('Error importing workouts:', error);
      alert('Не удалось импортировать тренировки: ' + (error?.message || String(error)));
    } finally {
      setIsImportingWorkouts(false);
      setImportAction('none');
    }
  }, [pendingWorkoutsImport, performWorkoutsImport]);

  const handleImportOnlyNewWorkouts = useCallback(async () => {
    if (!pendingWorkoutsImport) return;

    const sourceWorkouts = Array.isArray(pendingWorkoutsImport.workouts)
      ? pendingWorkoutsImport.workouts
      : [];
    if (sourceWorkouts.length === 0) {
      setToastVariant('error');
      setImportSuccessMessage('В файле нет тренировок для импорта.');
      setIsImportSuccessOpen(true);
      return;
    }

    const newDatesSet = new Set(pendingWorkoutsNewDates);
    if (newDatesSet.size === 0) {
      setToastVariant('error');
      setImportSuccessMessage(
        'В файле нет новых тренировок с датами, которых ещё нет в вашем календаре.',
      );
      setIsImportSuccessOpen(true);
      return;
    }

    const filteredWorkouts = sourceWorkouts.filter((w: any) => {
      const date = typeof w.date === 'string' && w.date
        ? w.date
        : typeof w.workout_date === 'string' && w.workout_date
          ? w.workout_date
          : '';
      return !!date && newDatesSet.has(date);
    });

    if (filteredWorkouts.length === 0) {
      setToastVariant('error');
      setImportSuccessMessage(
        'Не удалось определить новые тренировки для импорта. Проверьте файл.',
      );
      setIsImportSuccessOpen(true);
      return;
    }

    setImportAction('onlyNew');
    setIsImportingWorkouts(true);
    try {
      await performWorkoutsImport({ workouts: filteredWorkouts });
      setPendingWorkoutsImport(null);
      setPendingWorkoutsFileName(null);
      setPendingWorkoutsNewDates([]);
      setPendingWorkoutsNewDatesSummary([]);
      setIsWorkoutsImportDialogOpen(false);
      setToastVariant('success');
      setImportSuccessMessage(
        'Импорт новых тренировок завершён. Откройте календарь, чтобы посмотреть тренировки.',
      );
      setIsImportSuccessOpen(true);
    } catch (error: any) {
      console.error('Error importing only new workouts:', error);
      setToastVariant('error');
      setImportSuccessMessage('Не удалось импортировать новые тренировки. Попробуйте ещё раз.');
      setIsImportSuccessOpen(true);
    } finally {
      setIsImportingWorkouts(false);
      setImportAction('none');
    }
  }, [pendingWorkoutsImport, pendingWorkoutsNewDates, performWorkoutsImport]);

  const handleExportThenImportWorkouts = useCallback(async () => {
    if (!pendingWorkoutsImport) return;

    setImportAction('exportThenImport');
    setIsImportingWorkouts(true);
    try {
      await handleExportWorkouts();
      await performWorkoutsImport(pendingWorkoutsImport);
      setPendingWorkoutsImport(null);
      setPendingWorkoutsFileName(null);
      setIsWorkoutsImportDialogOpen(false);
      setToastVariant('success');
      setImportSuccessMessage('Текущие тренировки сохранены, импорт завершён. Откройте календарь, чтобы посмотреть тренировки.');
      setIsImportSuccessOpen(true);
    } catch (error: any) {
      console.error('Error exporting and importing workouts:', error);
      setToastVariant('error');
      setImportSuccessMessage('Не удалось выполнить экспорт и импорт тренировок. Попробуйте ещё раз.');
      setIsImportSuccessOpen(true);
    } finally {
      setIsImportingWorkouts(false);
      setImportAction('none');
    }
  }, [pendingWorkoutsImport, handleExportWorkouts, performWorkoutsImport]);

  const closeWorkoutsImportDialog = useCallback(() => {
    setIsWorkoutsImportDialogOpen(false);
    setPendingWorkoutsImport(null);
    setPendingWorkoutsFileName(null);
    setPendingWorkoutsNewDates([]);
    setPendingWorkoutsNewDatesSummary([]);
  }, []);

  const closeImportSuccessToast = useCallback(() => {
    setIsImportSuccessOpen(false);
    setImportSuccessMessage(null);
  }, []);

  return {
    isExporting,
    isImportingWorkouts,
    isWorkoutsImportDialogOpen,
    pendingWorkoutsImport,
    pendingWorkoutsFileName,
    pendingWorkoutsNewDates,
    pendingWorkoutsNewDatesSummary,
    importAction,
    isImportSuccessOpen,
    importSuccessMessage,
    toastVariant,
    workoutsFileInputRef,
    handleExportWorkouts,
    handleStartImportWorkouts,
    handleWorkoutsFileChange,
    handleConfirmImportWorkoutsOnly,
    handleImportOnlyNewWorkouts,
    handleExportThenImportWorkouts,
    closeWorkoutsImportDialog,
    closeImportSuccessToast,
    setIsImportSuccessOpen,
    setImportSuccessMessage,
    setToastVariant,
  };
}
