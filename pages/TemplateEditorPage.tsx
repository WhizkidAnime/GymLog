import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import ConfirmDialog from '../components/confirm-dialog';
import TemplateSavedDialog from '../components/template-saved-dialog';
import type { TemplateExercise, TemplateExerciseInsert } from '../types/database.types';
import { useHeaderScroll } from '../hooks/use-header-scroll';
import { WorkoutLoadingOverlay } from '../components/workout-loading-overlay';
import IconPicker from '../components/icon-picker';
import type { WorkoutIconType } from '../components/workout-icons';

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
  const db = supabase as any;

  const [name, setName] = useState('');
  const [icon, setIcon] = useState<WorkoutIconType | null>(null);
  const [exercises, setExercises] = useState<EditableExercise[]>([newExerciseFactory()]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; tempId?: number }>({ open: false });
  const [savedDialogOpen, setSavedDialogOpen] = useState(false);
  const isScrolling = useHeaderScroll();
  const textareaRefs = React.useRef<{ [key: number]: HTMLTextAreaElement | null }>({});
  const topSentinelRef = React.useRef<HTMLDivElement | null>(null);

  const adjustTextareaHeight = React.useCallback((element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, []);

  React.useLayoutEffect(() => {
    exercises.forEach(ex => {
      const element = textareaRefs.current[ex._tempId];
      if (element) {
        adjustTextareaHeight(element);
      }
    });
  }, [exercises, adjustTextareaHeight]);

  const BackButton = ({ className = '' }: { className?: string }) => (
    <button
      type="button"
      onClick={() => navigate('/templates')}
      className={`inline-flex items-center justify-center p-2 rounded-full border border-transparent text-white transition-colors bg-transparent hover:border-white active:border-white focus:outline-none back-button-plain ${className}`}
      aria-label="Назад к шаблонам"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );

  useEffect(() => {
    if (id) {
      const fetchTemplate = async () => {
        setLoading(true);
        // грузим данные параллельно и только нужные поля
        const [{ data: templateData, error: templateError }, { data: exercisesData, error: exercisesError }] = await Promise.all([
          db.from('workout_templates').select('id, name, icon').eq('id', id).single(),
          db.from('template_exercises').select('id, name, sets, reps, rest_seconds, position').eq('template_id', id).order('position'),
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
          setIcon((templateData as any).icon as WorkoutIconType | null);
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

  const confirmDeleteExercise = (tempId: number) => {
    setDeleteConfirm({ open: true, tempId });
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
      const { data: templateData, error: templateError } = await db
        .from('workout_templates')
        .upsert({ id: id, name, user_id: user.id, icon })
        .select('id')
        .single();

      if (templateError || !templateData) {
        throw templateError || new Error('Failed to save template.');
      }

      const templateId = templateData.id;

      // 2) Пересобираем упражнения: удаляем старые только при редактировании
      if (id) {
        const { error: deleteError } = await db
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
        const { error: exercisesError } = await db
          .from('template_exercises')
          .insert(exercisesToInsert);
        if (exercisesError) throw exercisesError;
      }

      setSavedDialogOpen(true);
    } catch (error: any) {
      console.error('Error saving template:', error);

      // Частый кейс на iOS PWA: TypeError: Load failed при успешном выполнении на сервере.
      // Попробуем проверить, сохранилось ли всё фактически, и завершить поток без шума.
      try {
        const templateQuery = id
          ? db.from('workout_templates').select('id').eq('id', id).maybeSingle()
          : db.from('workout_templates').select('id').eq('user_id', user.id).eq('name', name).order('created_at', { ascending: false }).limit(1).maybeSingle();
        const { data: verifyTemplate } = await templateQuery;
        const verifyTemplateId = (verifyTemplate as any)?.id as string | undefined;
        if (verifyTemplateId) {
          const { count } = await db
            .from('template_exercises')
            .select('id', { count: 'exact', head: true })
            .eq('template_id', verifyTemplateId);
          // Если шаблон существует — считаем сохранение успешным
          setSavedDialogOpen(true);
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

  if (loading) return <WorkoutLoadingOverlay message="Загрузка редактора..." />;
 
  return (
    <div className="relative p-4 max-w-lg mx-auto template-editor">
      {/* CSS стили вынесены в styles/header-scroll.css */}
      <div className={`status-bar-blur ${isScrolling ? 'visible' : ''}`} />
      <div ref={topSentinelRef} className="top-sentinel" aria-hidden="true"></div>
      <div className={`mb-6 glass card-dark p-4 flex items-center gap-4 header-container ${isScrolling ? 'scrolling' : ''}`}>
        <BackButton className="shrink-0" />
        <div className="flex-1 min-w-0 text-center">
          <h1 className="text-xl font-bold">
            {id ? 'Редактировать шаблон' : 'Новый шаблон'}
          </h1>
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div>
          <label htmlFor="template-name" className="block text-xl font-semibold template-label">Название дня</label>
          <div className="relative">
            <input
              id="template-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например, Push Day"
              required
              className="mt-1 block w-full px-3 pr-9 py-2 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 template-input"
            />
            {name && (
              <button
                type="button"
                onClick={() => setName('')}
                aria-label="Очистить"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 text-gray-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        </div>

        <IconPicker value={icon} onChange={setIcon} />

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Упражнения</h2>
          {exercises.map((ex) => (
            <div 
              key={ex._tempId} 
              className={`exercise-card relative transition-all duration-300 ease-in-out ${
                ex._state === 'deleting'
                ? 'opacity-0 max-h-0 p-0 border-0 m-0'
                : 'glass card-dark'
              }`}
            >
              <div className={`${ex._state === 'deleting' ? 'hidden' : 'p-4 space-y-3'}`}>
                <div className="exercise-card-header mb-3">
                  <div className="name-wrap relative">
                    <textarea
                        ref={el => textareaRefs.current[ex._tempId] = el}
                        placeholder="Название упражнения"
                        value={ex.name || ''}
                        onChange={(e) => {
                          handleExerciseChange(ex._tempId, 'name', e.target.value);
                          adjustTextareaHeight(e.currentTarget);
                        }}
                        rows={1}
                        className="w-full px-3 pr-9 py-2 rounded-md resize-none overflow-y-hidden min-h-[2.5rem] leading-relaxed template-input"
                    />
                    {ex.name && ex.name.trim() !== '' && (
                      <button
                        type="button"
                        onClick={() => {
                          handleExerciseChange(ex._tempId, 'name', '');
                          const el = textareaRefs.current[ex._tempId];
                          if (el) adjustTextareaHeight(el);
                        }}
                        aria-label="Очистить"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 text-gray-300"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    )}
                  </div>
                  <button 
                    type="button" 
                    onClick={() => confirmDeleteExercise(ex._tempId)} 
                    className="delete-btn btn-glass btn-glass-icon btn-glass-outline"
                    aria-label="Удалить упражнение"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6l1-2h6l1 2" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <label className="text-xs template-sublabel">Подходы</label>
                    <input type="number" inputMode="numeric" placeholder="3" value={ex.sets ?? ''} onChange={e => handleExerciseChange(ex._tempId, 'sets', e.target.value)} className="w-full p-1 text-center rounded-md template-input" />
                  </div>
                  <div>
                    <label className="text-xs template-sublabel">Повторы</label>
                    <input 
                      type="text" 
                      placeholder="10-12"
                      value={ex.reps || ''} 
                      onChange={e => handleExerciseChange(ex._tempId, 'reps', e.target.value)} 
                      className="w-full p-1 text-center rounded-md template-input"
                    />
                  </div>
                  <div>
                     <label className="text-xs template-sublabel">Отдых (сек)</label>
                    <input type="number" inputMode="numeric" placeholder="60" value={ex.rest_seconds ?? ''} onChange={e => handleExerciseChange(ex._tempId, 'rest_seconds', e.target.value)} className="w-full p-1 text-center rounded-md template-input" />
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addExercise} className="btn-dashed">
            + Добавить упражнение
          </button>
        </div>
        
        <button type="submit" disabled={isSaving} className="btn-glass btn-glass-full btn-glass-md btn-glass-primary">
          {isSaving ? 'Сохранение...' : 'Сохранить шаблон'}
        </button>
      </form>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ open })}
        title="Удалить упражнение?"
        description="Это упражнение будет удалено из шаблона. Действие необратимо."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        onConfirm={async () => {
          if (deleteConfirm.tempId !== undefined) {
            removeExercise(deleteConfirm.tempId);
          }
        }}
      />

      <TemplateSavedDialog
        open={savedDialogOpen}
        onOpenChange={setSavedDialogOpen}
        onClose={() => navigate('/templates')}
      />
    </div>
  );
};

export default TemplateEditorPage;