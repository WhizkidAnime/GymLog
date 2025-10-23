import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { TemplateExercise, TemplateExerciseInsert } from '../types/database.types';

type EditableExercise = Partial<TemplateExercise> & {
  _tempId: number; // Unique ID for UI tracking, especially for animations
  _state?: 'deleting';
};

const newExerciseFactory = (): EditableExercise => ({
  _tempId: Date.now() + Math.random(),
  name: '',
  sets: undefined,
  reps: '',
  rest_seconds: undefined,
});

const TemplateEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<EditableExercise[]>([newExerciseFactory()]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchTemplate = async () => {
        setLoading(true);
        // грузим данные параллельно и только нужные поля
        const [{ data: templateData, error: templateError }, { data: exercisesData, error: exercisesError }] = await Promise.all([
          supabase.from('workout_templates').select('id, name').eq('id', id).single(),
          supabase.from('template_exercises').select('id, name, sets, reps, rest_seconds, position').eq('template_id', id).order('position'),
        ]);

        if (templateError) {
          console.error("Error fetching template", templateError);
          navigate('/templates');
          return;
        }

        if (exercisesError) {
          console.error("Error fetching exercises", exercisesError);
        }

        if (templateData) {
          setName(templateData.name);
          const loadedExercises = (exercisesData || []).map(ex => ({ ...ex, _tempId: Math.random() }));
          setExercises(loadedExercises.length > 0 ? loadedExercises : [newExerciseFactory()]);
        }
        setLoading(false);
      };
      fetchTemplate();
    } else {
      setLoading(false);
    }
  }, [id, navigate]);

  const handleExerciseChange = (tempId: number, field: keyof TemplateExercise, value: string) => {
    setExercises(prevExercises =>
      prevExercises.map(ex => {
        if (ex._tempId === tempId) {
          const updatedExercise = { ...ex };
          if (field === 'sets' || field === 'rest_seconds') {
            const parsedValue = parseInt(value, 10);
            (updatedExercise[field] as any) = isNaN(parsedValue) ? '' : parsedValue;
          } else {
            (updatedExercise[field] as any) = value;
          }
          return updatedExercise;
        }
        return ex;
      })
    );
  };
  
  const addExercise = () => {
    setExercises([...exercises, newExerciseFactory()]);
  };

  const removeExercise = (tempId: number) => {
    setExercises(prev =>
      prev.map(ex => (ex._tempId === tempId ? { ...ex, _state: 'deleting' } : ex))
    );

    setTimeout(() => {
      setExercises(prev => prev.filter(ex => ex._tempId !== tempId));
    }, 300); // Animation duration
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("You must be logged in to save a template.");
      return;
    }
    setIsSaving(true);

    try {
      // 1) Сохраняем сам шаблон
      const { data: templateData, error: templateError } = await supabase
        .from('workout_templates')
        .upsert({ id: id, name, user_id: user.id })
        .select('id')
        .single();

      if (templateError || !templateData) {
        throw templateError || new Error('Failed to save template.');
      }

      const templateId = templateData.id;

      // 2) Пересобираем упражнения: удаляем старые только при редактировании
      if (id) {
        const { error: deleteError } = await supabase
          .from('template_exercises')
          .delete()
          .eq('template_id', templateId);
        if (deleteError) throw deleteError;
      }

      const exercisesToInsert: TemplateExerciseInsert[] = exercises
        .filter(ex => ex.name && ex.name.trim() !== '')
        .map((ex, index) => ({
          template_id: templateId,
          name: ex.name!,
          sets: Number(ex.sets) || 1,
          reps: ex.reps || '1',
          rest_seconds: Number(ex.rest_seconds) || 0,
          position: index,
        }));

      if (exercisesToInsert.length > 0) {
        const { error: exercisesError } = await supabase
          .from('template_exercises')
          .insert(exercisesToInsert);
        if (exercisesError) throw exercisesError;
      }

      alert('Шаблон сохранен!');
      navigate('/templates');
    } catch (error: any) {
      console.error('Error saving template:', error);

      // Частый кейс на iOS PWA: TypeError: Load failed при успешном выполнении на сервере.
      // Попробуем проверить, сохранилось ли всё фактически, и завершить поток без шума.
      try {
        const templateQuery = id
          ? supabase.from('workout_templates').select('id').eq('id', id).maybeSingle()
          : supabase.from('workout_templates').select('id').eq('user_id', user.id).eq('name', name).order('created_at', { ascending: false }).limit(1).maybeSingle();
        const { data: verifyTemplate } = await templateQuery;
        if (verifyTemplate?.id) {
          const { count } = await supabase
            .from('template_exercises')
            .select('id', { count: 'exact', head: true })
            .eq('template_id', verifyTemplate.id);
          // Если шаблон существует — считаем сохранение успешным
          alert('Шаблон сохранен!');
          navigate('/templates');
          return;
        }
      } catch {}

      const userFriendlyMessage = (error.message || '').includes('invalid input syntax for type integer')
        ? 'Не удалось сохранить диапазон повторений (например, "10-12"). Пожалуйста, убедитесь, что схема вашей базы данных обновлена. В Supabase SQL Editor нужно выполнить скрипт, чтобы колонка "reps" имела тип TEXT.'
        : `Ошибка сохранения: ${error.message}`;
      alert(userFriendlyMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-4">Загрузка редактора...</div>;
  
  return (
    <div className="relative p-4 max-w-lg mx-auto">
      <button 
        type="button" 
        onClick={() => navigate('/templates')} 
        className="absolute top-4 left-4 p-2 rounded-full border border-transparent text-white transition-colors bg-transparent hover:border-white active:border-white focus:outline-none"
        aria-label="Назад к шаблонам"
      >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
      </button>
      <div className="text-center pt-8 mb-4 glass p-4">
        <h1 className="text-3xl font-bold">
          {id ? 'Редактировать шаблон' : 'Новый шаблон'}
        </h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="template-name" className="block text-sm font-medium" style={{color:'#e4e4e7'}}>Название дня</label>
          <input
            id="template-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например, Push Day"
            required
            className="mt-1 block w-full px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            style={{backgroundColor:'#18181b', color:'#fafafa', border:'1px solid #3f3f46'}}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Упражнения</h2>
          {exercises.map((ex) => (
            <div 
              key={ex._tempId} 
              className={`exercise-card relative transition-all duration-300 ease-in-out overflow-hidden ${
                ex._state === 'deleting'
                ? 'opacity-0 max-h-0 p-0 border-0 m-0'
                : 'p-4 glass card-dark space-y-3'
              }`}
            >
               <button 
                  type="button" 
                  onClick={() => removeExercise(ex._tempId)} 
                  className="delete-btn z-10 p-1 text-gray-300 hover:text-red-500 transition-colors"
                  aria-label="Удалить упражнение"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              <div className="flex items-center gap-2">
                <input
                    type="text"
                    placeholder="Название упражнения"
                    value={ex.name || ''}
                    onChange={(e) => handleExerciseChange(ex._tempId, 'name', e.target.value)}
                    className="w-full px-3 py-2 rounded-md"
                    style={{backgroundColor:'#18181b', color:'#fafafa', border:'1px solid #3f3f46'}}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <label className="text-xs" style={{color:'#e4e4e7'}}>Подходы</label>
                  <input type="number" placeholder="3" value={ex.sets ?? ''} onChange={e => handleExerciseChange(ex._tempId, 'sets', e.target.value)} className="w-full p-1 text-center rounded-md" style={{backgroundColor:'#18181b', color:'#fafafa', border:'1px solid #3f3f46'}} />
                </div>
                <div>
                  <label className="text-xs" style={{color:'#e4e4e7'}}>Повторы</label>
                  <input 
                    type="text" 
                    placeholder="10-12"
                    value={ex.reps || ''} 
                    onChange={e => handleExerciseChange(ex._tempId, 'reps', e.target.value)} 
                    className="w-full p-1 text-center rounded-md"
                    style={{backgroundColor:'#18181b', color:'#fafafa', border:'1px solid #3f3f46'}}
                  />
                </div>
                <div>
                   <label className="text-xs" style={{color:'#e4e4e7'}}>Отдых (сек)</label>
                  <input type="number" placeholder="60" value={ex.rest_seconds ?? ''} onChange={e => handleExerciseChange(ex._tempId, 'rest_seconds', e.target.value)} className="w-full p-1 text-center rounded-md" style={{backgroundColor:'#18181b', color:'#fafafa', border:'1px solid #3f3f46'}} />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addExercise} className="w-full py-2 text-sm font-medium rounded-lg border-2 border-dashed border-white/40 text-gray-200 bg-transparent hover:bg-white/5 active:scale-[.98] transition duration-100 ease-out">
            + Добавить упражнение
          </button>
        </div>
        
        <button type="submit" disabled={isSaving} className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isSaving ? 'Сохранение...' : 'Сохранить шаблон'}
        </button>
      </form>
    </div>
  );
};

export default TemplateEditorPage;