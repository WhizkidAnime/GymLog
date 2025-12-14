import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../hooks/use-i18n';
import { usePageState } from '../hooks/usePageState';
import type { WorkoutTemplate } from '../types/database.types';
import ConfirmDialog from '../components/confirm-dialog';
import { generateShareLink } from '../utils/template-sharing';
import TemplateSavedDialog from '../components/template-saved-dialog';
import { WorkoutLoadingOverlay } from '../components/workout-loading-overlay';
import { useWorkoutActionsMenu } from '../hooks/use-workout-actions-menu';
import { WORKOUT_ICONS, WorkoutIconType } from '../components/workout-icons';

import ImportIcon from '../src/assets/icons/import.svg';
import ArchiveIcon from '../src/assets/icons/archive.svg';

const TemplateDeleteButton: React.FC<{ 
  id: string; 
  name: string;
  onDeleted: (id: string) => void;
  onArchived: (id: string) => void;
  onShare: (id: string, name: string) => void;
}> = ({ id, name, onDeleted, onArchived, onShare }) => {
  const { t } = useI18n();
  const [busy, setBusy] = React.useState(false);
  const [archiving, setArchiving] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const {
    isActionsOpen,
    menuPos,
    actionsRef,
    actionsBtnRef,
    toggleActions,
    closeActions,
  } = useWorkoutActionsMenu();

  const handleShareClick = () => {
    closeActions();
    onShare(id, name);
  };

  const handleDeleteClick = () => {
    closeActions();
    setOpen(true);
  };

  const handleArchiveClick = async () => {
    if (archiving) return;
    closeActions();
    setArchiving(true);
    try {
      const { error } = await supabase
        .from('workout_templates')
        .update({ is_archived: true })
        .eq('id', id);
      if (error) throw error;
      onArchived(id);
    } catch (e) {
      console.error('Error archiving template', e);
      alert(t.templates.archiveError);
    } finally {
      setArchiving(false);
    }
  };

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

      // Оптимистично обновляем список на клиенте и закрываем диалог
      onDeleted(id);
      setOpen(false);
    } catch (e) {
      console.error('Error deleting template', e);
      alert(t.templates.deleteError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          ref={actionsBtnRef}
          onClick={toggleActions}
          className="p-2 text-white hover:text-gray-300 transition-colors"
          aria-label={t.templates.menuLabel}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8c1.1 0 2-1 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 1-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 1-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>
        {isActionsOpen && menuPos && createPortal(
          <div
            ref={actionsRef}
            className="fixed menu-popover space-y-0.5"
            style={{ top: menuPos.top, left: menuPos.left, width: 192 }}
            role="menu"
          >
            <button
              onClick={handleShareClick}
              className="w-full text-left px-4 py-2 text-sm text-gray-100 hover:bg-white/10 transition-colors rounded-lg"
            >
              {t.templates.share}
            </button>
            <button
              onClick={handleArchiveClick}
              disabled={archiving}
              className="w-full text-left px-4 py-2 text-sm text-gray-100 hover:bg-white/10 disabled:opacity-50 transition-colors rounded-lg"
            >
              {archiving ? t.templates.archiving : t.templates.addToArchive}
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={busy}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors rounded-lg"
            >
              {busy ? t.templates.deleting : t.templates.delete}
            </button>
          </div>,
          document.body
        )}
      </div>
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

const TemplatesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [shareLinkModalOpen, setShareLinkModalOpen] = useState(false);
  const [currentShareLink, setCurrentShareLink] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [currentTemplateName, setCurrentTemplateName] = useState<string | null>(null);

  const [pageState, setPageState] = usePageState({
    key: 'templates-page',
    initialState: {
      templates: [] as WorkoutTemplate[],
      loading: true,
    },
    ttl: 30 * 60 * 1000,
  });

  const { templates, loading } = pageState;

  const setTemplates = (templates: WorkoutTemplate[]) => {
    setPageState(prev => ({ ...prev, templates, loading: false }));
  };

  const setLoading = (loading: boolean) => {
    setPageState(prev => ({ ...prev, loading }));
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
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
    } else {
      setTemplates(data || []);
    }
  }, [user, pageState.templates.length]);

  const handleDeleted = (deletedId: string) => {
    // Удаляем из локального состояния сразу и перезапрашиваем список в фоне
    setPageState(prev => ({ ...prev, templates: prev.templates.filter(t => t.id !== deletedId) }));
    fetchTemplates();
  };

  const handleArchived = (archivedId: string) => {
    setPageState(prev => ({ ...prev, templates: prev.templates.filter(t => t.id !== archivedId) }));
    fetchTemplates();
  };

  // Копирование с fallback для iOS/Safari
  const copyToClipboardWithFallback = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return { ok: true } as const;
      }
    } catch (err) {
      // fallthrough к execCommand
      console.warn('clipboard writeText failed:', err);
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(ta);
      if (successful) return { ok: true } as const;
      return { ok: false, reason: 'execCommand returned false' } as const;
    } catch (err: any) {
      return { ok: false, reason: String(err) } as const;
    }
  };

  const handleShare = async (templateId: string, templateName: string) => {
    setSharing(true);
    try {
      const { data: exercises, error } = await supabase
        .from('template_exercises')
        .select('name, sets, reps, rest_seconds, position')
        .eq('template_id', templateId)
        .order('position');

      if (error) throw error;

      if (!exercises || exercises.length === 0) {
        alert(t.templates.emptyTemplateError);
        return;
      }

      const shareLink = await generateShareLink({
        name: templateName,
        exercises: exercises,
      });

      // Не копируем автоматически — откроем модал с кнопкой копирования
      setCurrentShareLink(shareLink);
      setShareLinkModalOpen(true);
      setCurrentTemplateName(templateName);
    } catch (error: any) {
      console.error('Error sharing template:', error);
      alert(t.templates.shareError + (error?.message || String(error)));
    } finally {
      setSharing(false);
    }
  };

  useEffect(() => {
    // Всегда обновляем данные при входе на страницу, чтобы отразить свежесозданные шаблоны
    // При наличии кэшированных данных показываем их сразу и обновляем в фоне
    fetchTemplates();
  }, [user, fetchTemplates]);

  useEffect(() => {
    const channel = supabase
      .channel('workout_templates_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workout_templates',
        filter: user ? `user_id=eq.${user.id}` : undefined
      }, () => {
        (async () => {
          if (!user) return;
          const { data } = await supabase
            .from('workout_templates')
            .select('id, name, created_at, user_id, icon, is_archived')
            .eq('user_id', user.id)
            .eq('is_archived', false)
            .order('created_at', { ascending: false });
          setTemplates(data || []);
        })();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="p-4 pb-24">
      <div className="flex items-end justify-between mb-4">
        <h1 className="text-3xl font-bold">{t.templates.title}</h1>
        <Link
          to="/templates/archive"
          className="archive-icon-link px-2 pt-2 pb-[5px] transition-colors"
          aria-label={t.templates.archive}
          title={t.templates.archive}
        >
          <img src={ArchiveIcon} alt="" className="archive-icon-img h-6 w-6" />
        </Link>
      </div>
      
      {shareSuccess && (
        <TemplateSavedDialog
          open={!!shareSuccess}
          onOpenChange={setShareSuccess}
          templateName={shareSuccess}
        />
      )}

      {loading ? (
        <WorkoutLoadingOverlay message={t.templates.loading} />
      ) : templates.length === 0 ? (
        <div className="mt-4 p-8 text-center glass">
          <p className="text-gray-500">{t.templates.empty}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(template => (
            <div
              key={template.id}
              className="relative p-4 glass card-dark flex items-center justify-between gap-3"
            >
                <button
                  onClick={() => window.location.hash = `#/templates/${template.id}`}
                  className="text-left flex-1 hover:opacity-90 flex items-center gap-3"
                >
                  {template.icon && WORKOUT_ICONS[template.icon as WorkoutIconType] && (
                    <div style={{ color: WORKOUT_ICONS[template.icon as WorkoutIconType].color }}>
                      {React.createElement(WORKOUT_ICONS[template.icon as WorkoutIconType].component, { size: 24 })}
                    </div>
                  )}
                  <h2 className="font-semibold text-lg text-gray-100">{template.name}</h2>
                </button>
                <TemplateDeleteButton 
                  id={template.id} 
                  name={template.name}
                  onDeleted={handleDeleted}
                  onArchived={handleArchived}
                  onShare={handleShare}
                />
            </div>
          ))}
        </div>
      )}

      <div className="fixed left-0 right-0 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-30 flex justify-center gap-3">
        <Link
          to="/templates/new"
          className="glass-button-create"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </Link>
        <button
          onClick={() => navigate('/templates/import')}
          className="glass-button-create"
          title={t.templates.importTemplate}
        >
          <img src={ImportIcon} alt={t.templates.importTemplate} className="h-5 w-5" />
        </button>
      </div>

      {sharing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="glass card-dark p-6 rounded-xl">
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
              </div>
              <p className="text-white">{t.templates.generatingLink}</p>
            </div>
          </div>
        </div>
      )}

      {shareLinkModalOpen && currentShareLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="glass card-dark p-6 rounded-xl max-w-lg w-[92%] max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2">{t.templates.shareTitle}</h3>
            <textarea
              readOnly
              value={currentShareLink}
              rows={3}
              onFocus={(e) => e.currentTarget.select()}
              className="mb-4 w-full resize-none bg-black/30 text-gray-100 rounded-md p-3 font-mono text-xs leading-relaxed break-all max-h-[40vh] overflow-y-auto"
            />
            <div className="flex gap-2 justify-center">
              <button
                onClick={async () => {
                  if (!currentShareLink) return;
                  setCopying(true);
                  const res = await copyToClipboardWithFallback(currentShareLink);
                  setCopying(false);
                  if (res.ok) {
                    setShareSuccess(`${currentTemplateName}`);
                    setTimeout(() => setShareSuccess(null), 2000);
                    setShareLinkModalOpen(false);
                  } else {
                    alert(t.templates.copyError + '\n\nError: ' + (res as any).reason);
                  }
                }}
                className="glass-button-create"
              >
                {copying ? t.common.copying : t.common.copy}
              </button>
              <button
                onClick={() => setShareLinkModalOpen(false)}
                className="glass-button-danger"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;
