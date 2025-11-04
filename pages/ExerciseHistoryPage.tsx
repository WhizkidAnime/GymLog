import React, { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useDebounce } from '../hooks/useDebounce';
import { formatDateForDisplay } from '../utils/date-helpers';
import { usePageState } from '../hooks/usePageState';

type ExerciseHistoryItem = {
  exerciseName: string;
  exerciseId: string;
  workoutDate: string;
  workoutName: string;
  workoutId: string;
  sets: Array<{
    setIndex: number;
    weight: number | null;
    reps: string | null;
    isDone: boolean;
  }>;
};

type ExerciseHistoryPageState = {
  searchQuery: string;
  results: ExerciseHistoryItem[];
  loading: boolean;
  hasSearched: boolean;
  lastUpdated: number | null;
  lastQuery: string | null;
};

const ExerciseHistoryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pageState, setPageState] = usePageState<ExerciseHistoryPageState>({
    key: 'exercise-history-page',
    initialState: { searchQuery: '', results: [], loading: false, hasSearched: false, lastUpdated: null, lastQuery: null },
    ttl: 30 * 60 * 1000,
  });
  const { searchQuery, results, loading, hasSearched, lastUpdated, lastQuery } = pageState;
  
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const scrollKey = 'scroll:exercise-history';
  const isRestoringScroll = useRef(false);
  const lastScrollPosition = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const CACHE_TTL = 3 * 60 * 1000; // 3 минуты

  const searchExercises = useCallback(async (query: string) => {
    if (!user || !query.trim()) {
      setPageState(prev => ({ ...prev, results: [], hasSearched: false, loading: false, lastUpdated: null }));
      return;
    }

    setPageState(prev => ({ ...prev, loading: true, hasSearched: true }));

    try {
      const { data: exercisesData, error } = await supabase
        .from('workout_exercises')
        .select(`
          id,
          name,
          workout_id,
          workout_sets (
            set_index,
            weight,
            reps,
            is_done
          ),
          workouts!inner (
            id,
            workout_date,
            name,
            user_id
          )
        `)
        .eq('workouts.user_id', user.id)
        .ilike('name', `%${query.trim()}%`)
        .order('workouts(workout_date)', { ascending: false });

      if (error) {
        throw error;
      }

      const groupedResults: ExerciseHistoryItem[] = [];
      
      if (exercisesData) {
        exercisesData.forEach((exercise: any) => {
          if (!exercise.workouts) return;
          
          const sets = (exercise.workout_sets || [])
            .map((set: any) => ({
              setIndex: set.set_index,
              weight: set.weight,
              reps: set.reps,
              isDone: set.is_done,
            }))
            .sort((a: any, b: any) => a.setIndex - b.setIndex);

          groupedResults.push({
            exerciseName: exercise.name,
            exerciseId: exercise.id,
            workoutDate: exercise.workouts.workout_date,
            workoutName: exercise.workouts.name,
            workoutId: exercise.workouts.id,
            sets,
          });
        });
      }

      setPageState(prev => ({ ...prev, results: groupedResults, lastUpdated: Date.now(), lastQuery: query.trim() }));
    } catch (error: any) {
      console.error('Error searching exercises:', error);
      setPageState(prev => ({ ...prev, results: [] }));
    } finally {
      setPageState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    const q = debouncedSearchQuery.trim();
    if (!q) {
      setPageState(prev => ({ ...prev, results: [], hasSearched: false, loading: false, lastUpdated: null, lastQuery: null }));
      return;
    }
    if (lastQuery === q && lastUpdated && Date.now() - lastUpdated < CACHE_TTL) {
      return; // кэш свежий — не перезапрашиваем для того же запроса
    }
    searchExercises(q);
  }, [debouncedSearchQuery, searchExercises, lastUpdated, lastQuery, setPageState]);

  useEffect(() => {
    if (results.length === 0) return;
    try {
      const saved = localStorage.getItem(scrollKey);
      if (saved) {
        const y = parseInt(saved, 10);
        if (!Number.isNaN(y)) {
          isRestoringScroll.current = true;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              window.scrollTo({ top: y, behavior: 'auto' });
              lastScrollPosition.current = y;
              setTimeout(() => {
                isRestoringScroll.current = false;
              }, 100);
            });
          });
        }
      }
    } catch {}
  }, [results.length, scrollKey]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      lastScrollPosition.current = window.scrollY;
      if (!ticking && !isRestoringScroll.current) {
        window.requestAnimationFrame(() => {
          try { localStorage.setItem(scrollKey, String(lastScrollPosition.current)); } catch {}
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollKey]);

  useEffect(() => {
    return () => {
      if (lastScrollPosition.current > 0) {
        try { localStorage.setItem(scrollKey, String(lastScrollPosition.current)); } catch {}
      }
    };
  }, [scrollKey]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const q = searchQuery.trim();
        if (user && q) {
          if (lastQuery !== q) {
            searchExercises(q);
          } else if (!lastUpdated || Date.now() - lastUpdated >= CACHE_TTL) {
            searchExercises(q);
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, searchQuery, searchExercises, lastUpdated, lastQuery]);

  const handleNavigateToWorkout = (date: string, exerciseId: string) => {
    navigate(`/workout/${date}`, { state: { focusExerciseId: exerciseId } });
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto pt-safe">
      <h1 className="text-3xl font-bold mb-6">История упражнений</h1>

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

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-white text-center">Поиск...</p>
          </div>
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">Упражнения не найдены</p>
          <p className="text-gray-500 text-sm mt-2">Попробуйте изменить запрос</p>
        </div>
      )}

      {!loading && !hasSearched && !searchQuery && (
        <div className="text-center py-12">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-400 text-lg">Начните вводить название упражнения</p>
          <p className="text-gray-500 text-sm mt-2">Вы увидите историю всех тренировок с этим упражнением</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-4">
          {results.map((item, index) => (
            <div
              key={`${item.workoutId}-${index}`}
              className="glass card-dark rounded-lg p-4 hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => handleNavigateToWorkout(item.workoutDate, item.exerciseId)}
            >
              <div className="mb-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-lg font-semibold text-white leading-tight">{item.exerciseName}</h3>
                  <p className="text-sm font-medium text-blue-400 shrink-0">{formatDateForDisplay(item.workoutDate)}</p>
                </div>
                <p className="text-sm text-gray-400 mt-0.5">{item.workoutName}</p>
              </div>

              <div className="space-y-2">
                {item.sets.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {item.sets.map((set, setIndex) => (
                      <div
                        key={setIndex}
                        className="grid grid-cols-[96px_1fr_1fr] items-center gap-2 px-3 py-2 rounded bg-gray-800/30 border border-gray-700/60"
                      >
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          {set.isDone && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className="text-sm text-gray-400">Подход {set.setIndex}</span>
                        </div>
                        <div className="text-sm flex items-baseline gap-1 whitespace-nowrap tabular-nums">
                          <span className="text-gray-400">Вес:</span>
                          <span className="text-white">{set.weight !== null ? `${set.weight} кг` : '—'}</span>
                        </div>
                        <div className="text-sm flex items-baseline gap-1 whitespace-nowrap tabular-nums">
                          <span className="text-gray-400">Повторы:</span>
                          <span className="text-white">{set.reps ?? '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Нет данных о подходах</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExerciseHistoryPage;
