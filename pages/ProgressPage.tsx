import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { processProgressData, type ExerciseProgress, type ProgressDataPoint } from '../utils/progress-helpers';
import { usePageState } from '../hooks/usePageState';

type ExerciseOption = {
  name: string;
  totalSets: number;
};

type ProgressPageState = {
  searchQuery: string;
  selectedExercise: string | null;
};

const ProgressPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [exercises, setExercises] = useState<ExerciseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<ExerciseProgress | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [pageState, setPageState] = usePageState<ProgressPageState>({ key: 'progress-page', initialState: { searchQuery: '', selectedExercise: null }, ttl: 30 * 60 * 1000 });
  const { searchQuery, selectedExercise } = pageState;
  const inputRef = useRef<HTMLInputElement>(null);
  const isRestoringScroll = useRef(false);
  const lastScrollPosition = useRef(0);

  const getScrollKey = useCallback(() => {
    if (selectedExercise) {
      const k = (selectedExercise || '')
        .normalize('NFKC')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
        .replace(/[-–—]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return `scroll:progress-page:detail:${k}`;
    }
    return 'scroll:progress-page:list';
  }, [selectedExercise]);

  // Загрузка списка упражнений
  const fetchExercises = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: workouts, error: wErr } = await supabase
        .from('workouts')
        .select('id')
        .eq('user_id', user.id);
      if (wErr) throw wErr;

      const workoutIds = (workouts || []).map((w: any) => w.id as string);

      if (workoutIds.length === 0) {
        setExercises([]);
        return;
      }

      const { data: progressRows, error: pErr } = await supabase
        .from('exercise_progress_view')
        .select('workout_id, exercise_id, max_weight')
        .in('workout_id', workoutIds);
      if (pErr) throw pErr;

      const statsByExerciseId = new Map<string, number>();

      (progressRows || []).forEach((row: any) => {
        const id = row.exercise_id as string | null;
        const weight = row.max_weight || 0;
        if (!id || weight <= 0) return;
        const prev = statsByExerciseId.get(id) || 0;
        statsByExerciseId.set(id, prev + 1);
      });

      if (statsByExerciseId.size === 0) {
        setExercises([]);
        return;
      }

      const { data: exerciseRows, error: eErr } = await supabase
        .from('workout_exercises')
        .select('id, name')
        .in('id', Array.from(statsByExerciseId.keys()));
      if (eErr) throw eErr;

      const normalize = (s: string) => (s || '')
        .normalize('NFKC')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
        .replace(/[-–—]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const exerciseMap = new Map<string, { name: string; total: number }>();

      (exerciseRows || []).forEach((ex: any) => {
        const rawName = (ex.name ?? '').trim();
        if (!rawName) return;
        const key = normalize(rawName);
        const totalSessions = statsByExerciseId.get(ex.id as string) || 0;
        if (totalSessions <= 0) return;
        const prev = exerciseMap.get(key);
        if (prev) {
          exerciseMap.set(key, {
            name: prev.name.length >= rawName.length ? prev.name : rawName,
            total: prev.total + totalSessions,
          });
        } else {
          exerciseMap.set(key, { name: rawName, total: totalSessions });
        }
      });

      const exerciseList = Array.from(exerciseMap.values())
        .map(({ name, total }) => ({ name, totalSets: total }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

      setExercises(exerciseList);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      alert('Не удалось загрузить список упражнений');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  // Загрузка данных прогресса для выбранного упражнения
  const fetchProgressData = useCallback(async (exerciseName: string) => {
    if (!user) return;

    setLoadingProgress(true);
    try {
      const { data: workouts, error: wErr } = await supabase
        .from('workouts')
        .select('id')
        .eq('user_id', user.id);
      if (wErr) throw wErr;

      const workoutIds = (workouts || []).map((w: any) => w.id as string);

      if (workoutIds.length === 0) {
        setProgressData({ exerciseName, dataPoints: [], totalSessions: 0, maxWeight: 0, minWeight: 0 });
        return;
      }

      const { data: exList, error: exListErr } = await supabase
        .from('workout_exercises')
        .select('id, name, workout_id')
        .in('workout_id', workoutIds);
      if (exListErr) throw exListErr;

      const normalize = (s: string) => (s || '')
        .normalize('NFKC')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
        .replace(/[-–—]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const target = normalize(exerciseName);

      const exerciseIds = new Set<string>();

      (exList || []).forEach((ex: any) => {
        const rawName = (ex.name ?? '').trim();
        if (!rawName) return;
        if (normalize(rawName) === target) {
          exerciseIds.add(ex.id as string);
        }
      });

      if (exerciseIds.size === 0) {
        setProgressData({ exerciseName, dataPoints: [], totalSessions: 0, maxWeight: 0, minWeight: 0 });
        return;
      }

      const { data: viewRows, error: viewErr } = await supabase
        .from('exercise_progress_view')
        .select('workout_date, workout_name, workout_id, exercise_id, max_weight, reps_at_max_weight')
        .in('workout_id', workoutIds)
        .in('exercise_id', Array.from(exerciseIds));
      if (viewErr) throw viewErr;

      const rawData = (viewRows || []).map((row: any) => ({
        workout_date: row.workout_date as string,
        workout_name: row.workout_name as string,
        workout_id: row.workout_id as string,
        exercise_id: row.exercise_id as string,
        max_weight: row.max_weight as number | null,
        reps_at_max_weight: row.reps_at_max_weight as string | null,
      }));

      const processed = processProgressData(exerciseName, rawData);
      setProgressData(processed);
    } catch (error) {
      console.error('Error fetching progress data:', error);
      alert('Не удалось загрузить данные прогресса');
    } finally {
      setLoadingProgress(false);
    }
  }, [user]);

  const handleSelectExercise = (exerciseName: string) => {
    setPageState(prev => ({ ...prev, selectedExercise: exerciseName }));
    fetchProgressData(exerciseName);
  };

  const handleNavigateToWorkout = (point: ProgressDataPoint) => {
    navigate(`/workout/${point.date}`, { state: { focusExerciseId: point.exerciseId } });
  };

  const handleBack = () => {
    if (selectedExercise) {
      setPageState(prev => ({ ...prev, selectedExercise: null }));
      setProgressData(null);
    } else {
      navigate('/profile');
    }
  };

  const normalizeName = (s: string) => (s || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
    .replace(/[-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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

  useEffect(() => {
    if (selectedExercise) return;
    if (loading) return;
    if (exercises.length === 0) return;
    try {
      const saved = localStorage.getItem(getScrollKey());
      if (saved) {
        const y = parseInt(saved, 10);
        if (!Number.isNaN(y)) {
          isRestoringScroll.current = true;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              window.scrollTo({ top: y, behavior: 'auto' });
              lastScrollPosition.current = y;
              setTimeout(() => { isRestoringScroll.current = false; }, 100);
            });
          });
        }
      }
    } catch {}
  }, [selectedExercise, loading, exercises.length, getScrollKey]);

  useEffect(() => {
    if (!selectedExercise) return;
    if (loadingProgress) return;
    if (!progressData) return;
    try {
      const saved = localStorage.getItem(getScrollKey());
      if (saved) {
        const y = parseInt(saved, 10);
        if (!Number.isNaN(y)) {
          isRestoringScroll.current = true;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              window.scrollTo({ top: y, behavior: 'auto' });
              lastScrollPosition.current = y;
              setTimeout(() => { isRestoringScroll.current = false; }, 100);
            });
          });
        }
      }
    } catch {}
  }, [selectedExercise, loadingProgress, progressData, getScrollKey]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      lastScrollPosition.current = window.scrollY;
      if (!ticking && !isRestoringScroll.current) {
        window.requestAnimationFrame(() => {
          try { localStorage.setItem(getScrollKey(), String(lastScrollPosition.current)); } catch {}
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [getScrollKey]);

  useEffect(() => {
    return () => {
      if (lastScrollPosition.current > 0) {
        try { localStorage.setItem(getScrollKey(), String(lastScrollPosition.current)); } catch {}
      }
    };
  }, [getScrollKey]);

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
    if (pageState.selectedExercise) return;
    try {
      const saved = localStorage.getItem('progress:lastSelectedExercise');
      if (saved) {
        setPageState(prev => ({ ...prev, selectedExercise: saved }));
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedExercise) {
      fetchProgressData(selectedExercise);
    }
  }, [selectedExercise, fetchProgressData]);

  const filteredExercises = searchQuery.trim()
    ? exercises.filter((ex) => normalizeName(ex.name).includes(normalizeName(searchQuery)))
    : exercises;

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-white text-center">Загрузка упражнений...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pt-safe pb-4">
      {/* Хедер */}
      <div className="mb-6 glass card-dark p-4 flex items-center gap-4">
        <button
          onClick={handleBack}
          className="shrink-0 p-2 rounded-full border border-transparent text-white hover:border-white transition-colors"
          aria-label="Назад"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 text-2xl font-bold text-center">
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
                onChange={(e) => setPageState(prev => ({ ...prev, searchQuery: e.target.value }))}
                placeholder="Поиск"
                aria-label="Поиск упражнений"
                className="flex-1 bg-transparent !bg-transparent border-0 !border-0 outline-none ring-0 focus:outline-none focus:ring-0 appearance-none text-white placeholder-gray-500 text-base shadow-none"
                style={{ background: 'transparent', backgroundColor: 'transparent', border: 0, boxShadow: 'none', outline: 'none' }}
              />
              <button
                type="button"
                onClick={() => { setPageState(prev => ({ ...prev, searchQuery: '' })); inputRef.current?.focus(); }}
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
                  <LineChart data={progressData.dataPoints} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="displayDate"
                      stroke="rgba(255,255,255,0.5)"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.5)"
                      style={{ fontSize: '12px' }}
                      label={{ value: 'Вес (кг)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.7)' }}
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
