import React, { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { WorkoutIconType } from '../components/workout-icons';

export type TemplatesImportAction = 'none' | 'onlyNew' | 'overwrite';

export type TemplateDuplicate = {
  existingId: string;
  existingName: string;
  template: any;
};

export type UseTemplatesImportExportProps = {
  userId: string | undefined;
  userEmail: string | undefined;
  setToastVariant: (variant: 'success' | 'error') => void;
  setImportSuccessMessage: (msg: string | null) => void;
  setIsImportSuccessOpen: (open: boolean) => void;
};

export type UseTemplatesImportExportReturn = {
  // Export
  isExportingTemplates: boolean;
  handleExportTemplates: () => Promise<void>;

  // Import
  isImportingTemplates: boolean;
  isTemplatesImportDialogOpen: boolean;
  pendingTemplatesNew: any[];
  pendingTemplatesDuplicates: TemplateDuplicate[];
  templatesImportAction: TemplatesImportAction;

  // Refs
  templatesFileInputRef: React.RefObject<HTMLInputElement | null>;

  // Actions
  handleStartImportTemplates: () => void;
  handleTemplatesFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleImportTemplatesOnlyNew: () => Promise<void>;
  handleImportTemplatesOverwrite: () => Promise<void>;
  closeTemplatesImportDialog: () => void;
};

const WORKOUT_ICON_VALUES: WorkoutIconType[] = [
  'upper', 'lower', 'push', 'pull', 'legs', 'arms', 'shoulders', 'chest', 'back', 'core', 'cardio', 'full'
];

function sanitizeIcon(icon: any): WorkoutIconType | null {
  if (typeof icon !== 'string') return null;
  const trimmed = icon.trim() as WorkoutIconType;
  return WORKOUT_ICON_VALUES.includes(trimmed) ? trimmed : null;
}

export function useTemplatesImportExport({
  userId,
  userEmail,
  setToastVariant,
  setImportSuccessMessage,
  setIsImportSuccessOpen,
}: UseTemplatesImportExportProps): UseTemplatesImportExportReturn {
  const db = supabase as any;

  const [isExportingTemplates, setIsExportingTemplates] = useState(false);
  const [isImportingTemplates, setIsImportingTemplates] = useState(false);
  const [isTemplatesImportDialogOpen, setIsTemplatesImportDialogOpen] = useState(false);
  const [pendingTemplatesNew, setPendingTemplatesNew] = useState<any[]>([]);
  const [pendingTemplatesDuplicates, setPendingTemplatesDuplicates] = useState<TemplateDuplicate[]>([]);
  const [templatesImportAction, setTemplatesImportAction] = useState<TemplatesImportAction>('none');

  const templatesFileInputRef = useRef<HTMLInputElement | null>(null);

  const importTemplatesFromPayload = useCallback(async (payload: any) => {
    if (!userId) return;

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
          user_id: userId,
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
  }, [userId, db, setToastVariant, setImportSuccessMessage, setIsImportSuccessOpen]);

  const handleExportTemplates = useCallback(async () => {
    if (!userId) return;

    setIsExportingTemplates(true);
    try {
      const { data: templates, error: templatesError } = await db
        .from('workout_templates')
        .select(`
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
        `)
        .eq('user_id', userId)
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
          id: userId,
          email: userEmail,
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
  }, [userId, userEmail, db]);

  const handleStartImportTemplates = useCallback(() => {
    if (!userId || isImportingTemplates) return;
    if (templatesFileInputRef.current) {
      templatesFileInputRef.current.value = '';
      templatesFileInputRef.current.click();
    }
  }, [userId, isImportingTemplates]);

  const handleTemplatesFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
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
      if (!userId) {
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
        .eq('user_id', userId);

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
      const duplicates: TemplateDuplicate[] = [];

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
  }, [userId, db, importTemplatesFromPayload, setToastVariant, setImportSuccessMessage, setIsImportSuccessOpen]);

  const handleImportTemplatesOnlyNew = useCallback(async () => {
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
  }, [pendingTemplatesNew, importTemplatesFromPayload, setToastVariant, setImportSuccessMessage, setIsImportSuccessOpen]);

  const handleImportTemplatesOverwrite = useCallback(async () => {
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
  }, [pendingTemplatesDuplicates, pendingTemplatesNew, db, importTemplatesFromPayload, setToastVariant, setImportSuccessMessage, setIsImportSuccessOpen]);

  const closeTemplatesImportDialog = useCallback(() => {
    setIsTemplatesImportDialogOpen(false);
    setPendingTemplatesNew([]);
    setPendingTemplatesDuplicates([]);
  }, []);

  return {
    isExportingTemplates,
    handleExportTemplates,
    isImportingTemplates,
    isTemplatesImportDialogOpen,
    pendingTemplatesNew,
    pendingTemplatesDuplicates,
    templatesImportAction,
    templatesFileInputRef,
    handleStartImportTemplates,
    handleTemplatesFileChange,
    handleImportTemplatesOnlyNew,
    handleImportTemplatesOverwrite,
    closeTemplatesImportDialog,
  };
}
