import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import { formatDateForDisplay } from '../utils/date-helpers';
import { useScrollRestoration } from '../hooks/use-scroll-restoration';
import { useExerciseHistory } from '../hooks/use-exercise-history';
import { useI18n } from '../hooks/use-i18n';

const ExerciseHistoryPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const {
    pageState,
    searchQuery,
    results,
    loading,
    hasSearched,
    lastUpdated,
    lastQuery,
    setSearchQuery,
    clearSearch,
    searchExercises,
    shouldUseCache,
  } = useExerciseHistory();

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const scrollKey = 'scroll:exercise-history';
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = debouncedSearchQuery.trim();
    if (!q) {
      clearSearch();
      return;
    }
    if (shouldUseCache(q)) {
      return; // кэш свежий — не перезапрашиваем для того же запроса
    }
    searchExercises(q);
  }, [debouncedSearchQuery, searchExercises, shouldUseCache, clearSearch]);

  useScrollRestoration({ key: scrollKey, enabled: results.length > 0 });

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const q = searchQuery.trim();
        if (q && !shouldUseCache(q)) {
          searchExercises(q);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [searchQuery, searchExercises, shouldUseCache]);

  const handleNavigateToWorkout = (date: string, exerciseId: string) => {
    navigate(`/workout/${date}`, { state: { focusExerciseId: exerciseId } });
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto pt-safe">
      <h1 className="text-3xl font-bold mb-6">{t.exerciseHistory.title}</h1>

      <div className="glass card-dark rounded-full px-4 py-3 search-container">
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 10.5a7.5 7.5 0 0013.15 6.15z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.exerciseHistory.searchPlaceholder}
            aria-label={t.exerciseHistory.searchAriaLabel}
            className="flex-1 bg-transparent border-0 outline-hidden ring-0 focus:outline-hidden focus:ring-0 appearance-none text-white placeholder-white/60 text-base shadow-none search-input"
          />
          <button
            type="button"
            onClick={() => { clearSearch(); inputRef.current?.focus(); }}
            aria-label={t.common.clear}
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
            <p className="text-white text-center">{t.exerciseHistory.searching}</p>
          </div>
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">{t.exerciseHistory.notFound}</p>
          <p className="text-gray-500 text-sm mt-2">{t.exerciseHistory.notFoundHint}</p>
        </div>
      )}

      {!loading && !hasSearched && !searchQuery && (
        <div className="text-center py-12">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-400 text-lg">{t.exerciseHistory.emptyTitle}</p>
          <p className="text-gray-500 text-sm mt-2">{t.exerciseHistory.emptyHint}</p>
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
                        className={`grid grid-cols-[96px_1fr_1fr] items-center gap-2 px-3 py-2 rounded border ${
                          set.isDropset 
                            ? 'bg-purple-500/10 border-purple-500/30 ml-4' 
                            : 'bg-gray-800/30 border-gray-700/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          {set.isDone && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          {set.isDropset ? (
                            <span className="text-sm text-purple-400 flex items-center gap-1">
                              <span className="text-xs">↓</span> {t.exerciseHistory.drop}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">{t.exerciseHistory.set} {set.setIndex}</span>
                          )}
                        </div>
                        <div className="text-sm flex items-baseline gap-1 whitespace-nowrap tabular-nums">
                          <span className="text-gray-400">{t.exerciseHistory.weight}:</span>
                          <span className="text-white">{set.weight !== null ? `${set.weight} ${t.common.kg}` : '—'}</span>
                        </div>
                        <div className="text-sm flex items-baseline gap-1 whitespace-nowrap tabular-nums">
                          <span className="text-gray-400">{t.exerciseHistory.reps}:</span>
                          <span className="text-white">{set.reps ?? '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{t.exerciseHistory.noSetsData}</p>
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
