import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePageState } from '../hooks/usePageState';
import type { WorkoutTemplate } from '../types/database.types';
import ConfirmDialog from '../components/confirm-dialog';

const TemplateDeleteButton: React.FC<{ id: string; onDeleted: (id: string) => void }> = ({ id, onDeleted }) => {
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
      <button
        onClick={() => setOpen(true)}
        disabled={busy}
        className="glass-button-danger"
      >
        {busy ? '...' : 'Удалить'}
      </button>
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
      
      {loading ? (
        <p>Загрузка шаблонов...</p>
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
              <TemplateDeleteButton id={template.id} onDeleted={handleDeleted} />
            </div>
          ))}
        </div>
      )}

      <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-30">
        <Link
          to="/templates/new"
          className="glass-button-create"
        >
          Создать
        </Link>
      </div>
    </div>
  );
};

export default TemplatesPage;
