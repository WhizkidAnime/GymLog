import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { type ProgressDataPoint } from '../utils/progress-helpers';
import { normalizeExerciseName } from '../utils/exercise-name';
import { useHeaderScroll } from '../hooks/use-header-scroll';
import { useScrollRestoration } from '../hooks/use-scroll-restoration';
import { useModalScrollLock } from '../hooks/use-modal-scroll-lock';
import { WorkoutLoadingOverlay } from '../components/workout-loading-overlay';
import { useProgress } from '../hooks/use-progress';
import { pluralize } from '../utils/pluralize';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useI18n } from '../hooks/use-i18n';

const db = supabase as any;

type TabType = 'exercises' | 'cardio';
type ExerciseSortType = 'alphabetical' | 'lastAdded' | 'mostFrequent';

type CardioWeek = {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  count: number;
  goal: number;
  isCurrentWeek: boolean;
};

type CardioMonthStats = {
  month: string;
  year: number;
  count: number;
  monthLabel: string;
};

// Кастомный тултип для графика — вынесен за пределы компонента для оптимизации
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  
  const data = payload[0].payload as ProgressDataPoint;
  
  return (
    <div className="glass card-dark p-3 rounded-lg shadow-lg border border-white/20">
      <p className="text-sm text-gray-300 mb-1">{data.workoutName}</p>
      <p className="text-base font-bold text-white">
        {data.weight} kg × {data.reps || '?'}
      </p>
      <p className="text-xs text-gray-400 mt-1">{new Date(data.date).toLocaleDateString()}</p>
    </div>
  );
};

const ProgressPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useI18n();
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
  const [period, setPeriod] = useState<'all' | '3m' | '6m' | '1y' | 'custom'>('all');
  const [customFrom, setCustomFrom] = useState<string | null>(null);
  const [customTo, setCustomTo] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [exerciseSort, setExerciseSort] = useState<ExerciseSortType>(() => {
    try {
      return (localStorage.getItem('progress:exerciseSort') as ExerciseSortType) || 'lastAdded';
    } catch {
      return 'lastAdded';
    }
  });

  // Cardio tab state
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      return (localStorage.getItem('progress:activeTab') as TabType) || 'exercises';
    } catch {
      return 'exercises';
    }
  });
  const [cardioGoal, setCardioGoal] = useState<number>(3);
  const [cardioWorkouts, setCardioWorkouts] = useState<{ workout_date: string }[]>([]);
  const [loadingCardio, setLoadingCardio] = useState(false);
  const [isCardioInfoOpen, setIsCardioInfoOpen] = useState(false);
  const [selectedCardioMonth, setSelectedCardioMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const cardioCacheKey = 'progress:cardioCache';
  const cardioCacheTtl = 30 * 60 * 1000;
  const cardioGoalLoadedRef = useRef(false);

  useModalScrollLock(isCardioInfoOpen);

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

  useEffect(() => {
    setPeriod('all');
    setCustomFrom(null);
    setCustomTo(null);
  }, [selectedExercise]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };

    if (isDropdownOpen || isMonthDropdownOpen || isSortDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen, isMonthDropdownOpen, isSortDropdownOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('progress:exerciseSort', exerciseSort);
    } catch {}
  }, [exerciseSort]);

  // Save active tab
  useEffect(() => {
    try {
      localStorage.setItem('progress:activeTab', activeTab);
    } catch {}
  }, [activeTab]);

  // Load cardio goal from DB
  useEffect(() => {
    if (!user) {
      return;
    }

    let isCancelled = false;

    const loadCardioGoal = async () => {
      try {
        const { data, error } = await db
          .from('user_settings')
          .select('cardio_weekly_goal')
          .eq('user_id', user.id)
          .limit(1);

        if (error) {
          console.error('Error loading cardio goal:', error);
          return;
        }

        if (!isCancelled && data && data.length > 0 && typeof data[0]?.cardio_weekly_goal === 'number') {
          setCardioGoal(data[0].cardio_weekly_goal);
        }
      } catch (error) {
        console.error('Error loading cardio goal:', error);
      } finally {
        if (!isCancelled) {
          cardioGoalLoadedRef.current = true;
        }
      }
    };

    loadCardioGoal();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  // Save cardio goal to DB
  useEffect(() => {
    if (!user) {
      return;
    }
    if (!cardioGoalLoadedRef.current) {
      return;
    }

    const saveCardioGoal = async () => {
      try {
        const { error } = await db
          .from('user_settings')
          .upsert(
            {
              user_id: user.id,
              cardio_weekly_goal: cardioGoal,
            },
            { onConflict: 'user_id' }
          );

        if (error) {
          console.error('Error saving cardio goal:', error);
        }
      } catch (error) {
        console.error('Error saving cardio goal:', error);
      }
    };

    saveCardioGoal();
  }, [cardioGoal, user]);

  // Fetch cardio workouts with кешем
  useEffect(() => {
    if (activeTab !== 'cardio' || !user) return;

    const loadFromCache = () => {
      try {
        const raw = localStorage.getItem(cardioCacheKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { data: { workout_date: string }[]; timestamp: number };
        const age = Date.now() - (parsed.timestamp || 0);
        if (age > cardioCacheTtl) return null;
        return parsed.data || null;
      } catch {
        return null;
      }
    };

    const saveToCache = (data: { workout_date: string }[]) => {
      try {
        localStorage.setItem(
          cardioCacheKey,
          JSON.stringify({ data, timestamp: Date.now() })
        );
      } catch {
        // ignore
      }
    };

    const fetchCardioWorkouts = async (silent = false) => {
      if (!silent) setLoadingCardio(true);
      try {
        const { data, error } = await supabase
          .from('workouts')
          .select('workout_date')
          .eq('user_id', user.id)
          .eq('is_cardio', true)
          .order('workout_date', { ascending: false });

        if (error) throw error;
        const safe = data || [];
        setCardioWorkouts(safe);
        saveToCache(safe);
      } catch (error) {
        console.error('Error fetching cardio workouts:', error);
      } finally {
        if (!silent) setLoadingCardio(false);
      }
    };

    const cached = loadFromCache();
    if (cached) {
      setCardioWorkouts(cached);
      fetchCardioWorkouts(true); // фон обновление
      return;
    }

    fetchCardioWorkouts(false);
  }, [activeTab, user, cardioCacheKey, cardioCacheTtl]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (activeTab !== 'cardio' || !user) return;
      // если долго в фоне — обновим молча
      const raw = localStorage.getItem(cardioCacheKey);
      let needRefresh = true;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { timestamp: number };
          const age = Date.now() - (parsed.timestamp || 0);
          needRefresh = age > cardioCacheTtl;
        } catch {
          needRefresh = true;
        }
      }
      if (needRefresh) {
        // запустим без оверлея, чтобы не мигало
        (async () => {
          try {
            const { data, error } = await supabase
              .from('workouts')
              .select('workout_date')
              .eq('user_id', user.id)
              .eq('is_cardio', true)
              .order('workout_date', { ascending: false });
            if (!error && data) {
              setCardioWorkouts(data);
              localStorage.setItem(
                cardioCacheKey,
                JSON.stringify({ data, timestamp: Date.now() })
              );
            }
          } catch {
            /* noop */
          }
        })();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [activeTab, user, cardioCacheKey, cardioCacheTtl]);

  // Calculate weeks for selected month
  const cardioWeeks = useMemo((): CardioWeek[] => {
    if (!selectedCardioMonth) return [];

    const [year, month] = selectedCardioMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    firstDay.setHours(0, 0, 0, 0);
    lastDay.setHours(23, 59, 59, 999);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weeks: CardioWeek[] = [];
    let currentDate = new Date(firstDay);

    // Adjust to Monday of the first week
    const dayOfWeek = currentDate.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    currentDate.setDate(currentDate.getDate() + daysToMonday);

    while (currentDate <= lastDay || (currentDate.getMonth() === month - 1 || (currentDate.getMonth() === month - 2 && currentDate.getDate() > 20))) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekStart.setHours(0, 0, 0, 0);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999); // Set the end of the week to the last second of the day

      // Only include weeks that overlap with the selected month
      if (weekEnd >= firstDay && weekStart <= lastDay) {
        const count = cardioWorkouts.filter(w => {
          const [dYear, dMonth, dDay] = w.workout_date.split('-').map(Number);
          if (!dYear || !dMonth || !dDay) {
            return false;
          }
          const d = new Date(dYear, dMonth - 1, dDay);
          d.setHours(12, 0, 0, 0);
          return d >= weekStart && d <= weekEnd;
        }).length;

        const isCurrentWeek = today >= weekStart && today <= weekEnd;

        weeks.push({
          weekStart: weekStart.toISOString().slice(0, 10),
          weekEnd: weekEnd.toISOString().slice(0, 10),
          weekLabel: `${weekStart.getDate()}.${String(weekStart.getMonth() + 1).padStart(2, '0')} - ${weekEnd.getDate()}.${String(weekEnd.getMonth() + 1).padStart(2, '0')}`,
          count,
          goal: cardioGoal,
          isCurrentWeek,
        });
      }

      currentDate.setDate(currentDate.getDate() + 7);
      if (currentDate > lastDay && currentDate.getMonth() !== month - 1) break;
    }

    return weeks;
  }, [selectedCardioMonth, cardioWorkouts, cardioGoal]);

  // Calculate monthly stats
  const cardioMonthStats = useMemo((): CardioMonthStats[] => {
    const stats: Record<string, CardioMonthStats> = {};
    const monthNames = t.cardio.monthsShort;

    cardioWorkouts.forEach(w => {
      const d = new Date(w.workout_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!stats[key]) {
        stats[key] = {
          month: key,
          year: d.getFullYear(),
          count: 0,
          monthLabel: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        };
      }
      stats[key].count++;
    });

    return Object.values(stats).sort((a, b) => b.month.localeCompare(a.month));
  }, [cardioWorkouts]);

  // Month selector options
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const monthNames = t.cardio.months;
    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      options.push({
        value,
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
      });
    }

    return options;
  }, []);

  // Total cardio this month
  const totalCardioThisMonth = useMemo(() => {
    if (!selectedCardioMonth) return 0;
    return cardioMonthStats.find(s => s.month === selectedCardioMonth)?.count || 0;
  }, [selectedCardioMonth, cardioMonthStats]);

  const periodOptions = [
    { id: 'all', label: t.progress.period.all },
    { id: '3m', label: t.progress.period.threeMonths },
    { id: '6m', label: t.progress.period.sixMonths },
    { id: '1y', label: t.progress.period.oneYear },
    { id: 'custom', label: t.progress.period.custom },
  ] as const;

  const currentPeriodLabel = periodOptions.find((opt) => opt.id === period)?.label || 'Выбрать';

  const filteredDataPoints = useMemo(() => {
    if (!progressData) return [] as ProgressDataPoint[];

    const points = progressData.dataPoints;

    if (period === 'all') {
      return points;
    }

    const now = new Date();

    if (period === '3m' || period === '6m' || period === '1y') {
      const fromDate = new Date(now);

      if (period === '3m') {
        fromDate.setMonth(fromDate.getMonth() - 3);
      } else if (period === '6m') {
        fromDate.setMonth(fromDate.getMonth() - 6);
      } else {
        fromDate.setFullYear(fromDate.getFullYear() - 1);
      }

      return points.filter((p) => new Date(p.date) >= fromDate);
    }

    if (period === 'custom') {
      if (!customFrom && !customTo) {
        return points;
      }

      const fromDate = customFrom ? new Date(customFrom) : null;
      const toDate = customTo ? new Date(customTo) : null;

      return points.filter((p) => {
        const d = new Date(p.date);

        if (fromDate && d < fromDate) return false;

        if (toDate) {
          const toInclusive = new Date(toDate);
          toInclusive.setHours(23, 59, 59, 999);
          if (d > toInclusive) return false;
        }

        return true;
      });
    }

    return points;
  }, [progressData, period, customFrom, customTo]);

  const chartMinWidth = Math.max((filteredDataPoints.length || 0) * 56, 320);

  const visibleStats = useMemo(() => {
    if (!progressData || filteredDataPoints.length === 0) {
      return null as
        | null
        | {
            totalSessions: number;
            maxWeight: number;
            minWeight: number;
          };
    }

    const weights = filteredDataPoints.map((d) => d.weight);

    const totalSessions = filteredDataPoints.length;
    const maxWeight = Math.max(...weights);
    const minWeight = Math.min(...weights);

    return { totalSessions, maxWeight, minWeight };
  }, [progressData, filteredDataPoints]);

  const visibleGrowth = useMemo(() => {
    if (!filteredDataPoints || filteredDataPoints.length <= 1) return '—';

    const firstWeight = filteredDataPoints[0].weight;
    const lastWeight = filteredDataPoints[filteredDataPoints.length - 1].weight;

    if (firstWeight <= 0) return '—';

    const value = ((lastWeight - firstWeight) / firstWeight) * 100;
    const sign = value > 0 ? '+' : '';

    return `${sign}${value.toFixed(1)}%`;
  }, [filteredDataPoints]);

  const sortedExercises = useMemo(() => {
    const sorted = [...exercises];
    switch (exerciseSort) {
      case 'lastAdded':
        return sorted.sort((a, b) => {
          if (!a.lastSetDate && !b.lastSetDate) return a.name.localeCompare(b.name, 'ru');
          if (!a.lastSetDate) return 1;
          if (!b.lastSetDate) return -1;
          return b.lastSetDate.localeCompare(a.lastSetDate);
        });
      case 'mostFrequent':
        return sorted.sort((a, b) => {
          if (b.totalSets !== a.totalSets) return b.totalSets - a.totalSets;
          return a.name.localeCompare(b.name, 'ru');
        });
      case 'alphabetical':
      default:
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    }
  }, [exercises, exerciseSort]);

  const filteredExercises = searchQuery.trim()
    ? sortedExercises.filter((ex) => normalizeExerciseName(ex.name).includes(normalizeExerciseName(searchQuery)))
    : sortedExercises;

  if (loading && activeTab === 'exercises') {
    return <WorkoutLoadingOverlay message={t.progress.loading} />;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto pt-safe pb-4">
      {/* CSS стили вынесены в styles/header-scroll.css */}
      {/* Хедер */}
      <div className={`mb-6 glass card-dark p-4 flex items-center gap-4 header-container ${isScrolling ? 'scrolling' : ''}`}>
        <button
          onClick={handleBack}
          className="shrink-0 inline-flex items-center justify-center p-2 rounded-full border border-transparent text-white bg-transparent transition-colors focus:outline-none active:outline-none back-button-plain"
          aria-label={t.common.back}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 text-xl font-bold text-center">
          {activeTab === 'exercises' 
            ? (selectedExercise || t.progress.title) 
            : t.progress.cardio
          }
        </h1>
        {activeTab === 'cardio' && (
          <button
            onClick={() => setIsCardioInfoOpen(true)}
            className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full text-white bg-white/10 hover:bg-white/20 transition-colors"
            aria-label={language === 'ru' ? 'Информация о кардио' : 'Cardio info'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* Вкладки */}
      {!selectedExercise && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('exercises')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'exercises'
                ? 'bg-blue-500/30 text-white border border-blue-400/40'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            {t.progress.exercises}
          </button>
          <button
            onClick={() => setActiveTab('cardio')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-all ${
              activeTab === 'cardio'
                ? 'bg-green-500/30 text-white border border-green-400/40'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            {t.progress.cardio}
          </button>
        </div>
      )}

      {/* Список упражнений */}
      {!selectedExercise && activeTab === 'exercises' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 glass card-dark rounded-full px-4 py-3 search-container">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 10.5a7.5 7.5 0 0013.15 6.15z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.progress.search}
                  aria-label={t.progress.search}
                  className="flex-1 bg-transparent border-0 outline-none ring-0 focus:outline-none focus:ring-0 appearance-none text-white placeholder-white/60 text-base shadow-none search-input"
                />
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }}
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

            <div ref={sortDropdownRef} className="relative flex items-center">
              <button
                type="button"
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="w-11 h-11 grid place-items-center rounded-full bg-transparent hover:bg-white/10 active:bg-white/10 transition-colors leading-none"
                aria-label={t.progress.sort.label}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7 text-gray-400 block">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
              </button>

              {isSortDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 rounded-lg shadow-lg border border-white/10 z-50 progress-dropdown-menu">
                  {([
                    { id: 'alphabetical', label: t.progress.sort.alphabetical },
                    { id: 'lastAdded', label: t.progress.sort.lastAdded },
                    { id: 'mostFrequent', label: t.progress.sort.mostFrequent },
                  ] as const).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setExerciseSort(opt.id);
                        setIsSortDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-white/5 last:border-0 ${
                        exerciseSort === opt.id
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'text-gray-200 hover:bg-white/10'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {exercises.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">{t.progress.noData}</p>
              <p className="text-gray-500 text-sm mt-2">
                {t.progress.noDataHint}
              </p>
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">{t.progress.notFound}</p>
              <p className="text-gray-500 text-sm mt-2">{t.progress.notFoundHint}</p>
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
                      {t.progress.totalSets}{exercise.totalSets}
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

      {/* Кардио вкладка */}
      {activeTab === 'cardio' && !selectedExercise && (
        <div className="space-y-4">
          {loadingCardio ? (
            <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'transparent' }}>
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 border-4 border-transparent border-t-green-500 border-r-green-500 rounded-full animate-spin"></div>
                </div>
                <p className="text-white text-center">{t.cardio.loading}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Настройка цели */}
              <div className="glass card-dark p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">{t.cardio.weeklyGoal}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCardioGoal(Math.max(1, cardioGoal - 1))}
                      className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                      disabled={cardioGoal <= 1}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <span className="text-2xl font-bold text-green-400 w-8 text-center">{cardioGoal}</span>
                    <button
                      onClick={() => setCardioGoal(Math.min(7, cardioGoal + 1))}
                      className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                      disabled={cardioGoal >= 7}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-400">
                  {t.cardio.workoutsPerWeek.replace('{count}', String(cardioGoal))}
                </p>
              </div>

              {/* Статистика по месяцам */}
              <div className="glass card-dark p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">{t.cardio.monthlyStats}</h3>
                <div className="grid grid-cols-2 gap-3 text-center mb-4">
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-2xl font-bold text-green-400">{totalCardioThisMonth}</p>
                    <p className="text-xs text-gray-400">{t.cardio.thisMonth}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-2xl font-bold text-blue-400">{cardioWorkouts.length}</p>
                    <p className="text-xs text-gray-400">{t.cardio.totalCardio}</p>
                  </div>
                </div>

                {cardioMonthStats.length > 0 && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {cardioMonthStats.map((stat) => (
                      <div
                        key={stat.month}
                        onClick={() => setSelectedCardioMonth(stat.month)}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                          stat.month === selectedCardioMonth
                            ? 'bg-green-500/20 border border-green-500/30'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-sm text-gray-300">{stat.monthLabel}</span>
                        <span className="text-lg font-bold text-white">{stat.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Выбор месяца */}
              <div className="glass card-dark p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{t.cardio.weeklyProgress}</h3>
                  <div ref={monthDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                      className="flex items-center justify-between gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white hover:bg-white/15 transition-colors min-w-[160px] progress-dropdown-btn"
                    >
                      <span>
                        {monthOptions.find((o) => o.value === selectedCardioMonth)?.label || t.cardio.selectMonth}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-4 w-4 text-gray-400 transition-transform ${isMonthDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isMonthDropdownOpen && (
                      <div 
                        className="absolute top-full right-0 mt-1 w-full min-w-[160px] max-h-60 overflow-y-auto rounded-lg shadow-lg border border-white/10 z-50 progress-dropdown-menu"
                      >
                        {monthOptions.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setSelectedCardioMonth(opt.value);
                              setIsMonthDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-white/5 last:border-0 ${
                              selectedCardioMonth === opt.value
                                ? 'bg-green-500/20 text-green-400'
                                : 'text-gray-200 hover:bg-white/10'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Прогресс по неделям */}
                <div className="space-y-3">
                  {cardioWeeks.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">{t.cardio.noDataForMonth}</p>
                  ) : (
                    cardioWeeks.map((week, idx) => {
                      const progress = Math.min((week.count / week.goal) * 100, 100);
                      const isCompleted = week.count >= week.goal;
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg ${
                            week.isCurrentWeek
                              ? 'bg-green-500/10 border border-green-500/30'
                              : 'bg-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm ${
                              week.isCurrentWeek ? 'text-green-300 font-medium' : 'text-gray-300'
                            }`}>
                              {week.weekLabel}
                              {week.isCurrentWeek && ` (${language === 'ru' ? 'текущая' : 'current'})`}
                            </span>
                            <span className={`text-sm font-bold ${
                              isCompleted ? 'text-green-400' : 'text-gray-400'
                            }`}>
                              {week.count} / {week.goal}
                            </span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isCompleted
                                  ? 'bg-gradient-to-r from-green-500 to-green-400'
                                  : 'bg-gradient-to-r from-blue-500 to-blue-400'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          {!isCompleted && week.isCurrentWeek && (
                            <p className="text-xs text-gray-400 mt-1">
                              {language === 'ru' ? 'Осталось' : 'Remaining'}: {week.goal - week.count} {language === 'ru' ? pluralize(week.goal - week.count, 'тренировка', 'тренировки', 'тренировок') : (week.goal - week.count === 1 ? 'workout' : 'workouts')}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Модальное окно с информацией о кардио */}
      {isCardioInfoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setIsCardioInfoOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative glass card-dark p-5 rounded-2xl max-w-md w-full max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsCardioInfoOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
              aria-label={t.common.close}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold text-white pr-10">{t.cardio.aboutCardio}</h2>

            <div className="mt-4 space-y-4 text-sm text-gray-300 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <h3 className="text-green-400 font-semibold mb-2">{t.cardio.whatIsCardio}</h3>
                <p>{t.cardio.whatIsCardioDesc}</p>
              </div>

              <div>
                <h3 className="text-green-400 font-semibold mb-2">{t.cardio.howOften}</h3>
                <ul className="list-disc list-inside space-y-1">
                  {(t.cardio.howOftenItems as string[]).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-green-400 font-semibold mb-2">{t.cardio.targetHeartRate}</h3>
                <p>{t.cardio.targetHeartRateDesc}</p>
              </div>

              <div>
                <h3 className="text-green-400 font-semibold mb-2">{t.cardio.cardioTypes}</h3>
                <ul className="list-disc list-inside space-y-1">
                  {(t.cardio.cardioTypesItems as Array<{name: string; desc: string}>).map((item, i) => (
                    <li key={i}><b>{item.name}</b> — {item.desc}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-green-400 font-semibold mb-2">{t.cardio.benefits}</h3>
                <ul className="list-disc list-inside space-y-1">
                  {(t.cardio.benefitsItems as string[]).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-green-400 font-semibold mb-2">{t.cardio.whenToDo}</h3>
                <ul className="list-disc list-inside space-y-1">
                  {(t.cardio.whenToDoItems as string[]).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="cardio-warning p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <h3 className="cardio-warning-title text-yellow-400 font-semibold mb-2">⚠️ {t.cardio.warning}</h3>
                <p className="cardio-warning-text text-yellow-200/80">
                  {t.cardio.warningText}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* График прогресса */}
      {selectedExercise && (
        <div className="space-y-4">
          {loadingCardio ? (
            <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'transparent' }}>
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 border-4 border-transparent border-t-green-500 border-r-green-500 rounded-full animate-spin"></div>
                </div>
                <p className="text-white text-center">{t.cardio.loading}</p>
              </div>
            </div>
          ) : cardioWorkouts.length === 0 ? (
            <>
              {/* Статистика */}
              <div className="glass card-dark p-4 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {visibleStats?.totalSessions ?? 0}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {t.progress.stats.sessions}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-400">
                      {visibleStats ? `${visibleStats.maxWeight} ${t.common.kg}` : '—'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">{t.progress.stats.maxWeight}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-400">{visibleGrowth}</p>
                    <p className="text-sm text-gray-400 mt-1">{t.progress.stats.growth}</p>
                  </div>
                </div>
              </div>

              {/* График */}
              <div className="glass card-dark p-4 rounded-lg">
                <div className="flex flex-col gap-2 mb-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white">{language === 'ru' ? 'Динамика веса' : 'Weight progress'}</h3>
                    <div ref={dropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-xs text-gray-200 hover:bg-white/10 hover:border-white/25 transition-colors progress-dropdown-btn"
                      >
                        <span className="hidden sm:inline text-gray-400">{language === 'ru' ? 'Период:' : 'Period:'}</span>
                        <span className="font-medium">{currentPeriodLabel}</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-3 w-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute top-full right-0 mt-1 w-48 rounded-lg shadow-lg border border-white/10 z-50 overflow-hidden progress-dropdown-menu">
                          {periodOptions.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setPeriod(opt.id as typeof period);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                                period === opt.id
                                  ? 'bg-white/15 text-white font-medium'
                                  : 'text-gray-300 hover:bg-white/8'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {period === 'custom' && (
                    <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-300 flex-wrap text-center">
                      <label className="flex items-center gap-1">
                        <span>с</span>
                        <input
                          type="date"
                          value={customFrom ?? ''}
                          onChange={(e) => setCustomFrom(e.target.value || null)}
                          className="bg-transparent border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-0 focus:border-blue-400/80"
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <span>по</span>
                        <input
                          type="date"
                          value={customTo ?? ''}
                          onChange={(e) => setCustomTo(e.target.value || null)}
                          className="bg-transparent border border-white/20 rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-0 focus:border-blue-400/80"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {filteredDataPoints.length === 0 ? (
                  <div className="pt-6 pb-3 text-sm text-gray-400 text-center">
                    {language === 'ru' ? 'Нет данных за выбранный период' : 'No data for selected period'}
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 px-4 pb-2">
                    <div style={{ minWidth: `${chartMinWidth}px` }}>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={filteredDataPoints} margin={{ top: 24, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis
                            dataKey="displayDate"
                            stroke="rgba(255,255,255,0.5)"
                            style={{ fontSize: '12px' }}
                          />
                          <YAxis
                            stroke="rgba(255,255,255,0.5)"
                            style={{ fontSize: '12px' }}
                            label={{ value: `${t.exercise.weight}`, angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.7)', dx: 8 }}
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
                  </div>
                )}
              </div>

              {/* Таблица данных */}
              <div className="glass card-dark p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">{t.progress.history}</h3>
                {filteredDataPoints.length === 0 ? (
                  <p className="text-sm text-gray-400 mt-1">{t.progress.noData}</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {filteredDataPoints.slice().reverse().map((point, index) => (
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
                          <p className="text-lg font-bold text-white">{point.weight} {t.common.kg}</p>
                          <p className="text-sm text-gray-400">{point.reps || '?'} {t.exercise.reps.toLowerCase()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400">{t.progress.noData}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgressPage;
