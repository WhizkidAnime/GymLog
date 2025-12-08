import React from 'react';
import { createPortal } from 'react-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { UserBodyWeight } from '../../types/database.types';
import ConfirmDialog from '../confirm-dialog';

export type BodyWeightTrackerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  
  // Data
  bodyWeights: UserBodyWeight[];
  loadingWeights: boolean;
  weightChartData: Array<{ date: string; weight: number; fullDate: string }>;
  weightStats: { current: number; min: number; max: number; change: number } | null;
  
  // Form state
  newWeight: string;
  newWeightDate: string;
  savingWeight: boolean;
  deletingWeightId: string | null;
  
  // Delete confirm
  isDeleteWeightConfirmOpen: boolean;
  weightToDelete: string | null;
  
  // Actions
  setNewWeight: (value: string) => void;
  setNewWeightDate: (value: string) => void;
  setIsDeleteWeightConfirmOpen: (open: boolean) => void;
  handleAddWeight: () => Promise<void>;
  handleDeleteWeight: (id: string) => Promise<void>;
  handleOpenDeleteWeightConfirm: (id: string) => void;
};

function formatDateDDMMYYYY(iso: string): string {
  if (!iso || typeof iso !== 'string') return iso;
  const parts = iso.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year && month && day) {
      return `${day}.${month}.${year}`;
    }
  }
  return iso;
}

function formatDateInput(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Auto-insert dots
  if (digits.length <= 2) {
    return digits;
  } else if (digits.length <= 4) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  } else {
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`;
  }
}

export function BodyWeightTrackerModal({
  isOpen,
  onClose,
  bodyWeights,
  loadingWeights,
  weightChartData,
  weightStats,
  newWeight,
  newWeightDate,
  savingWeight,
  deletingWeightId,
  isDeleteWeightConfirmOpen,
  weightToDelete,
  setNewWeight,
  setNewWeightDate,
  setIsDeleteWeightConfirmOpen,
  handleAddWeight,
  handleDeleteWeight,
  handleOpenDeleteWeightConfirm,
}: BodyWeightTrackerModalProps): React.ReactElement | null {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg mx-4 glass card-dark rounded-xl shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Трекер веса тела</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Форма добавления */}
        <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/10">
          <p className="text-sm text-gray-300 font-medium">Добавить запись</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Вес (кг)</label>
              <input
                type="text"
                inputMode="decimal"
                value={newWeight}
                onChange={(e) => {
                  const val = e.target.value.replace('.', ',');
                  if (/^[0-9]*[,]?[0-9]*$/.test(val)) {
                    setNewWeight(val);
                  }
                }}
                placeholder="70,5"
                className="w-full h-10 px-3 rounded-lg bg-white/10 border border-white/20 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Дата</label>
              <input
                type="text"
                inputMode="numeric"
                value={newWeightDate}
                onChange={(e) => {
                  const formatted = formatDateInput(e.target.value);
                  setNewWeightDate(formatted);
                }}
                placeholder="08.12.2025"
                maxLength={10}
                className="w-full h-10 px-3 rounded-lg bg-white/10 border border-white/20 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleAddWeight}
              disabled={!newWeight || !newWeightDate || savingWeight}
              className="btn-glass btn-glass-sm btn-glass-primary disabled:opacity-50"
            >
              {savingWeight ? '...' : 'Добавить'}
            </button>
          </div>
        </div>

        {/* Статистика */}
        {weightStats && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="p-3 rounded-lg bg-white/5 text-center">
              <p className="text-xs text-gray-400">Текущий</p>
              <p className="text-lg font-bold text-white">{weightStats.current.toFixed(1).replace('.', ',')} кг</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 text-center">
              <p className="text-xs text-gray-400">Мин</p>
              <p className="text-lg font-bold text-green-400">{weightStats.min.toFixed(1).replace('.', ',')} кг</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 text-center">
              <p className="text-xs text-gray-400">Макс</p>
              <p className="text-lg font-bold text-orange-400">{weightStats.max.toFixed(1).replace('.', ',')} кг</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 text-center">
              <p className="text-xs text-gray-400">Изменение</p>
              <p className={`text-lg font-bold ${weightStats.change > 0 ? 'text-red-400' : weightStats.change < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                {weightStats.change > 0 ? '+' : ''}{weightStats.change.toFixed(1).replace('.', ',')} кг
              </p>
            </div>
          </div>
        )}

        {/* График */}
        {weightChartData.length > 1 && (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#9ca3af', fontSize: 10 }} 
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  tickLine={false}
                />
                <YAxis 
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tick={{ fill: '#9ca3af', fontSize: 10 }} 
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  tickLine={false}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(24,24,27,0.95)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1).replace('.', ',')} кг`, 'Вес']}
                />
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: '#60a5fa' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* История */}
        <div className="space-y-2">
          <p className="text-sm text-gray-300 font-medium">История ({bodyWeights.length})</p>
          {loadingWeights ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : bodyWeights.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Пока нет записей. Добавьте свой первый вес выше.
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {bodyWeights.slice(0, 20).map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">
                      {Number(w.weight).toFixed(1).replace('.', ',')} кг
                    </span>
                    <span className="text-sm text-gray-400">
                      {formatDateDDMMYYYY(new Date(w.recorded_at).toISOString().slice(0, 10))}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenDeleteWeightConfirm(w.id)}
                    disabled={deletingWeightId === w.id}
                    className="p-1 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {deletingWeightId === w.id ? (
                      <span className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin inline-block" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={isDeleteWeightConfirmOpen}
        onOpenChange={setIsDeleteWeightConfirmOpen}
        title="Удалить запись о весе?"
        description="Это действие необратимо."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        onConfirm={() => {
          if (weightToDelete) {
            handleDeleteWeight(weightToDelete);
          }
        }}
      />
    </div>,
    document.body
  );
}
