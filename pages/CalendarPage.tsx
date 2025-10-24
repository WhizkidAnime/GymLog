import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { getDaysInMonth, getFirstDayOfMonth, formatDate, getMonthYear } from '../utils/date-helpers';
import type { Workout } from '../types/database.types';

const calendarCache = new Map<string, any[]>();

const CalendarPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkouts = useCallback(async (fromCache = false) => {
    if (!user) return;

    const cacheKey = `${user.id}:${currentDate.getFullYear()}-${currentDate.getMonth()}`;
    
    // Если восстанавливаемся из кеша — используем его
    if (fromCache && calendarCache.has(cacheKey)) {
      setWorkouts(calendarCache.get(cacheKey)!);
      setLoading(false);
      return;
    }

    setLoading(true);

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
      const workoutsData = data || [];
      setWorkouts(workoutsData);
      calendarCache.set(cacheKey, workoutsData);
    }
    setLoading(false);
  }, [user, currentDate]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  // Обработка видимости страницы: восстанавливаем из кеша при возврате на вкладку
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
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };
  
  const workoutDates = new Set(workouts.map(w => w.workout_date));

  return (
    <div className="px-4 pt-4 pb-6 w-full h-[calc(100svh-4rem)] max-w-5xl mx-auto flex flex-col items-center">
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
              <span className={`flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-12 lg:w-12 rounded-full border ${isToday ? 'bg-blue-600 text-white border-transparent' : 'text-gray-100 border-transparent hover:border-white active:border-white'} transition-colors` }>
                {day}
              </span>
              {hasWorkout && (
                <div className="pointer-events-none absolute bottom-0 translate-y-1/2 h-1.5 w-1.5 bg-blue-500 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarPage;
