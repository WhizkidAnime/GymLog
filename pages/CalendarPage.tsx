import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../hooks/use-i18n';
import { usePageState } from '../hooks/usePageState';
import { getDaysInMonth, formatDate, getMonthYear } from '../utils/date-helpers';
import type { Workout } from '../types/database.types';
import { WORKOUT_ICONS, WorkoutIconType } from '../components/workout-icons';

type WorkoutWithDetails = Workout & {
  template_icon?: string | null;
  workout_icon?: string | null;
  template_name?: string | null;
};

const calendarCache = new Map<string, {
  workouts: WorkoutWithDetails[];
  timestamp: number;
}>();

const CACHE_TTL = 30000;

const CalendarPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language } = useI18n();
  const location = useLocation() as { state?: { removedDate?: string; refreshDate?: string } };
  const [pageState, setPageState] = usePageState({
    key: 'calendar-page',
    initialState: {
      currentDate: new Date(),
      workouts: [] as WorkoutWithDetails[],
      loading: true,
      hasInitialData: false,
    },
    ttl: 30 * 60 * 1000,
  });

  const { currentDate, workouts, loading, hasInitialData } = pageState;

  const setCurrentDate = (date: Date) => {
    setPageState(prev => ({ ...prev, currentDate: date }));
  };

  const setWorkouts = (workouts: WorkoutWithDetails[]) => {
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
      .select('id, workout_date, template_id, icon, notes, name, workout_templates(icon, name)')
      .eq('user_id', user.id)
      .gte('workout_date', formatDate(firstDay))
      .lte('workout_date', formatDate(lastDay));

    if (error) {
      console.error('Error fetching workouts:', error);
    } else {
      const workoutsData: WorkoutWithDetails[] = (data || []).map((w: any) => ({
        ...w,
        template_icon: w.workout_templates?.icon || null,
        workout_icon: w.icon || null,
        template_name: w.workout_templates?.name || null,
      }));
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

  useEffect(() => {
    if (!user) return;
    const removedDate = location.state?.removedDate;
    if (!removedDate) return;

    const cacheKey = `${user.id}:${currentDate.getFullYear()}-${currentDate.getMonth()}`;
    calendarCache.delete(cacheKey);
    fetchWorkouts(false, false);
  }, [location.state?.removedDate, user, currentDate, fetchWorkouts]);

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
  const daysOfWeekShort = t.calendar.daysOfWeekShort;
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

  const workoutsByDate = new Map<string, WorkoutWithDetails>();
  workouts.forEach(w => workoutsByDate.set(w.workout_date, w));

  const getDayOfWeek = (day: number): number => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayIndex = date.getDay();
    return dayIndex === 0 ? 6 : dayIndex - 1;
  };

  return (
    <div className="px-3 pt-3 pb-4 w-full max-w-2xl mx-auto flex flex-col">
      {loading && !hasInitialData ? (
        <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'transparent' }}>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-white text-center">{t.calendar.loading}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4 glass p-2 rounded-xl">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 rounded-full text-white transition-colors focus:outline-hidden active:bg-white/10"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-lg font-bold text-center capitalize">{getMonthYear(currentDate, language)}</h1>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 rounded-full text-white transition-colors focus:outline-hidden active:bg-white/10"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {(() => {
            const todayDateString = formatDate(today);
            const todayWorkout = workoutsByDate.get(todayDateString);
            const hasTodayWorkout = !!todayWorkout;
            const todayIconType = (todayWorkout?.workout_icon || todayWorkout?.template_icon) as WorkoutIconType | null;
            const todayIconData = todayIconType ? WORKOUT_ICONS[todayIconType] : null;
            const todayDayOfWeekIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
            const todayDayOfWeekLabel = daysOfWeekShort[todayDayOfWeekIndex];
            const todayWorkoutName = todayWorkout?.name || todayWorkout?.template_name;
            const todayNotes = todayWorkout?.notes;

            return (
              <div
                onClick={() => navigate(`/workout/${todayDateString}`)}
                className="glass rounded-xl p-4 mb-4 cursor-pointer transition-all active:scale-[0.99] ring-2 ring-blue-500"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-blue-400 font-medium uppercase mb-1">{t.calendar.today}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-blue-400">{today.getDate()}</span>
                      <span className="text-sm text-gray-400 uppercase">{todayDayOfWeekLabel}</span>
                    </div>
                  </div>
                  {hasTodayWorkout && todayIconData && (
                    <div style={{ color: todayIconData.color }} className="shrink-0">
                      {React.createElement(todayIconData.component, {
                        size: 40,
                        className: 'opacity-90',
                      })}
                    </div>
                  )}
                </div>

                {hasTodayWorkout ? (
                  <div className="mt-2">
                    {todayWorkoutName && (
                      <p className="text-base font-medium text-white/90">{todayWorkoutName}</p>
                    )}
                    {todayNotes && (
                      <p className="text-sm text-gray-400 line-clamp-2 mt-1 whitespace-pre-line">{todayNotes}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mt-2">{t.calendar.noWorkout}</p>
                )}
              </div>
            );
          })()}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
              const dateString = formatDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
              const workout = workoutsByDate.get(dateString);
              const hasWorkout = !!workout;
              const iconType = (workout?.workout_icon || workout?.template_icon) as WorkoutIconType | null;
              const iconData = iconType ? WORKOUT_ICONS[iconType] : null;
              const dayOfWeekIndex = getDayOfWeek(day);
              const dayOfWeekLabel = daysOfWeekShort[dayOfWeekIndex];
              const workoutName = workout?.name || workout?.template_name;
              const notes = workout?.notes;

              return (
                <div
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`calendar-cell glass rounded-xl p-2.5 cursor-pointer transition-all active:scale-[0.98] ${isToday ? 'calendar-cell-today ring-2 ring-blue-500' : ''}`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-lg font-bold ${isToday ? 'text-blue-400' : ''}`}>{day}</span>
                      <span className="text-xs text-gray-400 uppercase">{dayOfWeekLabel}</span>
                    </div>
                    {hasWorkout && iconData && (
                      <div style={{ color: iconData.color }} className="shrink-0">
                        {React.createElement(iconData.component, {
                          size: 32,
                          className: 'opacity-90',
                        })}
                      </div>
                    )}
                  </div>

                  {hasWorkout ? (
                    <div className="flex flex-col gap-0.5">
                      {workoutName && (
                        <p className="text-sm font-medium text-white/90 line-clamp-1">{workoutName}</p>
                      )}
                      {notes && (
                        <p className="text-xs text-gray-400 line-clamp-2 whitespace-pre-line">{notes}</p>
                      )}
                      {!workoutName && !notes && !iconData && (
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 bg-blue-500 rounded-full shrink-0" />
                          <p className="text-xs text-gray-400">{t.calendar.noWorkout}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="min-h-[32px]" />
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
