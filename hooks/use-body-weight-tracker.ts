import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { UserBodyWeight } from '../types/database.types';
import { supabase } from '../lib/supabase';
import { usePageState } from './usePageState';

const BODY_WEIGHTS_CACHE_KEY = 'body-weights-data';
const BODY_WEIGHTS_TTL = 10 * 60 * 1000; // 10 минут

export type UseBodyWeightTrackerProps = {
  userId: string | undefined;
};

export type UseBodyWeightTrackerReturn = {
  // State
  isWeightTrackerOpen: boolean;
  bodyWeights: UserBodyWeight[];
  loadingWeights: boolean;
  newWeight: string;
  newWeightDate: string;
  savingWeight: boolean;
  deletingWeightId: string | null;
  isDeleteWeightConfirmOpen: boolean;
  weightToDelete: string | null;
  
  // Computed
  weightChartData: Array<{ date: string; weight: number; fullDate: string }>;
  weightStats: { current: number; min: number; max: number; change: number } | null;
  
  // Actions
  setIsWeightTrackerOpen: (open: boolean) => void;
  setNewWeight: (value: string) => void;
  setNewWeightDate: (value: string) => void;
  setIsDeleteWeightConfirmOpen: (open: boolean) => void;
  loadBodyWeights: () => Promise<void>;
  handleAddWeight: () => Promise<void>;
  handleDeleteWeight: (id: string) => Promise<void>;
  handleOpenDeleteWeightConfirm: (id: string) => void;
};

