import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { WorkoutTemplate } from '../types/database.types';

const TemplateDeleteButton: React.FC<{ id: string }> = ({ id }) => {
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (busy) return;
    const confirmed = window.confirm('Удалить этот шаблон вместе с упражнениями?');
    if (!confirmed) return;
    setBusy(true);
    try {
      // Удаляем связанные template_exercises, затем сам шаблон
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
    } catch (e) {
      console.error('Error deleting template', e);
      alert('Не удалось удалить шаблон.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={busy}
      className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
    >
      {busy ? '...' : 'Удалить'}
    </button>
  );
};

const TemplatesPage = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching templates:', error);
      } else {
        setTemplates(data || []);
      }
      setLoading(false);
    };

    fetchTemplates();
  }, [user]);

  // После удаления шаблона обновляем список
  useEffect(() => {
    const channel = supabase
      .channel('workout_templates_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_templates' }, payload => {
        // Простая повторная загрузка при любых изменениях текущего пользователя
        (async () => {
          if (!user) return;
          const { data } = await supabase
            .from('workout_templates')
            .select('*')
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
    <div className="p-4">
      <div className="relative flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Шаблоны</h1>
        <Link 
          to="/templates/new" 
          className="relative z-10 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          + Создать
        </Link>
        {/* Защитная подложка, чтобы переключатель темы не наезжал в правом верхнем углу */}
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
              <TemplateDeleteButton id={template.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;
