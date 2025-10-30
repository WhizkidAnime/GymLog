import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { extractTemplateFromLink, isValidTemplateLink } from '../utils/template-sharing';
import type { ShareableTemplate } from '../utils/template-sharing';

const TemplateImportPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [template, setTemplate] = useState<ShareableTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [checkingClipboard, setCheckingClipboard] = useState(false);

  // Проверяем URL при загрузке
  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        const fullUrl = window.location.href;
        const extracted = extractTemplateFromLink(fullUrl);
        if (extracted) {
          setTemplate(extracted);
        } else {
          setError('Неверный формат ссылки на шаблон');
        }
      } catch (err: any) {
        setError(err.message || 'Не удалось загрузить шаблон из ссылки');
      }
    }
  }, [searchParams]);

  // Автоматическая проверка буфера обмена при открытии страницы без параметров
  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (!dataParam && !template && !error) {
      checkClipboard();
    }
  }, [searchParams, template, error]);

  const checkClipboard = async () => {
    setCheckingClipboard(true);
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        throw new Error('Clipboard API недоступен в этом окружении');
      }
      const clipboardText = await navigator.clipboard.readText();
      
      if (isValidTemplateLink(clipboardText)) {
        const extracted = extractTemplateFromLink(clipboardText);
        if (extracted) {
          setTemplate(extracted);
        } else {
          setError('В буфере обмена ссылка неверного формата');
        }
      } else {
        setError('В буфере обмена нет ссылки на шаблон. Скопируйте ссылку и попробуйте снова.');
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Нет доступа к буферу обмена. Вставьте ссылку вручную.');
      } else {
        setError('Не удалось прочитать буфер обмена: ' + err.message);
      }
    } finally {
      setCheckingClipboard(false);
    }
  };

  const handleImport = async () => {
    if (!user || !template) return;

    setImporting(true);
    try {
      // Создаем новый шаблон
      const { data: newTemplate, error: templateError } = await supabase
        .from('workout_templates')
        .insert({
          user_id: user.id,
          name: template.name,
        })
        .select()
        .single();

      if (templateError || !newTemplate) {
        throw templateError || new Error('Не удалось создать шаблон');
      }

      // Добавляем упражнения
      const exercises = template.exercises.map(ex => ({
        template_id: newTemplate.id,
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.rest_seconds,
        position: ex.position,
      }));

      const { error: exercisesError } = await supabase
        .from('template_exercises')
        .insert(exercises);

      if (exercisesError) {
        await supabase.from('workout_templates').delete().eq('id', newTemplate.id);
        throw exercisesError;
      }

      navigate('/templates', { 
        state: { 
          message: `Шаблон "${template.name}" успешно импортирован!` 
        } 
      });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Error importing template:', err);
      alert('Не удалось импортировать шаблон: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleManualInput = () => {
    const pasted = window.prompt('Вставьте ссылку на шаблон из буфера обмена');
    if (!pasted) return;
    if (!isValidTemplateLink(pasted)) {
      setError('Вставленный текст не является валидной ссылкой на шаблон');
      return;
    }
    const extracted = extractTemplateFromLink(pasted);
    if (extracted) {
      setTemplate(extracted);
      setError(null);
    } else {
      setError('Не удалось извлечь шаблон из ссылки');
    }
  };

  if (!user) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="glass card-dark p-8 rounded-xl text-center">
          <p className="text-gray-300 mb-4">Войдите, чтобы импортировать шаблоны</p>
          <button
            onClick={() => navigate('/login')}
            className="btn-glass btn-glass-md btn-glass-primary"
          >
            Войти
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
        <h1 className="text-2xl font-bold text-center flex-1">Импорт шаблона</h1>
      </div>

      {checkingClipboard && (
        <div className="glass card-dark p-8 rounded-xl">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-white text-center">Проверка буфера обмена...</p>
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
              Проверить буфер снова
            </button>
            <button
              onClick={handleManualInput}
              className="btn-glass btn-glass-full btn-glass-md btn-glass-secondary"
            >
              Вставить ссылку вручную
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
                Упражнений: <span className="font-semibold text-white">{template.exercises.length}</span>
              </p>
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Упражнения:</h3>
                <div className="space-y-2">
                  {template.exercises.map((ex, i) => (
                    <div key={i} className="text-sm text-gray-300 pl-4 border-l-2 border-white/20">
                      <div className="font-medium text-white">{ex.name}</div>
                      <div className="text-xs text-gray-400">
                        {ex.sets} подходов × {ex.reps} повторов • Отдых: {ex.rest_seconds}с
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
                <span>Импорт...</span>
              </div>
            ) : (
              'Импортировать шаблон'
            )}
          </button>
        </div>
      )}

      {!template && !error && !checkingClipboard && (
        <div className="glass card-dark p-8 rounded-xl text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400 mb-4">
            Скопируйте ссылку на шаблон и нажмите кнопку ниже
          </p>
          <button
            onClick={checkClipboard}
            className="btn-glass btn-glass-md btn-glass-primary"
          >
            Импортировать из буфера
          </button>
          <div className="mt-2">
            <button
              onClick={handleManualInput}
              className="btn-glass btn-glass-md btn-glass-secondary"
            >
              Вставить ссылку вручную
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateImportPage;


