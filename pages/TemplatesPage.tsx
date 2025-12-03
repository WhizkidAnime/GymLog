import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePageState } from '../hooks/usePageState';
import type { WorkoutTemplate } from '../types/database.types';
import ConfirmDialog from '../components/confirm-dialog';
import { generateShareLink } from '../utils/template-sharing';
import TemplateSavedDialog from '../components/template-saved-dialog';
import { WorkoutLoadingOverlay } from '../components/workout-loading-overlay';
import { useWorkoutActionsMenu } from '../hooks/use-workout-actions-menu';
import { WORKOUT_ICONS, WorkoutIconType } from '../components/workout-icons';

import ImportIcon from '../src/assets/icons/import.svg';

const TemplateDeleteButton: React.FC<{ 
  id: string; 
  name: string;
  onDeleted: (id: string) => void;
  onShare: (id: string, name: string) => void;
}> = ({ id, name, onDeleted, onShare }) => {
  const [busy, setBusy] = React.useState(false);
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
      alert('Не удалось удалить шаблон.');
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
          aria-label="Меню шаблона"
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
              Поделиться
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={busy}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors rounded-lg"
            >
              {busy ? 'Удаление...' : 'Удалить'}
            </button>
          </div>,
          document.body
        )}
      </div>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Удалить шаблон?"
        description="Шаблон и все его упражнения будут удалены. Действие необратимо."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        onConfirm={confirmDelete}
      />
    </>
  );
};

const TemplatesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      .select('id, name, created_at, user_id, icon')
      .eq('user_id', user.id)
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
        alert('Этот шаблон пуст. Добавьте упражнения перед тем, как делиться.');
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
      alert('Не удалось сгенерировать ссылку: ' + (error?.message || String(error)));
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
            .select('id, name, created_at, user_id, icon')
            .eq('user_id', user.id)
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
      <div className="relative flex justify-start items-center mb-4">
        <h1 className="text-3xl font-bold">Шаблоны</h1>
        <div className="absolute right-0 -top-3 h-10 w-28" aria-hidden="true" />
      </div>
      
      {shareSuccess && (
        <TemplateSavedDialog
          open={!!shareSuccess}
          onOpenChange={setShareSuccess}
          templateName={shareSuccess}
        />
      )}

      {loading ? (
        <WorkoutLoadingOverlay message="Загрузка шаблонов..." />
      ) : templates.length === 0 ? (
        <div className="mt-4 p-8 text-center glass">
          <p className="text-gray-500">У вас еще нет шаблонов. Создайте первый!</p>
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
          title="Импортировать шаблон"
        >
          <img src={ImportIcon} alt="Импорт шаблона" className="h-5 w-5" />
        </button>
      </div>

      {sharing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="glass card-dark p-6 rounded-xl">
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
              </div>
              <p className="text-white">Генерация ссылки...</p>
            </div>
          </div>
        </div>
      )}

      {shareLinkModalOpen && currentShareLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="glass card-dark p-6 rounded-xl max-w-lg w-[92%] max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-2">Скопировать ссылку, чтобы поделиться шаблоном</h3>
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
                    alert('Автокопирование не сработало. Скопируйте ссылку вручную: долгий тап → Копировать.\n\nОшибка: ' + (res as any).reason);
                  }
                }}
                className="glass-button-create"
              >
                {copying ? 'Копирование...' : 'Копировать'}
              </button>
              <button
                onClick={() => setShareLinkModalOpen(false)}
                className="glass-button-danger"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;