export function useBodyWeightTracker({ userId }: UseBodyWeightTrackerProps): UseBodyWeightTrackerReturn {
  const db = supabase as any;
  const hasFetched = useRef(false);

  const [isWeightTrackerOpen, setIsWeightTrackerOpen] = useState(false);
  
  // Кэшируем данные веса через usePageState
  const [cachedWeights, setCachedWeights, saveCachedWeights] = usePageState<UserBodyWeight[]>({
    key: userId ? `${BODY_WEIGHTS_CACHE_KEY}-${userId}` : BODY_WEIGHTS_CACHE_KEY,
    initialState: [],
    ttl: BODY_WEIGHTS_TTL,
  });
  
  const [bodyWeights, setBodyWeights] = useState<UserBodyWeight[]>(cachedWeights);
  const [loadingWeights, setLoadingWeights] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newWeightDate, setNewWeightDate] = useState(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  });
  const [savingWeight, setSavingWeight] = useState(false);
  const [deletingWeightId, setDeletingWeightId] = useState<string | null>(null);
  const [isDeleteWeightConfirmOpen, setIsDeleteWeightConfirmOpen] = useState(false);
  const [weightToDelete, setWeightToDelete] = useState<string | null>(null);

  // Инициализация из кэша при монтировании
  useEffect(() => {
    if (cachedWeights.length > 0 && bodyWeights.length === 0) {
      setBodyWeights(cachedWeights);
      hasFetched.current = true;
    }
  }, []);

  const loadBodyWeights = useCallback(async (force = false) => {
    if (!userId) return;
    
    // Если уже загружали и есть кэш - не загружаем повторно
    if (!force && hasFetched.current && cachedWeights.length > 0) {
      setBodyWeights(cachedWeights);
      return;
    }
    
    // Если есть кэш и не форсируем - используем кэш
    if (!force && cachedWeights.length > 0) {
      setBodyWeights(cachedWeights);
      hasFetched.current = true;
      return;
    }
    
    setLoadingWeights(true);
    try {
      const { data, error } = await db
        .from('user_body_weights')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      const weights = data || [];
      setBodyWeights(weights);
      setCachedWeights(weights);
      hasFetched.current = true;
    } catch (error) {
      console.error('Error loading body weights:', error);
    } finally {
      setLoadingWeights(false);
    }
  }, [userId, db, cachedWeights, setCachedWeights]);

  const parseAndValidateDate = useCallback((dateStr: string): string | null => {
    // Поддерживаем формат д.мм.гггг или дд.мм.гггг
    const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!match) return null;
    
    const [, dayStr, monthStr, yearStr] = match;
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    
    // Basic validation
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    if (year < 1900 || year > 2100) return null;
    
    // Check valid day for month
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) return null;
    
    // Check not in future
    const inputDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (inputDate > today) return null;
    
    // Return ISO format с ведущими нулями
    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }, []);

  const formatTodayDate = useCallback((): string => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }, []);

  const handleAddWeight = useCallback(async () => {
    if (!userId || !newWeight || savingWeight) return;

    const weightValue = parseFloat(newWeight.replace(',', '.'));
    if (isNaN(weightValue) || weightValue <= 0 || weightValue > 500) {
      alert('Введите корректный вес (от 0.1 до 500 кг)');
      return;
    }

    const isoDate = parseAndValidateDate(newWeightDate);
    if (!isoDate) {
      alert('Введите корректную дату в формате д.мм.гггг (не в будущем)');
      return;
    }

    setSavingWeight(true);
    try {
      const { data, error } = await db
        .from('user_body_weights')
        .upsert({
          user_id: userId,
          weight: weightValue,
          recorded_at: isoDate,
        }, { onConflict: 'user_id,recorded_at' })
        .select()
        .single();

      if (error) throw error;

      const newWeights = (() => {
        const filtered = bodyWeights.filter(w => w.recorded_at !== isoDate);
        return [data, ...filtered].sort((a, b) =>
          new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
        );
      })();
      setBodyWeights(newWeights);
      setCachedWeights(newWeights);
      setNewWeight('');
      setNewWeightDate(formatTodayDate());
    } catch (error) {
      console.error('Error saving weight:', error);
      alert('Не удалось сохранить вес');
    } finally {
      setSavingWeight(false);
    }
  }, [userId, newWeight, newWeightDate, savingWeight, db, parseAndValidateDate, formatTodayDate, bodyWeights, setCachedWeights]);

  const handleDeleteWeight = useCallback(async (id: string) => {
    if (!userId || deletingWeightId) return;

    setDeletingWeightId(id);
    try {
      const { error } = await db
        .from('user_body_weights')
        .delete()
        .eq('id', id);

      if (error) throw error;
      const newWeights = bodyWeights.filter(w => w.id !== id);
      setBodyWeights(newWeights);
      setCachedWeights(newWeights);
      setIsDeleteWeightConfirmOpen(false);
      setWeightToDelete(null);
    } catch (error) {
      console.error('Error deleting weight:', error);
      alert('Не удалось удалить запись');
    } finally {
      setDeletingWeightId(null);
    }
  }, [userId, deletingWeightId, db, bodyWeights, setCachedWeights]);

  const handleOpenDeleteWeightConfirm = useCallback((id: string) => {
    setWeightToDelete(id);
    setIsDeleteWeightConfirmOpen(true);
  }, []);

  const weightChartData = useMemo(() => {
    return [...bodyWeights]
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .slice(-30)
      .map(w => ({
        date: new Date(w.recorded_at).toLocaleDateString('ru', { day: 'numeric', month: 'short' }),
        weight: Number(w.weight),
        fullDate: w.recorded_at,
      }));
  }, [bodyWeights]);

  const weightStats = useMemo(() => {
    if (bodyWeights.length === 0) return null;
    const weights = bodyWeights.map(w => Number(w.weight));
    const current = weights[0];
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const change = bodyWeights.length > 1 ? current - weights[weights.length - 1] : 0;
    return { current, min, max, change };
  }, [bodyWeights]);

  return {
    isWeightTrackerOpen,
    bodyWeights,
    loadingWeights,
    newWeight,
    newWeightDate,
    savingWeight,
    deletingWeightId,
    isDeleteWeightConfirmOpen,
    weightToDelete,
    weightChartData,
    weightStats,
    setIsWeightTrackerOpen,
    setNewWeight,
    setNewWeightDate,
    setIsDeleteWeightConfirmOpen,
    loadBodyWeights,
    handleAddWeight,
    handleDeleteWeight,
    handleOpenDeleteWeightConfirm,
  };
}
