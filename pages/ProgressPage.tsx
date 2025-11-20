import React, { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { type ProgressDataPoint } from '../utils/progress-helpers';
import { normalizeExerciseName } from '../utils/exercise-name';
import { useHeaderScroll } from '../hooks/use-header-scroll';
import { useScrollRestoration } from '../hooks/use-scroll-restoration';
import { WorkoutLoadingOverlay } from '../components/workout-loading-overlay';
import { useProgress } from '../hooks/use-progress';

const ProgressPage = () => {
  const navigate = useNavigate();
  const {
    exercises,
    loading,
    progressData,
    loadingProgress,
    searchQuery,
    selectedExercise,
    setSearchQuery,
    setSelectedExercise,
    loadProgress,
  } = useProgress();
  const inputRef = useRef<HTMLInputElement>(null);
  const isScrolling = useHeaderScroll();

  const getScrollKey = useCallback(() => {
    if (selectedExercise) {
      const k = normalizeExerciseName(selectedExercise || '');
      return `scroll:progress-page:detail:${k}`;
    }
    return 'scroll:progress-page:list';
  }, [selectedExercise]);

  const handleSelectExercise = (exerciseName: string) => {
    setSelectedExercise(exerciseName);
    loadProgress(exerciseName);
  };

  const handleNavigateToWorkout = (point: ProgressDataPoint) => {
    navigate(`/workout/${point.date}`, { state: { focusExerciseId: point.exerciseId } });
  };

  const handleBack = () => {
    if (selectedExercise) {
      setSelectedExercise(null);
      loadProgress(null);
    } else {
      navigate('/profile');
    }
  };

  // Кастомный тултип для графика
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    
    const data = payload[0].payload as ProgressDataPoint;
    
    return (
      <div className="glass card-dark p-3 rounded-lg shadow-lg border border-white/20">
        <p className="text-sm text-gray-300 mb-1">{data.workoutName}</p>
        <p className="text-base font-bold text-white">
          {data.weight} кг × {data.reps || '?'}
        </p>
        <p className="text-xs text-gray-400 mt-1">{new Date(data.date).toLocaleDateString('ru')}</p>
      </div>
    );
  };

  useScrollRestoration({
    key: getScrollKey(),
    enabled: !loading && (!selectedExercise || (!loadingProgress && !!progressData)),
  });

  useEffect(() => {
    try {
      const key = 'progress:lastSelectedExercise';
      if (selectedExercise) {
        localStorage.setItem(key, selectedExercise);
      } else {
        localStorage.removeItem(key);
      }
    } catch {}
  }, [selectedExercise]);

  useEffect(() => {
    if (selectedExercise) return;
    try {
      const saved = localStorage.getItem('progress:lastSelectedExercise');
      if (saved) {
        setSelectedExercise(saved);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedExercise) {
      loadProgress(selectedExercise);
    }
  }, [selectedExercise, loadProgress]);

  const filteredExercises = searchQuery.trim()
    ? exercises.filter((ex) => normalizeExerciseName(ex.name).includes(normalizeExerciseName(searchQuery)))
    : exercises;

  if (loading) {
    return <WorkoutLoadingOverlay message="Загрузка упражнений..." />;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pt-safe pb-4">
      <style>{`
        .header-container {
          position: sticky;
          top: 1rem;
          z-index: 30;
          will-change: transform, padding, gap;
          transform: translateZ(0);
          backface-visibility: hidden;
          transition: padding 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      gap 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      top 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .header-container.scrolling {
          padding: 0.35rem 1rem;
          gap: 0.7rem;
          top: 0.25rem;
        }
        @supports (top: calc(env(safe-area-inset-top) + 1px)) {
          .header-container.scrolling {
            top: calc(env(safe-area-inset-top) + 4px);
          }
        }
        @supports (top: constant(safe-area-inset-top)) {
          .header-container.scrolling {
            top: calc(constant(safe-area-inset-top) + 4px);
          }
        }
        .header-container h1 {
          transition: font-size 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      line-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: font-size;
        }
        .header-container.scrolling h1 {
          font-size: 1.25rem;
          line-height: 1.2;
        }
        .header-container p {
          transition: font-size 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      line-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: font-size;
        }
        .header-container.scrolling p {
          font-size: 0.8rem;
          line-height: 1.15;
        }
      `}</style>
      {/* Хедер */}
      <div className={`mb-6 glass card-dark p-4 flex items-center gap-4 header-container ${isScrolling ? 'scrolling' : ''}`}>
        <button
          onClick={handleBack}
          className="shrink-0 inline-flex items-center justify-center p-2 rounded-full border border-transparent text-white bg-transparent transition-colors focus:outline-none active:outline-none back-button-plain"
          aria-label="Назад"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 text-xl font-bold text-center">
          {selectedExercise || 'Прогресс по упражнениям'}
        </h1>
      </div>

      {/* Список упражнений */}
      {!selectedExercise && (
        <div className="space-y-3">
          <div className="glass card-dark rounded-full px-4 py-3">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 10.5a7.5 7.5 0 0013.15 6.15z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск"
                aria-label="Поиск упражнений"
                className="flex-1 bg-transparent !bg-transparent border-0 !border-0 outline-none ring-0 focus:outline-none focus:ring-0 appearance-none text-white placeholder-gray-500 text-base shadow-none"
                style={{ background: 'transparent', backgroundColor: 'transparent', border: 0, boxShadow: 'none', outline: 'none' }}
              />
              <button
                type="button"
                onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }}
                aria-label="Очистить"
                aria-hidden={!searchQuery}
                className={`shrink-0 w-7 h-7 grid place-items-center rounded-full text-gray-400 hover:text-gray-200 hover:bg-white/10 transition ${searchQuery ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>

          {exercises.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Нет данных для отображения</p>
              <p className="text-gray-500 text-sm mt-2">
                Выполните несколько тренировок с записанным весом
              </p>
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Упражнения не найдены</p>
              <p className="text-gray-500 text-sm mt-2">Попробуйте изменить запрос</p>
            </div>
          ) : (
            filteredExercises.map((exercise) => (
              <button
                key={exercise.name}
                onClick={() => handleSelectExercise(exercise.name)}
                className="w-full glass card-dark p-4 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{exercise.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Выполнено подходов: {exercise.totalSets}
                    </p>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* График прогресса */}
      {selectedExercise && (
        <div className="space-y-4">
          {loadingProgress ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
                </div>
                <p className="text-white text-center">Загрузка данных...</p>
              </div>
            </div>
          ) : progressData ? (
            <>
              {/* Статистика */}
              <div className="glass card-dark p-4 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">{progressData.totalSessions}</p>
                    <p className="text-sm text-gray-400 mt-1">Тренировок</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-400">{progressData.maxWeight} кг</p>
                    <p className="text-sm text-gray-400 mt-1">Максимум</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-400">
                      {progressData.dataPoints.length > 1
                        ? `${((progressData.maxWeight - progressData.minWeight) / progressData.minWeight * 100).toFixed(1)}%`
                        : '—'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">Прирост</p>
                  </div>
                </div>
              </div>

              {/* График */}
              <div className="glass card-dark p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-4">Динамика веса</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={progressData.dataPoints} margin={{ top: 24, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="displayDate"
                      stroke="rgba(255,255,255,0.5)"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.5)"
                      style={{ fontSize: '12px' }}
                      label={{ value: 'Вес (кг)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.7)', dx: 8 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Таблица данных */}
              <div className="glass card-dark p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">История</h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {progressData.dataPoints.slice().reverse().map((point, index) => (
                    <div
                      key={index}
                      onClick={() => handleNavigateToWorkout(point)}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <div>
                        <p className="text-white font-medium">{new Date(point.date).toLocaleDateString('ru')}</p>
                        <p className="text-sm text-gray-400">{point.workoutName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">{point.weight} кг</p>
                        <p className="text-sm text-gray-400">{point.reps || '?'} повторов</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400">Нет данных для отображения</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgressPage;
