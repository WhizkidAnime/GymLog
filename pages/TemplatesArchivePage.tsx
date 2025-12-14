import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../hooks/use-i18n';
import { usePageState } from '../hooks/usePageState';
import type { WorkoutTemplate } from '../types/database.types';
import ConfirmDialog from '../components/confirm-dialog';
import { WorkoutLoadingOverlay } from '../components/workout-loading-overlay';
import { WORKOUT_ICONS, WorkoutIconType } from '../components/workout-icons';

const TemplateDeleteForeverButton: React.FC<{
  id: string;
  name: string;
  onDeleted: (id: string) => void;
}> = ({ id, name, onDeleted }) => {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const confirmDelete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { error: exErr } = await supabase
        .from('template_exercises')
        .delete()
        .eq('template_id', id);
      if (exErr) throw exErr;

      const { error: tErr } = await supabase
        .from('workout_templates')
        .delete()
        .eq('id', id);
      if (tErr) throw tErr;

      onDeleted(id);
      setOpen(false);
    } catch (e) {
      console.error('Error deleting template forever', e);
      alert(t.templates.deleteError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={busy}
        className="btn-glass btn-glass-danger btn-glass-sm disabled:opacity-50"
      >
        {busy ? t.templates.deleting : t.templates.delete}
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t.templates.deleteConfirm}
        description={t.templates.deleteConfirmDesc}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        variant="danger"
        onConfirm={confirmDelete}
      />
    </>
  );
};

const TemplatesArchivePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [deleteSelectedConfirmOpen, setDeleteSelectedConfirmOpen] = useState(false);

  const [pageState, setPageState] = usePageState({
    key: 'templates-archive-page',
    initialState: {
      templates: [] as WorkoutTemplate[],
      loading: true,
    },
    ttl: 30 * 60 * 1000,
  });

  const { templates, loading } = pageState;

  const areAllTemplatesSelected =
    templates.length > 0 && selectedTemplateIds.length === templates.length;

  const setTemplates = (next: WorkoutTemplate[]) => {
    setPageState(prev => ({ ...prev, templates: next, loading: false }));
  };

  const setLoading = (next: boolean) => {
    setPageState(prev => ({ ...prev, loading: next }));
  };

  const fetchTemplates = React.useCallback(async () => {
    if (!user) return;

    const hasData = pageState.templates.length > 0;
    if (!hasData) {
      setLoading(true);
    }

    const { data, error } = await supabase
      .from('workout_templates')
      .select('id, name, created_at, user_id, icon, is_archived')
      .eq('user_id', user.id)
      .eq('is_archived', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching archived templates:', error);
      alert(t.templates.archiveLoadError);
    } else {
      setTemplates(data || []);
    }
  }, [user, pageState.templates.length]);

  useEffect(() => {
    fetchTemplates();
  }, [user, fetchTemplates]);

  const toggleTemplateSelection = (id: string) => {
    setSelectedTemplateIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllTemplates = () => {
    if (templates.length === 0) return;
    setSelectedTemplateIds(prev => (prev.length === templates.length ? [] : templates.map(t => t.id)));
  };

  const clearTemplateSelection = () => setSelectedTemplateIds([]);

  const handleRestoreSelected = async () => {
    if (!user) return;
    if (selectedTemplateIds.length === 0) return;
    if (isRestoring) return;

    setIsRestoring(true);
    try {
      const { error } = await supabase
        .from('workout_templates')
        .update({ is_archived: false })
        .in('id', selectedTemplateIds);

      if (error) throw error;

      setPageState(prev => ({
        ...prev,
        templates: prev.templates.filter(t => !selectedTemplateIds.includes(t.id)),
      }));
      setSelectedTemplateIds([]);
      fetchTemplates();
    } catch (e) {
      console.error('Error restoring templates', e);
      alert(t.templates.restoreError);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!user) return;
    if (selectedTemplateIds.length === 0) return;
    if (isDeletingSelected) return;

    setIsDeletingSelected(true);
    try {
      const ids = selectedTemplateIds;

      const { error: exErr } = await supabase
        .from('template_exercises')
        .delete()
        .in('template_id', ids);
      if (exErr) throw exErr;

      const { error: tErr } = await supabase
        .from('workout_templates')
        .delete()
        .in('id', ids);
      if (tErr) throw tErr;

      setPageState(prev => ({
        ...prev,
        templates: prev.templates.filter(t => !ids.includes(t.id)),
      }));
      setSelectedTemplateIds([]);
      setDeleteSelectedConfirmOpen(false);
      fetchTemplates();
    } catch (e) {
      console.error('Error deleting selected templates', e);
      alert(t.templates.deleteError);
    } finally {
      setIsDeletingSelected(false);
    }
  };

  const handleDeleted = (deletedId: string) => {
    setPageState(prev => ({ ...prev, templates: prev.templates.filter(t => t.id !== deletedId) }));
    fetchTemplates();
  };

  return (
    <div className="p-4 pb-24">
      <div className="mb-4 glass card-dark p-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/templates')}
          className="shrink-0 p-2 rounded-full border border-transparent text-white hover:border-white transition-colors"
          aria-label={t.common.back}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-center flex-1">{t.templates.archive}</h1>
      </div>

      {!loading && templates.length > 0 && (
        <div className="mb-4 glass card-dark p-4">
          <div className="flex items-center justify-between text-sm text-gray-300">
            <button
              type="button"
              onClick={selectAllTemplates}
              className="inline-flex items-center gap-3"
            >
              <div
                className={`archive-checkbox w-6 h-6 rounded-md border flex items-center justify-center ${
                  areAllTemplatesSelected ? 'bg-green-500 border-green-400' : 'border-white/40'
                }`}
              >
                {areAllTemplatesSelected && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-white"
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
              <span>{t.templates.selectAll}</span>
            </button>
            <button
              type="button"
              onClick={clearTemplateSelection}
              disabled={selectedTemplateIds.length === 0}
              className="text-sm text-gray-400 hover:text-gray-200 disabled:opacity-40"
            >
              {t.templates.clearSelection}
            </button>
          </div>
          <div className="mt-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRestoreSelected}
                disabled={selectedTemplateIds.length === 0 || isRestoring || isDeletingSelected}
                className="btn-glass btn-glass-full btn-glass-md btn-glass-primary disabled:opacity-50"
              >
                {isRestoring ? t.templates.restoring : t.templates.restoreSelected}
              </button>
              <button
                type="button"
                onClick={() => setDeleteSelectedConfirmOpen(true)}
                disabled={selectedTemplateIds.length === 0 || isRestoring || isDeletingSelected}
                className="btn-glass btn-glass-full btn-glass-md btn-glass-danger disabled:opacity-50"
              >
                {isDeletingSelected ? t.templates.deletingSelected : t.templates.deleteSelected}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <WorkoutLoadingOverlay message={t.templates.archiveLoading} />
      ) : templates.length === 0 ? (
        <div className="mt-4 p-8 text-center glass">
          <p className="text-gray-500">{t.templates.archiveEmpty}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(template => (
            <div
              key={template.id}
              className="relative p-4 glass card-dark flex items-center justify-between gap-3"
            >
              <button
                type="button"
                onClick={() => toggleTemplateSelection(template.id)}
                className="shrink-0"
                aria-label={t.templates.selectAll}
              >
                <div
                  className={`archive-checkbox w-7 h-7 rounded-md border flex items-center justify-center ${
                    selectedTemplateIds.includes(template.id)
                      ? 'bg-green-500 border-green-400'
                      : 'border-white/40'
                  }`}
                >
                  {selectedTemplateIds.includes(template.id) && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-white"
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
              <Link
                to={`/templates/${template.id}`}
                state={{ from: 'archive' }}
                className="text-left flex-1 hover:opacity-90 flex items-center gap-3"
              >
                {template.icon && WORKOUT_ICONS[template.icon as WorkoutIconType] && (
                  <div style={{ color: WORKOUT_ICONS[template.icon as WorkoutIconType].color }}>
                    {React.createElement(WORKOUT_ICONS[template.icon as WorkoutIconType].component, { size: 24 })}
                  </div>
                )}
                <h2 className="font-semibold text-lg text-gray-100">{template.name}</h2>
              </Link>
              <div className="flex items-center gap-2">
                <TemplateDeleteForeverButton id={template.id} name={template.name} onDeleted={handleDeleted} />
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteSelectedConfirmOpen}
        onOpenChange={setDeleteSelectedConfirmOpen}
        title={t.templates.deleteConfirm}
        description={t.templates.deleteConfirmDesc}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        variant="danger"
        onConfirm={handleDeleteSelected}
      />
    </div>
  );
};

export default TemplatesArchivePage;
