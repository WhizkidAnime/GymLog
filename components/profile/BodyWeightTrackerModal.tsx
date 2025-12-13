import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import type { UserBodyWeight } from '../../types/database.types';
import ConfirmDialog from '../confirm-dialog';
import { useI18n } from '../../hooks/use-i18n';

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

function formatDateInput(value: string, prevValue: string): string {
  // Разрешаем ввод в формате д.мм.гггг или дд.мм.гггг
  const cleanValue = value.replace(/[^0-9.]/g, '');
  
  // Разбиваем по точкам
  const parts = cleanValue.split('.');
  
  // Ограничиваем части: день (1-2 цифры), месяц (1-2 цифры), год (до 4 цифр)
  let day = parts[0] || '';
  let month = parts[1] || '';
  let year = parts[2] || '';
  
  // Ограничиваем длину каждой части
  day = day.slice(0, 2);
  month = month.slice(0, 2);
  year = year.slice(0, 4);
  
  // Автоматически добавляем точку после ввода 2 цифр дня или месяца
  // только если пользователь добавляет символы (не удаляет)
  const isAdding = cleanValue.length > prevValue.replace(/[^0-9.]/g, '').length;
  
  if (parts.length === 1 && day.length === 2 && isAdding) {
    return `${day}.`;
  }
  
  if (parts.length === 2 && month.length === 2 && isAdding) {
    return `${day}.${month}.`;
  }
  
  // Собираем результат
  if (parts.length === 1) {
    return day;
  } else if (parts.length === 2) {
    return `${day}.${month}`;
  } else {
    return `${day}.${month}.${year}`;
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
  const { t, language } = useI18n();
  const [activeTooltip, setActiveTooltip] = useState<{ date: string; weight: number; x: number; y: number } | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [isLightTheme, setIsLightTheme] = useState(false);
  const ITEMS_PER_PAGE = 7;
  const chartWrapperRef = useRef<HTMLDivElement | null>(null);
  const TOOLTIP_WIDTH_PX = 144;
  const TOOLTIP_MARGIN_PX = 8;

  const formatChartDate = useCallback((iso: string): string => {
    try {
      const locale = language === 'ru' ? 'ru-RU' : 'en-US';
      return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    } catch {
      return iso;
    }
  }, [language]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const update = () => {
      try {
        setIsLightTheme(document.documentElement.classList.contains('light-theme'));
      } catch {
        setIsLightTheme(false);
      }
    };

    update();

    try {
      const observer = new MutationObserver(update);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    setHistoryPage(0);
  }, [bodyWeights.length]);

  const handleDotClick = useCallback((e: any, payload: any) => {
    e?.stopPropagation?.();
    if (!payload) return;
    const wrapper = chartWrapperRef.current;
    const target = e?.currentTarget as Element | null;
    if (!wrapper || !target || typeof (target as any).getBoundingClientRect !== 'function') return;
    const wrapperRect = wrapper.getBoundingClientRect();
    const targetRect = (target as any).getBoundingClientRect() as DOMRect;
    const rawX = targetRect.left + targetRect.width / 2 - wrapperRect.left;
    const y = targetRect.top + targetRect.height / 2 - wrapperRect.top;
    const half = TOOLTIP_WIDTH_PX / 2;
    const x = Math.max(half + TOOLTIP_MARGIN_PX, Math.min(rawX, wrapperRect.width - half - TOOLTIP_MARGIN_PX));

    setActiveTooltip({
      date: payload.fullDate,
      weight: payload.weight,
      x,
      y,
    });
  }, [TOOLTIP_MARGIN_PX, TOOLTIP_WIDTH_PX]);

  const handleChartClick = useCallback(() => {
    setActiveTooltip(null);
  }, []);

  const renderDot = useCallback((props: any) => {
    const { cx, cy, payload, index } = props;
    return (
      <circle
        key={`dot-${index}`}
        cx={cx}
        cy={cy}
        r={4}
        fill="#3b82f6"
        stroke="none"
        style={{ cursor: 'pointer' }}
        onClick={(e) => handleDotClick(e, payload)}
      />
    );
  }, [handleDotClick]);

  const renderActiveDot = useCallback((props: any) => {
    const { cx, cy, payload, index } = props;
    return (
      <circle
        key={`active-dot-${index}`}
        cx={cx}
        cy={cy}
        r={6}
        fill="#60a5fa"
        stroke="#fff"
        strokeWidth={2}
        style={{ cursor: 'pointer' }}
        onClick={(e) => handleDotClick(e, payload)}
      />
    );
  }, [handleDotClick]);

  const totalPages = Math.ceil(bodyWeights.length / ITEMS_PER_PAGE);
  const paginatedWeights = bodyWeights.slice(
    historyPage * ITEMS_PER_PAGE,
    (historyPage + 1) * ITEMS_PER_PAGE
  );

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center px-4"
      style={{ 
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        paddingBottom: 'calc(96px + env(safe-area-inset-bottom))'
      }}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        onTouchMove={(e) => e.preventDefault()}
      />
      <div
        className="relative glass card-dark p-5 rounded-2xl max-w-md w-full my-auto flex flex-col"
        style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom) - 120px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-semibold text-white pr-10">{t.bodyWeight.title}</h2>

        <div className="mt-4 space-y-4 overflow-y-auto custom-scrollbar pr-1 flex-1 min-h-0">

        {/* Форма добавления */}
        <div className="space-y-3 p-3 rounded-lg bg-white/5 border border-white/10">
          <p className="text-sm text-gray-300 font-medium">{t.bodyWeight.addWeight}</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">{t.bodyWeight.weight}</label>
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
                placeholder={t.bodyWeight.weightPlaceholder}
                className="w-full h-10 px-3 rounded-lg bg-white/10 border border-white/20 text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">{t.bodyWeight.date}</label>
              <input
                type="text"
                inputMode="numeric"
                value={newWeightDate}
                onChange={(e) => {
                  const formatted = formatDateInput(e.target.value, newWeightDate);
                  setNewWeightDate(formatted);
                }}
                placeholder={t.bodyWeight.datePlaceholder}
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
              {savingWeight ? t.bodyWeight.saving : t.bodyWeight.addWeight}
            </button>
          </div>
        </div>

        {/* Статистика */}
        {weightStats && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="p-3 rounded-lg bg-white/5 text-center">
              <p className="text-xs text-gray-400">{t.bodyWeight.stats.current}</p>
              <p className="text-lg font-bold text-white">{weightStats.current.toFixed(2).replace('.', ',')} {t.common.kg}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 text-center">
              <p className="text-xs text-gray-400">{t.bodyWeight.stats.min}</p>
              <p className="text-lg font-bold text-green-400">{weightStats.min.toFixed(2).replace('.', ',')} {t.common.kg}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 text-center">
              <p className="text-xs text-gray-400">{t.bodyWeight.stats.max}</p>
              <p className="text-lg font-bold text-orange-400">{weightStats.max.toFixed(2).replace('.', ',')} {t.common.kg}</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 text-center">
              <p className="text-xs text-gray-400">{t.bodyWeight.stats.change}</p>
              <p className={`text-lg font-bold ${weightStats.change > 0 ? 'text-red-400' : weightStats.change < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                {weightStats.change > 0 ? '+' : ''}{weightStats.change.toFixed(2).replace('.', ',')} {t.common.kg}
              </p>
            </div>
          </div>
        )}

        {/* График */}
        {weightChartData.length > 1 && (
          <div className="relative" onClick={handleChartClick} ref={chartWrapperRef}>
            <div className="overflow-x-auto pb-2">
              <div style={{ minWidth: `${Math.max(weightChartData.length * 50, 100)}px`, height: '192px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weightChartData} margin={{ top: 15, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isLightTheme ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.1)'} />
                    <XAxis 
                      dataKey="fullDate" 
                      tickFormatter={(v) => formatChartDate(String(v))}
                      tick={{ fill: '#9ca3af', fontSize: 10 }} 
                      axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={['dataMin - 2', 'dataMax + 2']}
                      tick={{ fill: '#9ca3af', fontSize: 10 }} 
                      axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                      tickLine={false}
                      tickFormatter={(v) => Number(v).toFixed(2).replace('.', ',')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={renderDot}
                      activeDot={renderActiveDot}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            {activeTooltip && (
              <div 
                className="absolute pointer-events-none w-36 text-center"
                style={{
                  left: `${activeTooltip.x}px`,
                  top: `${activeTooltip.y}px`,
                  transform: 'translate(-50%, calc(-100% - 12px))',
                  background: 'rgba(255,255,255,0.98)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#111827',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                  zIndex: 20
                }}
              >
                <p className="text-sm text-gray-600 truncate">{formatChartDate(activeTooltip.date)}</p>
                <p className="text-sm font-medium truncate">
                  <span className="text-gray-500">{t.bodyWeight.tooltipWeight}: </span>
                  <span className="text-green-600">{activeTooltip.weight.toFixed(2).replace('.', ',')} {t.common.kg}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* История */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-300 font-medium">{t.bodyWeight.history} ({bodyWeights.length})</p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryPage(p => Math.max(0, p - 1))}
                  disabled={historyPage === 0}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition-colors flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-xs text-gray-400 min-w-[40px] text-center">
                  {historyPage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setHistoryPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={historyPage >= totalPages - 1}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition-colors flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          {loadingWeights ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : bodyWeights.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              {t.bodyWeight.noData}. {t.bodyWeight.addFirstWeight}.
            </p>
          ) : (
            <div className="space-y-1">
              {paginatedWeights.map((w) => (
                <div
                  key={w.id}
                  className="grid grid-cols-[1fr_1fr_auto] items-center gap-3 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <span className="text-white font-medium tabular-nums">
                    {Number(w.weight).toFixed(2).replace('.', ',')} {t.common.kg}
                  </span>
                  <span className="text-sm text-gray-400 tabular-nums text-right">
                    {formatDateDDMMYYYY(new Date(w.recorded_at).toISOString().slice(0, 10))}
                  </span>
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
      </div>

      <ConfirmDialog
        open={isDeleteWeightConfirmOpen}
        onOpenChange={setIsDeleteWeightConfirmOpen}
        title={t.bodyWeight.deleteConfirm}
        description={t.bodyWeight.deleteConfirmDesc}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
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
