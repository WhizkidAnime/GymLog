import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { deleteUserAccount } from '../lib/user';
import { supabase } from '../lib/supabase';
import ConfirmDialog from '../components/confirm-dialog';
import TemplateSavedDialog from '../components/template-saved-dialog';

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const db = supabase as any;
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [deleteAccountEmail, setDeleteAccountEmail] = useState('');
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingTemplates, setIsExportingTemplates] = useState(false);
  const [isImportingWorkouts, setIsImportingWorkouts] = useState(false);
  const [isWorkoutsImportDialogOpen, setIsWorkoutsImportDialogOpen] = useState(false);
  const [pendingWorkoutsImport, setPendingWorkoutsImport] = useState<any | null>(null);
  const [pendingWorkoutsFileName, setPendingWorkoutsFileName] = useState<string | null>(null);
  const [pendingWorkoutsNewDates, setPendingWorkoutsNewDates] = useState<string[]>([]);
  const [pendingWorkoutsNewDatesSummary, setPendingWorkoutsNewDatesSummary] = useState<
    Array<{ date: string; count: number }>
  >([]);
  const [isImportingTemplates, setIsImportingTemplates] = useState(false);
  const [isImportSuccessOpen, setIsImportSuccessOpen] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [importAction, setImportAction] = useState<
    'none' | 'import' | 'exportThenImport' | 'onlyNew'
  >('none');
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  const [isTemplatesImportDialogOpen, setIsTemplatesImportDialogOpen] = useState(false);
  const [pendingTemplatesNew, setPendingTemplatesNew] = useState<any[]>([]);
  const [pendingTemplatesDuplicates, setPendingTemplatesDuplicates] = useState<Array<{ existingId: string; existingName: string; template: any }>>([]);
  const [templatesImportAction, setTemplatesImportAction] = useState<'none' | 'onlyNew' | 'overwrite'>('none');
  const [isCleanDataDialogOpen, setIsCleanDataDialogOpen] = useState(false);
  const [isDeleteWorkoutsDialogOpen, setIsDeleteWorkoutsDialogOpen] = useState(false);
  const [isDeleteTemplatesDialogOpen, setIsDeleteTemplatesDialogOpen] = useState(false);
  const [isLoadingWorkoutsForDeletion, setIsLoadingWorkoutsForDeletion] = useState(false);
  const [isLoadingTemplatesForDeletion, setIsLoadingTemplatesForDeletion] = useState(false);
  const [workoutDateGroups, setWorkoutDateGroups] = useState<Array<{ date: string; workoutIds: string[]; count: number }>>([]);
  const [selectedWorkoutDates, setSelectedWorkoutDates] = useState<string[]>([]);
  const [templatesForDeletion, setTemplatesForDeletion] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [isDeletingWorkouts, setIsDeletingWorkouts] = useState(false);
  const [isDeletingTemplates, setIsDeletingTemplates] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const workoutsFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const templatesFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isEmailSpoilerRevealed, setIsEmailSpoilerRevealed] = useState(false);

  const displayName = React.useMemo(() => {
    if (!user) return '';

    const metaNickname = (user.user_metadata as any)?.nickname;
    if (typeof metaNickname === 'string' && metaNickname.trim().length > 0) {
      return metaNickname.trim();
    }

    const email = user.email || '';
    if (email.endsWith('@gymlog.app')) {
      return email.replace(/@gymlog\.app$/, '');
    }

    return email;
  }, [user]);

  const emailParts = React.useMemo(() => {
    const email = user?.email || '';
    if (!email || typeof email !== 'string') {
      return null;
    }

    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) {
      return null;
    }

    const visibleLength = Math.max(1, Math.ceil(localPart.length / 2));
    const visiblePart = localPart.slice(0, visibleLength);
    const hiddenPart = localPart.slice(visibleLength);

    return { email, localPart, domain, visiblePart, hiddenPart };
  }, [user?.email]);

  const formatDateDDMMYYYY = (iso: string) => {
    if (!iso || typeof iso !== 'string') return iso;
    const parts = iso.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      if (year && month && day) {
        return `${day}.${month}.${year}`;
      }
    }
    return iso;
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMenuOpen]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  const startDeleteAccountFlow = () => {
    if (!user || !user.email) return;
    setDeleteAccountEmail('');
    setDeleteAccountError(null);
    setIsDeleteAccountDialogOpen(true);
  };

  const startCleanDataFlow = () => {
    if (!user) return;
    setIsCleanDataDialogOpen(true);
  };

  const handleDeleteAccount = async () => {
    if (!user || !user.email) return;

    if (deleteAccountEmail.trim() !== user.email) {
      setDeleteAccountError('Введённый e-mail не совпадает с вашим.');
      throw new Error('EMAIL_MISMATCH');
    }

    setDeleteAccountError(null);
    setIsDeleting(true);
    try {
      await deleteUserAccount();

      alert('Ваш аккаунт и все данные были успешно удалены.');
      await signOut();
      navigate('/login', { replace: true });

    } catch (error: any) {
      console.error('Error deleting account:', error);
      alert(`Не удалось удалить аккаунт: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportWorkouts = async () => {
    if (!user) return;

    setIsExporting(true);
    try {
      const { data: workouts, error: workoutsError } = await db
        .from('workouts')
        .select(
          `
          id,
          name,
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
        `,
        )
        .eq('user_id', user.id)
        .order('workout_date', { ascending: false });

      if (workoutsError) {
        console.error('Error exporting workouts:', workoutsError);
        alert('Не удалось загрузить данные тренировок для экспорта.');
        return;
      }

      const safeWorkouts = (workouts || []).map((w: any) => ({
        id: w.id,
        name: w.name,
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
          id: user.id,
          email: user.email,
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
  };

  const handleExportTemplates = async () => {
    if (!user) return;

    setIsExportingTemplates(true);
    try {
      const { data: templates, error: templatesError } = await db
        .from('workout_templates')
        .select(
          `
          id,
          name,
          created_at,
          template_exercises (
            id,
            name,
            sets,
            reps,
            rest_seconds,
            position
          )
        `,
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (templatesError) {
        console.error('Error exporting templates:', templatesError);
        alert('Не удалось загрузить шаблоны для экспорта.');
        return;
      }

      const safeTemplates = (templates || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        createdAt: t.created_at,
        exercises: (t.template_exercises || []).map((ex: any) => ({
          id: ex.id,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.rest_seconds,
          position: ex.position,
        })),
      }));

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
        },
        templates: safeTemplates,
      };

      const json = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `gymlog-templates-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Unexpected error while exporting templates:', error);
      alert('Произошла непредвиденная ошибка при экспорте шаблонов.');
    } finally {
      setIsExportingTemplates(false);
    }
  };

  const handleStartImportWorkouts = () => {
    if (!user || isImportingWorkouts) return;
    if (workoutsFileInputRef.current) {
      workoutsFileInputRef.current.value = '';
      workoutsFileInputRef.current.click();
    }
  };

  const handleWorkoutsFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      if (!user) {
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
        .eq('user_id', user.id);

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
  };

  const performWorkoutsImport = async (payload: any) => {
    if (!user) return;

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
      .eq('user_id', user.id);

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
          user_id: user.id,
          name,
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
  };

  const handleConfirmImportWorkoutsOnly = async () => {
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
  };

  const handleImportOnlyNewWorkouts = async () => {
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
  };

  const handleExportThenImportWorkouts = async () => {
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
  };

  const handleStartImportTemplates = () => {
    if (!user || isImportingTemplates) return;
    if (templatesFileInputRef.current) {
      templatesFileInputRef.current.value = '';
      templatesFileInputRef.current.click();
    }
  };

  const importTemplatesFromPayload = async (payload: any) => {
    if (!user) return;

    const templates = Array.isArray(payload.templates) ? payload.templates : [];
    if (templates.length === 0) {
      setToastVariant('error');
      setImportSuccessMessage('В файле нет шаблонов для импорта.');
      setIsImportSuccessOpen(true);
      return;
    }

    for (const template of templates) {
      const name = typeof template.name === 'string' && template.name.trim().length > 0
        ? template.name.trim()
        : 'Импортированный шаблон';

      const { data: newTemplate, error: templateError } = await db
        .from('workout_templates')
        .insert({
          user_id: user.id,
          name,
        })
        .select()
        .single();

      if (templateError || !newTemplate) {
        throw templateError || new Error('Не удалось создать шаблон при импорте.');
      }

      const exercisesSource = Array.isArray(template.exercises) ? template.exercises : [];
      if (exercisesSource.length === 0) {
        continue;
      }

      const exercises = exercisesSource.map((ex: any, index: number) => ({
        template_id: newTemplate.id,
        name: typeof ex.name === 'string' ? ex.name : '',
        sets: typeof ex.sets === 'number' ? ex.sets : 1,
        reps: typeof ex.reps === 'string' ? ex.reps : '',
        rest_seconds: typeof ex.restSeconds === 'number'
          ? ex.restSeconds
          : typeof ex.rest_seconds === 'number'
            ? ex.rest_seconds
            : 150,
        position: typeof ex.position === 'number' ? ex.position : index + 1,
      }));

      const { error: exercisesError } = await db
        .from('template_exercises')
        .insert(exercises);

      if (exercisesError) {
        throw exercisesError;
      }
    }
  };

  const handleTemplatesFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
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

      if (!parsed || !Array.isArray(parsed.templates)) {
        setToastVariant('error');
        setImportSuccessMessage('Файл не похож на экспорт шаблонов из GymLog.');
        setIsImportSuccessOpen(true);
        return;
      }
      if (!user) {
        return;
      }

      const importedTemplates: any[] = Array.isArray(parsed.templates) ? parsed.templates : [];
      if (importedTemplates.length === 0) {
        setToastVariant('error');
        setImportSuccessMessage('В файле нет шаблонов для импорта.');
        setIsImportSuccessOpen(true);
        return;
      }

      const { data: existing, error: existingErr } = await db
        .from('workout_templates')
        .select('id, name')
        .eq('user_id', user.id);

      if (existingErr) {
        console.error('Error checking existing templates before import:', existingErr);
        setToastVariant('error');
        setImportSuccessMessage('Не удалось проверить существующие шаблоны перед импортом.');
        setIsImportSuccessOpen(true);
        return;
      }

      const normalize = (name: any) => (typeof name === 'string' ? name.trim().toLowerCase() : '');

      const existingByName = new Map<string, { id: string; name: string }>();
      (existing || []).forEach((t: any) => {
        const norm = normalize(t.name);
        if (!norm) return;
        if (!existingByName.has(norm)) {
          existingByName.set(norm, { id: t.id as string, name: (t.name as string) || '' });
        }
      });

      const newOnes: any[] = [];
      const duplicates: Array<{ existingId: string; existingName: string; template: any }> = [];

      importedTemplates.forEach(template => {
        const norm = normalize(template?.name);
        if (!norm || !existingByName.has(norm)) {
          newOnes.push(template);
        } else {
          const existingItem = existingByName.get(norm)!;
          duplicates.push({ existingId: existingItem.id, existingName: existingItem.name || '', template });
        }
      });

      if (newOnes.length === 0 && duplicates.length > 0) {
        setToastVariant('error');
        setImportSuccessMessage('Все шаблоны из файла уже есть в вашем аккаунте. Новых шаблонов нет.');
        setIsImportSuccessOpen(true);
        return;
      }

      if (duplicates.length === 0) {
        setIsImportingTemplates(true);
        try {
          await importTemplatesFromPayload({ templates: importedTemplates });
          setToastVariant('success');
          setImportSuccessMessage('Импорт шаблонов завершён. Откройте страницу «Шаблоны», чтобы посмотреть их.');
          setIsImportSuccessOpen(true);
        } catch (error: any) {
          console.error('Error importing templates:', error);
          setToastVariant('error');
          setImportSuccessMessage('Не удалось импортировать шаблоны. Попробуйте ещё раз.');
          setIsImportSuccessOpen(true);
        } finally {
          setIsImportingTemplates(false);
        }
        return;
      }

      setPendingTemplatesNew(newOnes);
      setPendingTemplatesDuplicates(duplicates);
      setIsTemplatesImportDialogOpen(true);
    } catch (error: any) {
      console.error('Error importing templates:', error);
      setToastVariant('error');
      setImportSuccessMessage('Не удалось импортировать шаблоны. Попробуйте ещё раз.');
      setIsImportSuccessOpen(true);
    } finally {
      setIsImportingTemplates(false);
      event.target.value = '';
    }
  };

  const handleImportTemplatesOnlyNew = async () => {
    if (pendingTemplatesNew.length === 0) {
      setIsTemplatesImportDialogOpen(false);
      setPendingTemplatesDuplicates([]);
      setPendingTemplatesNew([]);
      setToastVariant('error');
      setImportSuccessMessage('Все шаблоны из файла уже есть в вашем аккаунте. Новых шаблонов нет.');
      setIsImportSuccessOpen(true);
      return;
    }

    setTemplatesImportAction('onlyNew');
    setIsImportingTemplates(true);
    try {
      await importTemplatesFromPayload({ templates: pendingTemplatesNew });
      setPendingTemplatesNew([]);
      setPendingTemplatesDuplicates([]);
      setIsTemplatesImportDialogOpen(false);
      setToastVariant('success');
      setImportSuccessMessage('Импорт новых шаблонов завершён. Откройте страницу «Шаблоны», чтобы посмотреть их.');
      setIsImportSuccessOpen(true);
    } catch (error: any) {
      console.error('Error importing only new templates:', error);
      setToastVariant('error');
      setImportSuccessMessage('Не удалось импортировать новые шаблоны. Попробуйте ещё раз.');
      setIsImportSuccessOpen(true);
    } finally {
      setIsImportingTemplates(false);
      setTemplatesImportAction('none');
    }
  };

  const openDeleteWorkoutsDialog = async () => {
    if (!user || isLoadingWorkoutsForDeletion) return;

    setIsLoadingWorkoutsForDeletion(true);
    setSelectedWorkoutDates([]);

    try {
      const { data, error } = await db
        .from('workouts')
        .select('id, workout_date')
        .eq('user_id', user.id)
        .order('workout_date', { ascending: false });

      if (error) {
        console.error('Error loading workouts for deletion:', error);
        alert('Не удалось загрузить список тренировок для удаления.');
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

      const groups: Array<{ date: string; workoutIds: string[]; count: number }> = Array.from(
        groupsMap.entries(),
      )
        .map(([date, workoutIds]) => ({
          date,
          workoutIds,
          count: workoutIds.length,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));

      if (groups.length === 0) {
        setToastVariant('error');
        setImportSuccessMessage('У вас нет тренировок для удаления.');
        setIsImportSuccessOpen(true);
        return;
      }

      setWorkoutDateGroups(groups);
      setIsCleanDataDialogOpen(false);
      setIsDeleteWorkoutsDialogOpen(true);
    } catch (error) {
      console.error('Unexpected error while loading workouts for deletion:', error);
      alert('Произошла ошибка при загрузке тренировок для удаления.');
    } finally {
      setIsLoadingWorkoutsForDeletion(false);
    }
  };

  const openDeleteTemplatesDialog = async () => {
    if (!user || isLoadingTemplatesForDeletion) return;

    setIsLoadingTemplatesForDeletion(true);
    setSelectedTemplateIds([]);

    try {
      const { data, error } = await db
        .from('workout_templates')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading templates for deletion:', error);
        alert('Не удалось загрузить список шаблонов для удаления.');
        return;
      }

      const list: Array<{ id: string; name: string }> = (data || []).map((t: any) => ({
        id: t.id as string,
        name: (t.name as string) || 'Без названия',
      }));

      if (list.length === 0) {
        setToastVariant('error');
        setImportSuccessMessage('У вас нет шаблонов для удаления.');
        setIsImportSuccessOpen(true);
        return;
      }

      setTemplatesForDeletion(list);
      setIsCleanDataDialogOpen(false);
      setIsDeleteTemplatesDialogOpen(true);
    } catch (error) {
      console.error('Unexpected error while loading templates for deletion:', error);
      alert('Произошла ошибка при загрузке шаблонов для удаления.');
    } finally {
      setIsLoadingTemplatesForDeletion(false);
    }
  };

  const toggleWorkoutDateSelection = (date: string) => {
    setSelectedWorkoutDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date],
    );
  };

  const selectAllWorkoutDates = () => {
    if (workoutDateGroups.length === 0) return;
    const allSelected = selectedWorkoutDates.length === workoutDateGroups.length;
    setSelectedWorkoutDates(allSelected ? [] : workoutDateGroups.map((g) => g.date));
  };

  const clearWorkoutSelection = () => {
    setSelectedWorkoutDates([]);
  };

  const toggleTemplateSelection = (id: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAllTemplates = () => {
    if (templatesForDeletion.length === 0) return;
    const allSelected = selectedTemplateIds.length === templatesForDeletion.length;
    setSelectedTemplateIds(allSelected ? [] : templatesForDeletion.map((t) => t.id));
  };

  const clearTemplateSelection = () => {
    setSelectedTemplateIds([]);
  };

  const handleDeleteSelectedWorkouts = async () => {
    if (!user) return;
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
      setImportSuccessMessage('Выбранные тренировки успешно удалены.');
      setIsImportSuccessOpen(true);
    } catch (error: any) {
      console.error('Error deleting workouts:', error);
      setToastVariant('error');
      setImportSuccessMessage('Не удалось удалить выбранные тренировки.');
      setIsImportSuccessOpen(true);
    } finally {
      setIsDeletingWorkouts(false);
    }
  };

  const handleDeleteSelectedTemplates = async () => {
    if (!user) return;
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
      setImportSuccessMessage('Выбранные шаблоны тренировок успешно удалены.');
      setIsImportSuccessOpen(true);
    } catch (error: any) {
      console.error('Error deleting templates:', error);
      setToastVariant('error');
      setImportSuccessMessage('Не удалось удалить выбранные шаблоны тренировок.');
      setIsImportSuccessOpen(true);
    } finally {
      setIsDeletingTemplates(false);
    }
  };

  const handleImportTemplatesOverwrite = async () => {
    if (pendingTemplatesDuplicates.length === 0 && pendingTemplatesNew.length === 0) {
      setIsTemplatesImportDialogOpen(false);
      return;
    }

    setTemplatesImportAction('overwrite');
    setIsImportingTemplates(true);
    try {
      const idsToReplace = Array.from(new Set(pendingTemplatesDuplicates.map(d => d.existingId)));

      if (idsToReplace.length > 0) {
        const { error: exDelErr } = await db
          .from('template_exercises')
          .delete()
          .in('template_id', idsToReplace);
        if (exDelErr) {
          throw exDelErr;
        }

        const { error: tDelErr } = await db
          .from('workout_templates')
          .delete()
          .in('id', idsToReplace);
        if (tDelErr) {
          throw tDelErr;
        }
      }

      const allToImport = [
        ...pendingTemplatesNew,
        ...pendingTemplatesDuplicates.map(d => d.template),
      ];

      await importTemplatesFromPayload({ templates: allToImport });
      setPendingTemplatesNew([]);
      setPendingTemplatesDuplicates([]);
      setIsTemplatesImportDialogOpen(false);
      setToastVariant('success');
      setImportSuccessMessage('Шаблоны успешно импортированы. Совпадающие шаблоны были перезаписаны.');
      setIsImportSuccessOpen(true);
    } catch (error: any) {
      console.error('Error overwriting templates:', error);
      alert('Не удалось импортировать шаблоны с перезаписью: ' + (error?.message || String(error)));
    } finally {
      setIsImportingTemplates(false);
      setTemplatesImportAction('none');
    }
  };

  const areAllWorkoutDatesSelected =
    workoutDateGroups.length > 0 && selectedWorkoutDates.length === workoutDateGroups.length;

  const areAllTemplatesSelected =
    templatesForDeletion.length > 0 && selectedTemplateIds.length === templatesForDeletion.length;

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pt-safe relative" style={{background:'#0a0a0b'}}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Профиль</h1>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-white hover:text-gray-300 transition-colors"
            aria-label="Меню"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-1 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 1-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 1-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 menu-popover space-y-0.5">
              <div className="px-4 pt-2 pb-0 text-[11px] font-semibold uppercase tracking-wide text-gray-400 text-center whitespace-nowrap">
                Импорт
              </div>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleStartImportWorkouts();
                }}
                disabled={isImportingWorkouts}
                className="w-full text-left px-4 py-1.5 text-sm text-white hover:bg-white/5 disabled:opacity-50 transition-colors rounded-lg"
              >
                {isImportingWorkouts ? 'Импорт тренировок...' : 'Тренировки'}
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleStartImportTemplates();
                }}
                disabled={isImportingTemplates}
                className="w-full text-left px-4 py-1.5 text-sm text-white hover:bg-white/5 disabled:opacity-50 transition-colors rounded-lg"
              >
                {isImportingTemplates ? 'Импорт шаблонов...' : 'Шаблоны'}
              </button>
              <div className="px-4 pt-1 pb-0 text-[11px] font-semibold uppercase tracking-wide text-gray-400 text-center whitespace-nowrap">
                Экспорт
              </div>
              <button
                onClick={async () => {
                  setIsMenuOpen(false);
                  await handleExportWorkouts();
                }}
                disabled={isExporting}
                className="w-full text-left px-4 py-1.5 text-sm text-white hover:bg-white/5 disabled:opacity-50 transition-colors rounded-lg"
              >
                {isExporting ? 'Экспорт тренировок...' : 'Тренировки'}
              </button>
              <button
                onClick={async () => {
                  setIsMenuOpen(false);
                  await handleExportTemplates();
                }}
                disabled={isExportingTemplates}
                className="w-full text-left px-4 py-1.5 text-sm text-white hover:bg-white/5 disabled:opacity-50 transition-colors rounded-lg"
              >
                {isExportingTemplates ? 'Экспорт шаблонов...' : 'Шаблоны'}
              </button>
              <div className="px-4 pt-1 pb-0 text-[11px] font-semibold uppercase tracking-wide text-gray-400 text-center whitespace-nowrap">
                Данные и аккаунт
              </div>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  startCleanDataFlow();
                }}
                className="w-full text-left px-4 py-1.5 text-sm text-white hover:bg-white/5 transition-colors rounded-lg"
              >
                Очистить данные
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  startDeleteAccountFlow();
                }}
                disabled={isDeleting}
                className="w-full text-left px-4 py-1.5 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors rounded-lg"
              >
                {isDeleting ? 'Удаление...' : 'Удалить аккаунт'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 glass card-dark rounded-lg shadow">
        {user && (
          <p className="flex flex-wrap items-center gap-1">
            <span>Вы вошли как:</span>
            {emailParts ? (
              <span className="font-semibold">
                {emailParts.visiblePart}
                {emailParts.hiddenPart && (
                  <button
                    type="button"
                    onClick={() => setIsEmailSpoilerRevealed(true)}
                    className="inline px-0 py-0 border-b border-dashed border-white/40 hover:border-white/80 transition-colors cursor-pointer select-none bg-transparent rounded-none align-baseline"
                  >
                    {isEmailSpoilerRevealed ? (
                      <span>{emailParts.hiddenPart}</span>
                    ) : (
                      <span>
                        {'•'.repeat(Math.max(3, emailParts.hiddenPart.length))}
                      </span>
                    )}
                  </button>
                )}
                @{emailParts.domain}
              </span>
            ) : (
              <span className="font-semibold">{displayName}</span>
            )}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <button
          onClick={() => navigate('/progress')}
          className="btn-glass btn-glass-full btn-glass-md btn-glass-primary"
        >
          Узнать прогресс
        </button>
        
        <button
          onClick={handleLogout}
          className="btn-glass btn-glass-logout btn-glass-full btn-glass-md"
        >
          Выйти
        </button>
      </div>
      <input
        ref={workoutsFileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleWorkoutsFileChange}
      />
      <input
        ref={templatesFileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleTemplatesFileChange}
      />
      <ConfirmDialog
        open={isDeleteAccountDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteAccountDialogOpen(open);
          if (!open) {
            setDeleteAccountEmail('');
            setDeleteAccountError(null);
          }
        }}
        title="Удалить аккаунт и все данные?"
        description="Это действие необратимо и удалит все ваши данные."
        confirmText="Удалить аккаунт"
        cancelText="Отмена"
        variant="danger"
        confirmDisabled={deleteAccountEmail.trim().length === 0}
        onConfirm={handleDeleteAccount}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-300">
            Для подтверждения введите ваш e-mail: <span className="font-semibold">{user?.email}</span>
          </p>
          <input
            type="email"
            value={deleteAccountEmail}
            onChange={(e) => {
              setDeleteAccountEmail(e.target.value);
              if (deleteAccountError) {
                setDeleteAccountError(null);
              }
            }}
            placeholder={user?.email || 'Введите ваш e-mail'}
            className="mt-1 block w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
            style={{background:'#18181b', color:'#fafafa', border:'1px solid #3f3f46'}}
          />
          {deleteAccountError && (
            <p className="text-xs text-red-400">
              {deleteAccountError}
            </p>
          )}
        </div>
      </ConfirmDialog>
      {isCleanDataDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (isLoadingWorkoutsForDeletion || isLoadingTemplatesForDeletion) return;
              setIsCleanDataDialogOpen(false);
            }}
          />
          <div className="relative w-full max-w-md glass card-dark rounded-xl shadow-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-white">Очистить данные</h2>
            <p className="text-sm text-gray-300">
              Выберите, какие данные вы хотите удалить.
            </p>
            {(isLoadingWorkoutsForDeletion || isLoadingTemplatesForDeletion) && (
              <p className="text-xs text-gray-400">Загружаем данные...</p>
            )}
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={openDeleteWorkoutsDialog}
                disabled={isLoadingWorkoutsForDeletion || isLoadingTemplatesForDeletion}
                className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary disabled:opacity-50"
              >
                Удалить тренировки
              </button>
              <button
                type="button"
                onClick={openDeleteTemplatesDialog}
                disabled={isLoadingWorkoutsForDeletion || isLoadingTemplatesForDeletion}
                className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary disabled:opacity-50"
              >
                Удалить шаблоны тренировок
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isLoadingWorkoutsForDeletion || isLoadingTemplatesForDeletion) return;
                  setIsCleanDataDialogOpen(false);
                }}
                className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary bg-white/10 hover:bg-white/5"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteWorkoutsDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (isDeletingWorkouts) return;
              setIsDeleteWorkoutsDialogOpen(false);
            }}
          />
          <div className="relative w-full max-w-md glass card-dark rounded-xl shadow-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-white">Удалить тренировки</h2>
            <p className="text-sm text-gray-300">
              Выберите даты тренировок, которые хотите удалить. Это действие необратимо.
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-300">
              <button
                type="button"
                onClick={selectAllWorkoutDates}
                disabled={workoutDateGroups.length === 0 || isDeletingWorkouts}
                className="inline-flex items-center gap-2 disabled:opacity-40"
              >
                <div
                  className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                    areAllWorkoutDatesSelected ? 'bg-green-500 border-green-400' : 'border-white/40'
                  }`}
                >
                  {areAllWorkoutDatesSelected && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414L8.5 11.836l6.543-6.543a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <span>Выбрать все</span>
              </button>
              <button
                type="button"
                onClick={clearWorkoutSelection}
                disabled={selectedWorkoutDates.length === 0 || isDeletingWorkouts}
                className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40"
              >
                Отменить выбранное
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md bg-black/20 p-3 space-y-2">
              {workoutDateGroups.map((group) => {
                const selected = selectedWorkoutDates.includes(group.date);
                return (
                  <button
                    key={group.date}
                    type="button"
                    onClick={() => toggleWorkoutDateSelection(group.date)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-left transition-colors ${
                      selected
                        ? 'bg-white/10 border-green-400'
                        : 'bg-transparent border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-white">{group.date}</div>
                      <div className="text-xs text-gray-400">
                        {group.count === 1 ? '1 тренировка' : `${group.count} тренировок`}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        selected ? 'bg-green-500 border-green-400' : 'border-white/40'
                      }`}
                    >
                      {selected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 text-white"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414L8.5 11.836l6.543-6.543a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
              {workoutDateGroups.length === 0 && (
                <p className="text-sm text-gray-400">Тренировки для удаления не найдены.</p>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDeleteSelectedWorkouts}
                disabled={selectedWorkoutDates.length === 0 || isDeletingWorkouts}
                className="btn-glass btn-glass-full btn-glass-md btn-glass-primary disabled:opacity-50"
              >
                {isDeletingWorkouts ? 'Удаляем выбранные...' : 'Удалить выбранные'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isDeletingWorkouts) return;
                  setIsDeleteWorkoutsDialogOpen(false);
                }}
                className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteTemplatesDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (isDeletingTemplates) return;
              setIsDeleteTemplatesDialogOpen(false);
            }}
          />
          <div className="relative w-full max-w-md glass card-dark rounded-xl shadow-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-white">Удалить шаблоны тренировок</h2>
            <p className="text-sm text-gray-300">
              Выберите шаблоны тренировок, которые хотите удалить. Это действие необратимо.
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-300">
              <button
                type="button"
                onClick={selectAllTemplates}
                disabled={templatesForDeletion.length === 0 || isDeletingTemplates}
                className="inline-flex items-center gap-2 disabled:opacity-40"
              >
                <div
                  className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                    areAllTemplatesSelected ? 'bg-green-500 border-green-400' : 'border-white/40'
                  }`}
                >
                  {areAllTemplatesSelected && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414L8.5 11.836l6.543-6.543a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <span>Выбрать все</span>
              </button>
              <button
                type="button"
                onClick={clearTemplateSelection}
                disabled={selectedTemplateIds.length === 0 || isDeletingTemplates}
                className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40"
              >
                Отменить выбранное
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md bg-black/20 p-3 space-y-2">
              {templatesForDeletion.map((template) => {
                const selected = selectedTemplateIds.includes(template.id);
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => toggleTemplateSelection(template.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-left transition-colors ${
                      selected
                        ? 'bg-white/10 border-green-400'
                        : 'bg-transparent border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <div className="text-sm font-medium text-white">{template.name}</div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        selected ? 'bg-green-500 border-green-400' : 'border-white/40'
                      }`}
                    >
                      {selected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3 text-white"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414L8.5 11.836l6.543-6.543a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
              {templatesForDeletion.length === 0 && (
                <p className="text-sm text-gray-400">Шаблоны для удаления не найдены.</p>
              )}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDeleteSelectedTemplates}
                disabled={selectedTemplateIds.length === 0 || isDeletingTemplates}
                className="btn-glass btn-glass-full btn-glass-md btn-glass-primary disabled:opacity-50"
              >
                {isDeletingTemplates ? 'Удаляем выбранные...' : 'Удалить выбранные'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isDeletingTemplates) return;
                  setIsDeleteTemplatesDialogOpen(false);
                }}
                className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      <TemplateSavedDialog
        open={isImportSuccessOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsImportSuccessOpen(false);
            setImportSuccessMessage(null);
          }
        }}
        onClose={() => {
          setIsImportSuccessOpen(false);
          setImportSuccessMessage(null);
        }}
        message={
          importSuccessMessage ||
          'Импорт тренировок завершён. Откройте календарь, чтобы посмотреть тренировки.'
        }
        variant={toastVariant}
      />

      {isTemplatesImportDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (isImportingTemplates) return;
              setIsTemplatesImportDialogOpen(false);
            }}
          />
          <div className="relative w-full max-w-md glass card-dark rounded-xl shadow-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-white">Импорт шаблонов</h2>
            <div className="text-sm text-gray-300 space-y-1">
              <p>В файле найдены шаблоны с именами, которые уже есть в вашем аккаунте.</p>
              <ul className="list-disc list-inside text-xs text-gray-400 space-y-0.5">
                <li>«Импортировать только новые шаблоны» — добавит только те, которых ещё нет.</li>
                <li>«Перезаписать существующие шаблоны» — удалит совпадающие и создаст их заново из файла.</li>
              </ul>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md bg-black/20 p-3 space-y-2">
              {pendingTemplatesDuplicates.map((item, index) => (
                <div key={item.existingId + '-' + index} className="text-sm text-gray-200 border-b border-white/5 pb-1 last:border-0">
                  <div className="font-semibold">{item.template?.name || 'Без названия'}</div>
                  <div className="text-xs text-gray-400">
                    Уже есть как: «{item.existingName || 'Без названия'}»
                  </div>
                </div>
              ))}
              {pendingTemplatesDuplicates.length === 0 && (
                <p className="text-sm text-gray-400">Совпадающих шаблонов не найдено.</p>
              )}
            </div>
            {isImportingTemplates ? (
              <div className="mt-4 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-sm text-gray-300">
                  {templatesImportAction === 'overwrite'
                    ? 'Перезаписываем существующие шаблоны и импортируем данные...'
                    : 'Импортируем только новые шаблоны...'}
                </p>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleImportTemplatesOnlyNew}
                  className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary"
                >
                  Импортировать только новые шаблоны (без изменения существующих)
                </button>
                <button
                  type="button"
                  onClick={handleImportTemplatesOverwrite}
                  className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary"
                >
                  Перезаписать существующие шаблоны и добавить новые
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsTemplatesImportDialogOpen(false);
                  }}
                  className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary"
                >
                  Отмена
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isWorkoutsImportDialogOpen && pendingWorkoutsImport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (isImportingWorkouts) return;
              setIsWorkoutsImportDialogOpen(false);
              setPendingWorkoutsImport(null);
              setPendingWorkoutsFileName(null);
              setPendingWorkoutsNewDates([]);
              setPendingWorkoutsNewDatesSummary([]);
            }}
          />
          <div className="relative w-full max-w-md glass card-dark rounded-xl shadow-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-white">Импорт тренировок</h2>
            <p className="text-sm text-gray-300">
              {`Будут импортированы тренировки из файла "${pendingWorkoutsFileName || 'выбранный файл'}".`}
            </p>
            <div className="text-sm text-gray-400 space-y-1">
              <p>
                Тренировки на даты, которые уже есть в календаре и присутствуют в файле, будут
                удалены и перезаписаны данными из файла. На другие даты тренировки останутся без
                изменений.
              </p>
              <ul className="list-disc list-inside text-xs text-gray-500 space-y-0.5">
                <li>
                  «Импортировать только новые тренировки» — добавит тренировки только на новые даты,
                  без изменения существующих.
                </li>
                <li>
                  «Импортировать с перезаписью дат» — заменит тренировки на совпадающие даты и
                  добавит новые.
                </li>
                <li>
                  «Экспортировать текущие тренировки и импортировать с перезаписью» — сначала
                  сохранит текущие тренировки в файл, затем выполнит импорт с перезаписью дат.
                </li>
              </ul>
            </div>
            {pendingWorkoutsNewDatesSummary.length > 0 && (
              <div className="mt-2 rounded-md bg-black/20 p-3">
                <p className="text-xs text-gray-300">
                  Новые тренировки из файла (даты, которых ещё нет в календаре):
                </p>
                <div className="mt-1 space-y-1 max-h-32 overflow-y-auto text-center">
                  {pendingWorkoutsNewDatesSummary.map((item) => (
                    <div
                      key={item.date}
                      className="text-xs text-gray-200"
                    >
                      <span>{formatDateDDMMYYYY(item.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isImportingWorkouts ? (
              <div className="mt-4 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-sm text-gray-300">
                  {importAction === 'exportThenImport'
                    ? 'Экспортируем текущие тренировки и импортируем новые...'
                    : importAction === 'onlyNew'
                      ? 'Импортируем только новые тренировки...'
                      : 'Импортируем тренировки...'}
                </p>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                {pendingWorkoutsNewDatesSummary.length > 0 && (
                  <button
                    type="button"
                    onClick={handleImportOnlyNewWorkouts}
                    className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary"
                  >
                    Импортировать только новые тренировки (без изменения существующих)
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConfirmImportWorkoutsOnly}
                  className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary"
                >
                  Импортировать с перезаписью дат из файла
                </button>
                <button
                  type="button"
                  onClick={handleExportThenImportWorkouts}
                  className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary"
                >
                  Экспортировать текущие тренировки и импортировать с перезаписью дат
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsWorkoutsImportDialogOpen(false);
                    setPendingWorkoutsImport(null);
                    setPendingWorkoutsFileName(null);
                    setPendingWorkoutsNewDates([]);
                    setPendingWorkoutsNewDatesSummary([]);
                  }}
                  className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary bg-white/10 hover:bg-white/5"
                >
                  Отмена
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;