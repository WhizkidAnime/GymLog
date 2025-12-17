import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { extractTemplateFromLink, isValidTemplateLink } from '../utils/template-sharing';
import type { ShareableTemplate } from '../utils/template-sharing';
import TemplateSavedDialog from '../components/template-saved-dialog';
import { useI18n } from '../hooks/use-i18n';

type TemplateExerciseForCompare = {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  position: number;
};

type NormalizedTemplate = {
  name: string;
  exercises: TemplateExerciseForCompare[];
};

function normalizeTemplateExercises(
  exercises: Array<{
    name?: string;
    sets?: number;
    reps?: string;
    rest_seconds?: number;
    position?: number;
  }> | null | undefined,
): TemplateExerciseForCompare[] {
  if (!Array.isArray(exercises)) return [];

  return exercises
    .map((ex, index) => ({
      name: typeof ex.name === 'string' ? ex.name.trim() : '',
      sets: typeof ex.sets === 'number' ? ex.sets : 0,
      reps: typeof ex.reps === 'string' ? ex.reps.trim() : '',
      rest_seconds: typeof ex.rest_seconds === 'number' ? ex.rest_seconds : 0,
      position: typeof ex.position === 'number' ? ex.position : index + 1,
    }))
    .sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return a.name.localeCompare(b.name);
    });
}

function normalizeShareableTemplateForCompare(template: ShareableTemplate): NormalizedTemplate {
  return {
    name: typeof template.name === 'string' ? template.name.trim() : '',
    exercises: normalizeTemplateExercises(template.exercises as any),
  };
}

function normalizeDbTemplateForCompare(dbTemplate: any): NormalizedTemplate {
  return {
    name: typeof dbTemplate?.name === 'string' ? dbTemplate.name.trim() : '',
    exercises: normalizeTemplateExercises(dbTemplate?.template_exercises as any),
  };
}

function areTemplatesStructurallyEqual(a: NormalizedTemplate, b: NormalizedTemplate): boolean {
  if (a.name !== b.name) return false;
  if (a.exercises.length !== b.exercises.length) return false;

  for (let i = 0; i < a.exercises.length; i++) {
    const ea = a.exercises[i];
    const eb = b.exercises[i];

    if (
      ea.name !== eb.name ||
      ea.sets !== eb.sets ||
      ea.reps !== eb.reps ||
      ea.rest_seconds !== eb.rest_seconds ||
      ea.position !== eb.position
    ) {
      return false;
    }
  }

  return true;
}

function normalizeTemplateNameForComparison(name: string | null | undefined): string {
  return typeof name === 'string' ? name.trim().toLowerCase() : '';
}

const TemplateImportPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [template, setTemplate] = useState<ShareableTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [checkingClipboard, setCheckingClipboard] = useState(false);
  const [importInfoOpen, setImportInfoOpen] = useState(false);
  const [importInfoMessage, setImportInfoMessage] = useState<string | null>(null);
  const [importInfoVariant, setImportInfoVariant] = useState<'success' | 'error'>('error');
  const [nameConflict, setNameConflict] = useState<{
    existingId: string;
    existingName: string;
    existingExercises: any[];
    newTemplate: ShareableTemplate;
  } | null>(null);

  // Проверяем URL при загрузке
  useEffect(() => {
    const loadFromUrl = async () => {
      const codeParam = searchParams.get('s');
      const dataParam = searchParams.get('data');

      if (!codeParam && !dataParam) {
        return;
      }

      try {
        const fullUrl = window.location.href;
        const extracted = await extractTemplateFromLink(fullUrl);
        if (extracted) {
          const isFullDuplicate = await checkForFullDuplicateOnLoad(extracted);
          if (isFullDuplicate) {
            setTemplate(null);
            setError(null);
            return;
          }
          setTemplate(extracted);
          setError(null);
        } else {
          setError(t.templateImport.invalidLink);
        }
      } catch (err: any) {
        setError(err.message || t.templateImport.loadError);
      }
    };

    void loadFromUrl();
  }, [searchParams]);

  // Автоматическая проверка буфера обмена при открытии страницы без параметров
  useEffect(() => {
    const codeParam = searchParams.get('s');
    const dataParam = searchParams.get('data');
    if (!codeParam && !dataParam && !template && !error) {
      checkClipboard();
    }
  }, [searchParams, template, error]);

  const checkClipboard = async () => {
    setCheckingClipboard(true);
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        throw new Error(t.templateImport.clipboardNoAccess);
      }
      const clipboardText = await navigator.clipboard.readText();

      if (isValidTemplateLink(clipboardText)) {
        const extracted = await extractTemplateFromLink(clipboardText);
        if (extracted) {
          const isFullDuplicate = await checkForFullDuplicateOnLoad(extracted);
          if (isFullDuplicate) {
            setTemplate(null);
            setError(null);
            return;
          }
          setTemplate(extracted);
          setError(null);
        } else {
          setError(t.templateImport.clipboardInvalidLink);
        }
      } else {
        setError(t.templateImport.clipboardNoLink);
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError(t.templateImport.clipboardPermissionDenied);
      } else {
        setError(t.templateImport.clipboardReadError + err.message);
      }
    } finally {
      setCheckingClipboard(false);
    }
  };

  const checkForFullDuplicateOnLoad = async (incoming: ShareableTemplate): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {
      const db = supabase as any;
      const { data: existing, error: existingError } = await db
        .from('workout_templates')
        .select(`
          id,
          name,
          template_exercises (
            id,
            name,
            sets,
            reps,
            rest_seconds,
            position
          )
        `)
        .eq('user_id', user.id);

      if (existingError) {
        // eslint-disable-next-line no-console
        console.error('Error checking existing templates before preview:', existingError);
        setImportInfoVariant('error');
        setImportInfoMessage(t.templateImport.checkExistingError);
        setImportInfoOpen(true);
        return false;
      }

      if (existing && existing.length > 0) {
        const importedNormalized = normalizeShareableTemplateForCompare(incoming);
        let sameNameTemplate: any | null = null;

        for (const existingTemplate of existing as any[]) {
          const normalizedExisting = normalizeDbTemplateForCompare(existingTemplate);

          if (areTemplatesStructurallyEqual(normalizedExisting, importedNormalized)) {
            setImportInfoVariant('error');
            setImportInfoMessage(t.templateImport.duplicateExists);
            setImportInfoOpen(true);
            return true;
          }

          if (
            !sameNameTemplate &&
            normalizeTemplateNameForComparison(existingTemplate.name) ===
              normalizeTemplateNameForComparison(incoming.name)
          ) {
            sameNameTemplate = existingTemplate;
          }
        }

        if (sameNameTemplate) {
          setNameConflict({
            existingId: sameNameTemplate.id as string,
            existingName: (sameNameTemplate.name as string) || '',
            existingExercises: (sameNameTemplate.template_exercises || []) as any[],
            newTemplate: incoming,
          });
        }
      }

      return false;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Unexpected error while checking templates before preview:', err);
      setImportInfoVariant('error');
      setImportInfoMessage(t.templateImport.checkExistingError);
      setImportInfoOpen(true);
      return false;
    }
  };

  const performTemplateInsert = async (overwriteTemplateId?: string, overrideName?: string) => {
    if (!user || !template) return;

    const db = supabase as any;

    if (overwriteTemplateId) {
      const { error: exDelErr } = await db
        .from('template_exercises')
        .delete()
        .eq('template_id', overwriteTemplateId);
      if (exDelErr) {
        throw exDelErr;
      }

      const { error: tDelErr } = await db
        .from('workout_templates')
        .delete()
        .eq('id', overwriteTemplateId);
      if (tDelErr) {
        throw tDelErr;
      }
    }

    const { data: newTemplate, error: templateError } = await db
      .from('workout_templates')
      .insert({
        user_id: user.id,
        name: typeof overrideName === 'string' && overrideName.trim().length > 0
          ? overrideName.trim()
          : template.name,
      })
      .select()
      .single();

    if (templateError || !newTemplate) {
      throw templateError || new Error(t.templateImport.createError);
    }

    const exercises = template.exercises.map(ex => ({
      template_id: newTemplate.id,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      rest_seconds: ex.rest_seconds,
      position: ex.position,
    }));

    const { error: exercisesError } = await db
      .from('template_exercises')
      .insert(exercises);

    if (exercisesError) {
      await db.from('workout_templates').delete().eq('id', newTemplate.id);
      throw exercisesError;
    }

    navigate('/templates', { 
      state: { 
        message: t.templateImport.importSuccess.replace('{name}', template.name) 
      } 
    });
  };

  const handleImport = async () => {
    if (!user || !template || importing) return;

    setImporting(true);
    try {
      const db = supabase as any;
      const { data: existing, error: existingError } = await db
        .from('workout_templates')
        .select(`
          id,
          name,
          template_exercises (
            id,
            name,
            sets,
            reps,
            rest_seconds,
            position
          )
        `)
        .eq('user_id', user.id);

      if (existingError) {
        console.error('Error checking existing templates before import:', existingError);
        setImportInfoVariant('error');
        setImportInfoMessage(t.templateImport.checkExistingError);
        setImportInfoOpen(true);
        return;
      }

      if (existing && existing.length > 0) {
        const importedNormalized = normalizeShareableTemplateForCompare(template);

        let hasFullDuplicate = false;
        let sameNameTemplate: any | null = null;

        for (const existingTemplate of existing as any[]) {
          const normalizedExisting = normalizeDbTemplateForCompare(existingTemplate);

          if (
            !sameNameTemplate &&
            normalizeTemplateNameForComparison(existingTemplate.name) ===
              normalizeTemplateNameForComparison(template.name)
          ) {
            sameNameTemplate = existingTemplate;
          }

          if (areTemplatesStructurallyEqual(normalizedExisting, importedNormalized)) {
            hasFullDuplicate = true;
            break;
          }
        }

        if (hasFullDuplicate) {
          setImportInfoVariant('error');
          setImportInfoMessage(t.templateImport.duplicateExists);
          setImportInfoOpen(true);
          return;
        }

        if (sameNameTemplate) {
          setNameConflict({
            existingId: sameNameTemplate.id as string,
            existingName: (sameNameTemplate.name as string) || '',
            existingExercises: (sameNameTemplate.template_exercises || []) as any[],
            newTemplate: template,
          });
          return;
        }
      }

      await performTemplateInsert();
    } catch (err: any) {
      console.error('Error importing template:', err);
      alert(t.templateImport.importError + (err?.message || String(err)));
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmReplace = async () => {
    if (!nameConflict || !user || !template) {
      setNameConflict(null);
      return;
    }

    setImporting(true);
    try {
      const overwriteId = nameConflict.existingId;
      setNameConflict(null);
      await performTemplateInsert(overwriteId);
    } catch (err: any) {
      console.error('Error replacing template:', err);
      setImportInfoVariant('error');
      setImportInfoMessage(t.templateImport.replaceError);
      setImportInfoOpen(true);
    } finally {
      setImporting(false);
    }
  };

  const handleCreateNewWithSameName = async () => {
    if (!nameConflict || !user || !template) {
      setNameConflict(null);
      return;
    }

    setImporting(true);
    try {
      const baseName =
        typeof nameConflict.newTemplate?.name === 'string'
          ? nameConflict.newTemplate.name.trim()
          : '';
      const newName = baseName ? `${baseName} (1)` : `${t.templateImport.newTemplateName} (1)`;

      setNameConflict(null);
      await performTemplateInsert(undefined, newName);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Error creating new template with same name:', err);
      setImportInfoVariant('error');
      setImportInfoMessage(t.templateImport.createNewError);
      setImportInfoOpen(true);
    } finally {
      setImporting(false);
    }
  };

  const handleManualInput = async () => {
    const pasted = window.prompt(t.templateImport.pastePrompt);
    if (!pasted) return;
    if (!isValidTemplateLink(pasted)) {
      setError(t.templateImport.invalidPastedLink);
      return;
    }
    const extracted = await extractTemplateFromLink(pasted);
    if (extracted) {
      const isFullDuplicate = await checkForFullDuplicateOnLoad(extracted);
      if (isFullDuplicate) {
        setTemplate(null);
        setError(null);
        return;
      }
      setTemplate(extracted);
      setError(null);
    } else {
      setError(t.templateImport.extractError);
    }
  };

  if (!user) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="glass card-dark p-8 rounded-xl text-center">
          <p className="text-gray-300 mb-4">{t.templateImport.loginRequired}</p>
          <button
            onClick={() => navigate('/login')}
            className="btn-glass btn-glass-md btn-glass-primary"
          >
            {t.templateImport.login}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-4 glass card-dark p-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/templates')}
          className="shrink-0 p-2 rounded-full border border-transparent text-white hover:border-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-center flex-1">{t.templateImport.title}</h1>
      </div>

      {checkingClipboard && (
        <div className="glass card-dark p-8 rounded-xl">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-white text-center">{t.templateImport.checkingClipboard}</p>
          </div>
        </div>
      )}

      {error && !checkingClipboard && (
        <div className="glass card-dark p-6 rounded-xl mb-4">
          <div className="flex items-start gap-3 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-300">{error}</p>
          </div>
          <div className="space-y-2">
            <button
              onClick={checkClipboard}
              className="btn-glass btn-glass-full btn-glass-md btn-glass-primary"
            >
              {t.templateImport.checkClipboardAgain}
            </button>
            <button
              onClick={handleManualInput}
              className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary"
            >
              {t.templateImport.pasteManually}
            </button>
          </div>
        </div>
      )}

      {template && !checkingClipboard && (
        <div className="space-y-4">
          <div className="glass card-dark p-6 rounded-xl">
            <h2 className="text-xl font-bold text-white mb-4">{template.name}</h2>
            <div className="space-y-3">
              <p className="text-gray-300">
                {t.templateImport.exercisesCount}: <span className="font-semibold text-white">{template.exercises.length}</span>
              </p>
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">{t.templateImport.exercisesList}</h3>
                <div className="space-y-2">
                  {template.exercises.map((ex, i) => (
                    <div key={i} className="text-sm text-gray-300 pl-4 border-l-2 border-white/20">
                      <div className="font-medium text-white">{ex.name}</div>
                      <div className="text-xs text-gray-400">
                        {t.templateImport.setsReps.replace('{sets}', String(ex.sets)).replace('{reps}', ex.reps).replace('{rest}', String(ex.rest_seconds))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={importing}
            className="btn-glass btn-glass-full btn-glass-lg btn-glass-primary disabled:opacity-50"
          >
            {importing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>{t.templateImport.importing}</span>
              </div>
            ) : (
              t.templateImport.addTemplate
            )}
          </button>
          <button
            onClick={() => navigate('/templates')}
            disabled={importing}
            className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary disabled:opacity-50"
          >
            {t.templateImport.cancel}
          </button>
        </div>
      )}

      {!template && !error && !checkingClipboard && (
        <div className="glass card-dark p-8 rounded-xl text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400 mb-4">
            {t.templateImport.copyLinkHint}
          </p>
          <button
            onClick={checkClipboard}
            className="btn-glass btn-glass-md btn-glass-primary"
          >
            {t.templateImport.importFromClipboard}
          </button>
          <div className="mt-2">
            <button
              onClick={handleManualInput}
              className="btn-glass btn-glass-md btn-glass-secondary"
            >
              {t.templateImport.pasteManually}
            </button>
          </div>
        </div>
      )}

      {nameConflict && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (importing) return;
              setNameConflict(null);
            }}
          />
          <div className="relative w-full max-w-md glass card-dark rounded-xl shadow-xl p-5 space-y-4">
            <div className="flex justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white text-center">{t.templateImport.conflictTitle}</h2>
            <p className="text-sm text-gray-300 text-center">
              {t.templateImport.conflictDesc.replace('{name}', nameConflict.existingName || t.templateImport.noName)}
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="font-semibold text-gray-200 mb-1">{t.templateImport.existing}</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {nameConflict.existingExercises
                    .slice()
                    .sort((a: any, b: any) => {
                      const aPos = typeof a.position === 'number' ? a.position : 0;
                      const bPos = typeof b.position === 'number' ? b.position : 0;
                      if (aPos !== bPos) return aPos - bPos;
                      const aName = typeof a.name === 'string' ? a.name : '';
                      const bName = typeof b.name === 'string' ? b.name : '';
                      return aName.localeCompare(bName);
                    })
                    .map((ex: any, index: number) => (
                      <div
                        key={ex.id ?? `${ex.name || 'exercise'}-${index}`}
                        className="text-xs text-gray-300 pl-3 border-l border-white/10"
                      >
                        <div className="font-medium text-white">{ex.name || t.templateImport.noName}</div>
                        <div className="text-[11px] text-gray-400">
                          {t.templateImport.setsReps
                            .replace('{sets}', String(typeof ex.sets === 'number' ? ex.sets : '-'))
                            .replace('{reps}', typeof ex.reps === 'string' ? ex.reps : '-')
                            .replace('{rest}', String(typeof ex.rest_seconds === 'number' ? ex.rest_seconds : '-'))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <div className="font-semibold text-gray-200 mb-1">{t.templateImport.fromLink}</div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {nameConflict.newTemplate.exercises
                    .slice()
                    .sort((a, b) => {
                      if (a.position !== b.position) return a.position - b.position;
                      return a.name.localeCompare(b.name);
                    })
                    .map((ex, index) => (
                      <div
                        key={`${ex.name || 'new-exercise'}-${index}`}
                        className="text-xs text-gray-300 pl-3 border-l border-white/10"
                      >
                        <div className="font-medium text-white">{ex.name || t.templateImport.noName}</div>
                        <div className="text-[11px] text-gray-400">
                          {t.templateImport.setsReps.replace('{sets}', String(ex.sets)).replace('{reps}', ex.reps).replace('{rest}', String(ex.rest_seconds))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleConfirmReplace}
                disabled={importing}
                className="btn-glass btn-glass-full btn-glass-md btn-glass-primary disabled:opacity-50"
              >
                {importing ? t.templateImport.replacing : t.templateImport.replaceExisting}
              </button>
              <button
                type="button"
                onClick={handleCreateNewWithSameName}
                disabled={importing}
                className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary disabled:opacity-50"
              >
                {t.templateImport.createNew} ("{nameConflict.newTemplate.name}" → "{nameConflict.newTemplate.name} (1)")
              </button>
              <button
                type="button"
                onClick={() => setNameConflict(null)}
                disabled={importing}
                className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary disabled:opacity-50"
              >
                {t.templateImport.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      <TemplateSavedDialog
        open={importInfoOpen}
        onOpenChange={(open) => {
          if (!open) {
            setImportInfoOpen(false);
            setImportInfoMessage(null);
          }
        }}
        onClose={() => {
          setImportInfoOpen(false);
          setImportInfoMessage(null);
        }}
        message={
          importInfoMessage ||
          t.templateImport.importError
        }
        variant={importInfoVariant}
      />
    </div>
  );
};

export default TemplateImportPage;


