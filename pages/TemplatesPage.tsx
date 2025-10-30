import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePageState } from '../hooks/usePageState';
import type { WorkoutTemplate } from '../types/database.types';
import ConfirmDialog from '../components/confirm-dialog';
import { generateShareLink } from '../utils/template-sharing';
import TemplateSavedDialog from '../components/template-saved-dialog';

const TemplateDeleteButton: React.FC<{ 
  id: string; 
  name: string;
  onDeleted: (id: string) => void;
  onShare: (id: string, name: string) => void;
}> = ({ id, name, onDeleted, onShare }) => {
  const [busy, setBusy] = React.useState(false);
  const [open, setOpen] = React.useState(false);

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
      <div className="flex items-center gap-2">
        <button
          onClick={() => onShare(id, name)}
          className="text-blue-400 hover:opacity-75 transition-opacity"
          title="Поделиться шаблоном"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
        <button
          onClick={() => setOpen(true)}
          disabled={busy}
          className="glass-button-danger"
        >
          {busy ? '...' : 'Удалить'}
        </button>
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
      .select('id, name, created_at, user_id')
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

      const shareLink = generateShareLink({
        name: templateName,
        exercises: exercises,
      });

      await navigator.clipboard.writeText(shareLink);
      setShareSuccess(templateName);
      setTimeout(() => setShareSuccess(null), 3000);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error sharing template:', error);
      alert('Не удалось скопировать ссылку: ' + error.message);
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
            .select('id, name, created_at, user_id')
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
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'transparent' }}>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-white text-center">Загрузка шаблонов...</p>
          </div>
        </div>
      ) : templates.length === 0 ? (
        <div className="mt-4 p-8 text-center glass">
          <p className="text-gray-500">У вас еще нет шаблонов. Создайте первый!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(template => (
            <div key={template.id} className="p-4 glass card-dark flex items-center justify-between gap-3">
              <button
                onClick={() => window.location.hash = `#/templates/${template.id}`}
                className="text-left flex-1 hover:opacity-90"
              >
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

      <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-30 flex gap-3">
        <Link
          to="/templates/new"
          className="glass-button-create"
        >
          Создать
        </Link>
        <button
          onClick={() => navigate('/templates/import')}
          className="glass-button-create"
          title="Импортировать шаблон"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
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
    </div>
  );
};

export default TemplatesPage;
