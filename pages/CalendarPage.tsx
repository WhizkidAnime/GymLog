import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePageState } from '../hooks/usePageState';
import { getDaysInMonth, getFirstDayOfMonth, formatDate, getMonthYear } from '../utils/date-helpers';
import type { Workout } from '../types/database.types';

const calendarCache = new Map<string, {
  workouts: Workout[];
  timestamp: number;
}>();

const CACHE_TTL = 30000;

const CalendarPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { removedDate?: string; refreshDate?: string } };
  const [pageState, setPageState] = usePageState({
    key: 'calendar-page',
    initialState: {
      currentDate: new Date(),
      workouts: [] as Workout[],
      loading: true,
      hasInitialData: false,
    },
    ttl: 30 * 60 * 1000,
  });

  const { currentDate, workouts, loading, hasInitialData } = pageState;

  const setCurrentDate = (date: Date) => {
    setPageState(prev => ({ ...prev, currentDate: date }));
  };

  const setWorkouts = (workouts: Workout[]) => {
    setPageState(prev => ({ ...prev, workouts }));
  };

  const setLoading = (loading: boolean) => {
    setPageState(prev => ({ ...prev, loading }));
  };

  const setHasInitialData = (hasInitialData: boolean) => {
    setPageState(prev => ({ ...prev, hasInitialData }));
  };

  const fetchWorkouts = useCallback(async (fromCache = false, silent = false) => {
    if (!user) return;

    const cacheKey = `${user.id}:${currentDate.getFullYear()}-${currentDate.getMonth()}`;
    const now = Date.now();

    let isSilent = silent;

    if (calendarCache.has(cacheKey)) {
      const cached = calendarCache.get(cacheKey)!;
      const cacheAge = now - cached.timestamp;

      if (fromCache && cacheAge < CACHE_TTL) {
        if (!hasInitialData) {
          setWorkouts(cached.workouts);
          setLoading(false);
          setHasInitialData(true);
        }
        return;
      }

      if (cacheAge >= CACHE_TTL) {
        if (!hasInitialData) {
          setWorkouts(cached.workouts);
          setHasInitialData(true);
        }
        isSilent = true;
      }
    }

    if (!isSilent) {
      setLoading(true);
    }

    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const { data, error } = await supabase
      .from('workouts')
      .select('id, workout_date')
      .eq('user_id', user.id)
      .gte('workout_date', formatDate(firstDay))
      .lte('workout_date', formatDate(lastDay));

    if (error) {
      console.error('Error fetching workouts:', error);
    } else {
      const workoutsData = (data as Workout[]) || [];
      setWorkouts(workoutsData);
      calendarCache.set(cacheKey, {
        workouts: workoutsData,
        timestamp: now,
      });
    }

    setLoading(false);
    setHasInitialData(true);
  }, [user, currentDate, hasInitialData]);

  useEffect(() => {
    if (!hasInitialData) {
      fetchWorkouts();
    }
  }, [currentDate.getFullYear(), currentDate.getMonth(), user]);

  // Если пришли со страницы тренировки после удаления — инвалидируем кеш и рефетчим
  useEffect(() => {
    if (!user) return;
    const removedDate = location.state?.removedDate;
    if (!removedDate) return;

    const cacheKey = `${user.id}:${currentDate.getFullYear()}-${currentDate.getMonth()}`;
    calendarCache.delete(cacheKey);
    fetchWorkouts(false, false);
  }, [location.state?.removedDate, user, currentDate, fetchWorkouts]);

  // Если вернулись со страницы тренировки (BackButton) — обновляем месяц
  useEffect(() => {
    if (!user) return;
    const refreshDate = location.state?.refreshDate;
    if (!refreshDate) return;

    const cacheKey = `${user.id}:${currentDate.getFullYear()}-${currentDate.getMonth()}`;
    calendarCache.delete(cacheKey);
    fetchWorkouts(false, false);
  }, [location.state?.refreshDate, user, currentDate, fetchWorkouts]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchWorkouts(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchWorkouts]);

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayIndex = getFirstDayOfMonth(currentDate);
  const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const today = new Date();

  const handleDayClick = (day: number) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    navigate(`/workout/${formatDate(selectedDate)}`);
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(newDate);
    setHasInitialData(false);
  };

  const workoutDates = new Set(workouts.map(w => w.workout_date));

  return (
    <div className="px-4 pt-4 pb-4 w-full max-w-5xl mx-auto flex flex-col items-center">
      {loading && !hasInitialData ? (
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'transparent' }}>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-white text-center">Загрузка календаря...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6 glass p-2 rounded-xl w-full max-w-xl">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-full border border-transparent text-white hover:border-white active:border-white transition-colors">&lt;</button>
            <h1 className="text-xl font-bold text-center capitalize">{getMonthYear(currentDate)}</h1>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-full border border-transparent text-white hover:border-white active:border-white transition-colors">&gt;</button>
          </div>

          <div className="grid grid-cols-7 gap-3 text-center text-sm text-gray-500 mb-3 w-full max-w-xl">
            {daysOfWeek.map(day => <div key={day}>{day}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-2 w-full max-w-xl">
            {Array.from({ length: firstDayIndex }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
              const dateString = formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
              const hasWorkout = workoutDates.has(dateString);

              return (
                <div
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className="relative flex items-center justify-center h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 lg:h-14 lg:w-14 rounded-full cursor-pointer mx-auto overflow-visible"
                >
                  <span className={`flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-12 lg:w-12 rounded-full border ${isToday ? 'bg-blue-600 text-white border-transparent' : 'text-gray-100 border-transparent hover:border-white active:border-white'} transition-colors`}>
                    {day}
                  </span>
                  {hasWorkout && (
                    <div className="pointer-events-none absolute bottom-0 translate-y-1/2 h-1.5 w-1.5 bg-blue-500 rounded-full" />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarPage;
