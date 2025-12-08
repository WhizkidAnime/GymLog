import { useState, useCallback, useMemo } from 'react';
import type { UserBodyWeight } from '../types/database.types';
import { supabase } from '../lib/supabase';

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

  const [isWeightTrackerOpen, setIsWeightTrackerOpen] = useState(false);
  const [bodyWeights, setBodyWeights] = useState<UserBodyWeight[]>([]);
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

  const loadBodyWeights = useCallback(async () => {
    if (!userId) return;
    setLoadingWeights(true);
    try {
      const { data, error } = await db
        .from('user_body_weights')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setBodyWeights(data || []);
    } catch (error) {
      console.error('Error loading body weights:', error);
    } finally {
      setLoadingWeights(false);
    }
  }, [userId, db]);

  const parseAndValidateDate = useCallback((dateStr: string): string | null => {
    // Expected format: dd.mm.yyyy
    const match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!match) return null;
    
    const [, dd, mm, yyyy] = match;
    const day = parseInt(dd, 10);
    const month = parseInt(mm, 10);
    const year = parseInt(yyyy, 10);
    
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
    
    // Return ISO format
    return `${yyyy}-${mm}-${dd}`;
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
      alert('Введите корректную дату в формате дд.мм.гггг (не в будущем)');
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

      setBodyWeights(prev => {
        const filtered = prev.filter(w => w.recorded_at !== isoDate);
        return [data, ...filtered].sort((a, b) =>
          new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
        );
      });
      setNewWeight('');
      setNewWeightDate(formatTodayDate());
    } catch (error) {
      console.error('Error saving weight:', error);
      alert('Не удалось сохранить вес');
    } finally {
      setSavingWeight(false);
    }
  }, [userId, newWeight, newWeightDate, savingWeight, db, parseAndValidateDate, formatTodayDate]);

  const handleDeleteWeight = useCallback(async (id: string) => {
    if (!userId || deletingWeightId) return;

    setDeletingWeightId(id);
    try {
      const { error } = await db
        .from('user_body_weights')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setBodyWeights(prev => prev.filter(w => w.id !== id));
      setIsDeleteWeightConfirmOpen(false);
      setWeightToDelete(null);
    } catch (error) {
      console.error('Error deleting weight:', error);
      alert('Не удалось удалить запись');
    } finally {
      setDeletingWeightId(null);
    }
  }, [userId, deletingWeightId, db]);

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
