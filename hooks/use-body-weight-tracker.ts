import React, { useState, useCallback, useMemo, useRef } from 'react';
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
  weightDateInputRef: React.RefObject<HTMLInputElement | null>;
  
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
  const [newWeightDate, setNewWeightDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [savingWeight, setSavingWeight] = useState(false);
  const [deletingWeightId, setDeletingWeightId] = useState<string | null>(null);
  const [isDeleteWeightConfirmOpen, setIsDeleteWeightConfirmOpen] = useState(false);
  const [weightToDelete, setWeightToDelete] = useState<string | null>(null);
  const weightDateInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleAddWeight = useCallback(async () => {
    if (!userId || !newWeight || savingWeight) return;

    const weightValue = parseFloat(newWeight.replace(',', '.'));
    if (isNaN(weightValue) || weightValue <= 0 || weightValue > 500) {
      alert('Введите корректный вес (от 0.1 до 500 кг)');
      return;
    }

    setSavingWeight(true);
    try {
      const { data, error } = await db
        .from('user_body_weights')
        .upsert({
          user_id: userId,
          weight: weightValue,
          recorded_at: newWeightDate,
        }, { onConflict: 'user_id,recorded_at' })
        .select()
        .single();

      if (error) throw error;

      setBodyWeights(prev => {
        const filtered = prev.filter(w => w.recorded_at !== newWeightDate);
        return [data, ...filtered].sort((a, b) =>
          new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
        );
      });
      setNewWeight('');
      setNewWeightDate(new Date().toISOString().slice(0, 10));
    } catch (error) {
      console.error('Error saving weight:', error);
      alert('Не удалось сохранить вес');
    } finally {
      setSavingWeight(false);
    }
  }, [userId, newWeight, newWeightDate, savingWeight, db]);

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
    weightDateInputRef,
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
