import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { UserBodyWeight } from '../types/database.types';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { deleteUserAccount } from '../lib/user';
import { supabase } from '../lib/supabase';
import ConfirmDialog from '../components/confirm-dialog';
import TemplateSavedDialog from '../components/template-saved-dialog';
import type { WorkoutIconType } from '../components/workout-icons';

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [timerStep, setTimerStep] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('settings:timerStep');
      return saved ? Number(saved) : 30;
    } catch {
      return 30;
    }
  });
  const [timerStepInput, setTimerStepInput] = useState<string>(() => String(timerStep));
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const saveStatusTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Body weight tracker state
  const [isWeightTrackerOpen, setIsWeightTrackerOpen] = useState(false);
  const [bodyWeights, setBodyWeights] = useState<UserBodyWeight[]>([]);
  const [loadingWeights, setLoadingWeights] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newWeightDate, setNewWeightDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [savingWeight, setSavingWeight] = useState(false);
  const [deletingWeightId, setDeletingWeightId] = useState<string | null>(null);
  const [isDeleteWeightConfirmOpen, setIsDeleteWeightConfirmOpen] = useState(false);
  const [weightToDelete, setWeightToDelete] = useState<string | null>(null);

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('settings:theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

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

  const WORKOUT_ICON_VALUES: WorkoutIconType[] = React.useMemo(
    () => ['upper', 'lower', 'push', 'pull', 'legs', 'arms', 'shoulders', 'chest', 'back', 'core', 'cardio', 'full'],
    [],
  );

  const sanitizeIcon = React.useCallback(
    (icon: any): WorkoutIconType | null => {
      if (typeof icon !== 'string') return null;
      const trimmed = icon.trim() as WorkoutIconType;
      return WORKOUT_ICON_VALUES.includes(trimmed) ? trimmed : null;
    },
    [WORKOUT_ICON_VALUES],
  );

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

  React.useEffect(() => {
    return () => {
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
      }
    };
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (theme === 'light') {
      root.classList.add('light-theme');
      if (meta) meta.setAttribute('content', '#f5f5f7');
    } else {
      root.classList.remove('light-theme');
      if (meta) meta.setAttribute('content', '#0a0a0b');
    }
  }, [theme]);

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    try {
      localStorage.setItem('settings:theme', newTheme);
    } catch {}
  };

  // Load body weights
  const loadBodyWeights = useCallback(async () => {
    if (!user) return;
    setLoadingWeights(true);
    try {
      const { data, error } = await db
        .from('user_body_weights')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setBodyWeights(data || []);
    } catch (error) {
      console.error('Error loading body weights:', error);
    } finally {
      setLoadingWeights(false);
    }
  }, [user]);

  useEffect(() => {
    if (isWeightTrackerOpen && user) {
      loadBodyWeights();
    }
  }, [isWeightTrackerOpen, user, loadBodyWeights]);

  const handleAddWeight = async () => {
    if (!user || !newWeight || savingWeight) return;

    const weightValue = parseFloat(newWeight.replace(',', '.'));
    if (isNaN(weightValue) || weightValue <= 0 || weightValue > 500) {
      alert('Введите корректный вес (от 0.1 до 500 кг)');
      return;
    }

    setSavingWeight(true);
    try {
      const { data, error } = await db
        .from('user_body_weights')
        .upsert({
          user_id: user.id,
          weight: weightValue,
          recorded_at: newWeightDate,
        }, { onConflict: 'user_id,recorded_at' })
        .select()
        .single();

      if (error) throw error;

      setBodyWeights(prev => {
        const filtered = prev.filter(w => w.recorded_at !== newWeightDate);
        return [data, ...filtered].sort((a, b) => 
          new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
        );
      });
      setNewWeight('');
      setNewWeightDate(new Date().toISOString().slice(0, 10));
    } catch (error) {
      console.error('Error saving weight:', error);
      alert('Не удалось сохранить вес');
    } finally {
      setSavingWeight(false);
    }
  };

  const handleDeleteWeight = async (id: string) => {
    if (!user || deletingWeightId) return;

    setDeletingWeightId(id);
    try {
      const { error } = await db
        .from('user_body_weights')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setBodyWeights(prev => prev.filter(w => w.id !== id));
      setIsDeleteWeightConfirmOpen(false);
      setWeightToDelete(null);
    } catch (error) {
      console.error('Error deleting weight:', error);
      alert('Не удалось удалить запись');
    } finally {
      setDeletingWeightId(null);
    }
  };

  const handleOpenDeleteWeightConfirm = (id: string) => {
    setWeightToDelete(id);
    setIsDeleteWeightConfirmOpen(true);
  };

  const weightChartData = React.useMemo(() => {
    return [...bodyWeights]
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .slice(-30)
      .map(w => ({
        date: new Date(w.recorded_at).toLocaleDateString('ru', { day: 'numeric', month: 'short' }),
        weight: Number(w.weight),
        fullDate: w.recorded_at,
      }));
  }, [bodyWeights]);

  const weightStats = React.useMemo(() => {
    if (bodyWeights.length === 0) return null;
    const weights = bodyWeights.map(w => Number(w.weight));
    const current = weights[0];
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const change = bodyWeights.length > 1 ? current - weights[weights.length - 1] : 0;
    return { current, min, max, change };
  }, [bodyWeights]);

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
          icon,
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
        icon: sanitizeIcon(t.icon),
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
          icon: sanitizeIcon(template.icon),
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
    <div className="p-4 space-y-4 max-w-lg mx-auto pt-safe relative profile-page">
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
          className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary flex items-center justify-center gap-2"
        >
          Узнать прогресс
        </button>

        <button
          onClick={() => setIsWeightTrackerOpen(true)}
          className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
          Трекер веса тела
        </button>
        
        <button
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Настройки
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <button
          onClick={handleLogout}
          className="btn-glass btn-glass-logout btn-glass-full btn-glass-md"
        >
          Выйти
        </button>
      </div>

      {isSettingsOpen && (
        <div className="glass card-dark rounded-lg p-4 space-y-4">
          <h2 className="text-lg font-semibold text-white">Настройки</h2>
          
          <div className="space-y-2">
            <label className="block text-sm text-gray-300">
              Шаг таймера отдыха (секунды)
            </label>
            <p className="text-xs text-gray-500">
              Значение, на которое изменяется таймер при нажатии +/-
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <input
                type="number"
                min="1"
                max="300"
                value={timerStepInput}
                onChange={(e) => setTimerStepInput(e.target.value)}
                className="w-24 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => {
                  if (saveStatusTimeoutRef.current) {
                    clearTimeout(saveStatusTimeoutRef.current);
                  }
                  const value = parseInt(timerStepInput, 10);
                  if (!isNaN(value) && value >= 1 && value <= 300) {
                    setSaveStatus('saving');
                    setTimerStep(value);
                    try {
                      localStorage.setItem('settings:timerStep', String(value));
                    } catch {}
                    saveStatusTimeoutRef.current = setTimeout(() => {
                      setSaveStatus('success');
                      saveStatusTimeoutRef.current = setTimeout(() => {
                        setSaveStatus('idle');
                      }, 500);
                    }, 350);
                  } else {
                    setTimerStepInput(String(timerStep));
                    setSaveStatus('idle');
                  }
                }}
                disabled={saveStatus === 'saving'}
                className="btn-glass btn-glass-sm btn-glass-primary flex items-center justify-center gap-2 min-w-[120px]"
              >
                {saveStatus === 'saving' && (
                  <span
                    aria-label="Сохранение..."
                    className="h-5 w-5 inline-block border-2 border-white/70 border-t-transparent rounded-full animate-spin"
                  />
                )}
                {saveStatus === 'success' && (
                  <svg
                    aria-label="Сохранено"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {saveStatus === 'idle' && 'Сохранить'}
              </button>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-2">
            <label className="block text-sm text-gray-300">
              Тема оформления
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleThemeToggle}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ease-out ${
                  theme === 'dark'
                    ? 'btn-glass btn-glass-primary'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  Тёмная
                </span>
              </button>
              <button
                type="button"
                onClick={handleThemeToggle}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ease-out ${
                  theme === 'light'
                    ? 'btn-glass btn-glass-primary'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Светлая
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

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

      {isWeightTrackerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsWeightTrackerOpen(false)}
          />
          <div className="relative w-full max-w-lg glass card-dark rounded-xl shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Трекер веса тела</h2>
              <button
                type="button"
                onClick={() => setIsWeightTrackerOpen(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Форма добавления */}
            <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-gray-300 font-medium">Добавить запись</p>
              <div className="flex gap-2 items-end flex-wrap">
                <div className="flex-1 min-w-[100px]">
                  <label className="block text-xs text-gray-400 mb-1">Вес (кг)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newWeight}
                    onChange={(e) => {
                      const val = e.target.value.replace('.', ',');
                      if (/^[0-9]*[,]?[0-9]*$/.test(val)) {
                        setNewWeight(val);
                      }
                    }}
                    placeholder="70,5"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex-1 min-w-[130px]">
                  <label className="block text-xs text-gray-400 mb-1">Дата</label>
                  <input
                    type="date"
                    value={newWeightDate}
                    onChange={(e) => setNewWeightDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddWeight}
                  disabled={!newWeight || savingWeight}
                  className="btn-glass btn-glass-sm btn-glass-primary disabled:opacity-50"
                >
                  {savingWeight ? '...' : 'Добавить'}
                </button>
              </div>
            </div>

            {/* Статистика */}
            {weightStats && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="p-3 rounded-lg bg-white/5 text-center">
                  <p className="text-xs text-gray-400">Текущий</p>
                  <p className="text-lg font-bold text-white">{weightStats.current.toFixed(1).replace('.', ',')} кг</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5 text-center">
                  <p className="text-xs text-gray-400">Мин</p>
                  <p className="text-lg font-bold text-green-400">{weightStats.min.toFixed(1).replace('.', ',')} кг</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5 text-center">
                  <p className="text-xs text-gray-400">Макс</p>
                  <p className="text-lg font-bold text-orange-400">{weightStats.max.toFixed(1).replace('.', ',')} кг</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5 text-center">
                  <p className="text-xs text-gray-400">Изменение</p>
                  <p className={`text-lg font-bold ${weightStats.change > 0 ? 'text-red-400' : weightStats.change < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                    {weightStats.change > 0 ? '+' : ''}{weightStats.change.toFixed(1).replace('.', ',')} кг
                  </p>
                </div>
              </div>
            )}

            {/* График */}
            {weightChartData.length > 1 && (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#9ca3af', fontSize: 10 }} 
                      axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={['dataMin - 2', 'dataMax + 2']}
                      tick={{ fill: '#9ca3af', fontSize: 10 }} 
                      axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                      tickLine={false}
                      tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(24,24,27,0.95)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value: number) => [`${value.toFixed(1).replace('.', ',')} кг`, 'Вес']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, fill: '#60a5fa' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* История */}
            <div className="space-y-2">
              <p className="text-sm text-gray-300 font-medium">История ({bodyWeights.length})</p>
              {loadingWeights ? (
                <div className="flex justify-center py-4">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              ) : bodyWeights.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Пока нет записей. Добавьте свой первый вес выше.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {bodyWeights.slice(0, 20).map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">
                          {Number(w.weight).toFixed(1).replace('.', ',')} кг
                        </span>
                        <span className="text-sm text-gray-400">
                          {new Date(w.recorded_at).toLocaleDateString('ru', { 
                            day: 'numeric', 
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteWeightConfirm(w.id)}
                        disabled={deletingWeightId === w.id}
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        {deletingWeightId === w.id ? (
                          <span className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin inline-block" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={isDeleteWeightConfirmOpen}
        onOpenChange={setIsDeleteWeightConfirmOpen}
        title="Удалить запись о весе?"
        description="Это действие необратимо."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        onConfirm={() => {
          if (weightToDelete) {
            handleDeleteWeight(weightToDelete);
          }
        }}
      />
    </div>
  );
};

export default ProfilePage;