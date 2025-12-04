import React from 'react';

export type WorkoutIconType = 
  | 'upper'
  | 'lower'
  | 'push'
  | 'pull'
  | 'legs'
  | 'arms'
  | 'shoulders'
  | 'chest'
  | 'back'
  | 'core'
  | 'cardio'
  | 'full';

interface IconProps {
  className?: string;
  size?: number;
}

// Верхняя часть тела (торс)
export const UpperBodyIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4c-4 0-6 2-6 5v5h12V9c0-3-2-5-6-5z" />
    <path d="M6 14v6h12v-6" />
    <path d="M9 4v2" />
    <path d="M15 4v2" />
  </svg>
);

// Нижняя часть тела (ноги/штаны)
export const LowerBodyIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4h12v3l-1 13h-4l-1-8-1 8h-4l-1-13V4z" />
    <path d="M6 7h12" />
  </svg>
);

// Push (Жим / Грудь+Трицепс+Плечи) - Штанга над грудью (Bench Press)
export const PushIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 18h16" />
    <path d="M6 18v-3a3 3 0 0 1 6 0v3" />
    <path d="M12 18v-3a3 3 0 0 1 6 0v3" />
    <path d="M3 8h18" />
    <path d="M6 8v4" />
    <path d="M18 8v4" />
    <rect x="4" y="6" width="2" height="4" rx="1" />
    <rect x="18" y="6" width="2" height="4" rx="1" />
  </svg>
);

// Pull (Тяга / Спина+Бицепс) - Подтягивания
export const PullIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5h18" />
    <path d="M6 5v5c0 3 2 5 6 5s6-2 6-5V5" />
    <path d="M12 15v6" />
    <path d="M9 21h6" />
  </svg>
);

// Ноги (Квадрицепсы)
export const LegsIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4c-4 0-6 8-6 10s1 7 3 7h6c2 0 3-5 3-7s-2-10-6-10z" />
    <path d="M12 4v17" />
    <path d="M6 14c0 0 2-1 6-1s6 1 6 1" />
  </svg>
);

// Руки (Гантель)
export const ArmsIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 10v4" />
    <path d="M18 10v4" />
    <path d="M9 12h6" />
    <rect x="4" y="8" width="2" height="8" rx="1" />
    <rect x="18" y="8" width="2" height="8" rx="1" />
    <path d="M2 9h2v6H2z" />
    <path d="M20 9h2v6h-2z" />
  </svg>
);

// Плечи (Акцент на дельты)
export const ShouldersIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5c-4 0-8 3-8 7v8h16v-8c0-4-4-7-8-7z" />
    <path d="M4 12c0-2 2-4 4-4" />
    <path d="M20 12c0-2-2-4-4-4" />
    <path d="M12 5v4" />
  </svg>
);

// Грудь (Грудные мышцы)
export const ChestIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="5" width="14" height="16" rx="2" />
    <path d="M5 10h14" />
    <path d="M12 5v16" />
    <path d="M8 10c0 2 1 3 4 3s4-1 4-3" />
  </svg>
);

// Спина (V-shape)
export const BackIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 5l-2 5 5 11h4l5-11-2-5H7z" />
    <path d="M12 5v16" />
    <path d="M8 10l4 4 4-4" />
  </svg>
);

// Пресс (Кубики)
export const CoreIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="12" height="16" rx="2" />
    <path d="M6 9h12" />
    <path d="M6 14h12" />
    <path d="M12 4v16" />
  </svg>
);

// Кардио (Пульс)
export const CardioIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

// Всё тело
export const FullBodyIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v10" />
    <path d="M9 10h6" />
    <path d="M9 21l3-4 3 4" />
    <path d="M7 10l-2 4" />
    <path d="M17 10l2 4" />
  </svg>
);

// Карта иконок по типу
export const WORKOUT_ICONS: Record<WorkoutIconType, {
  component: React.FC<IconProps>;
  label: string;
  color: string;
}> = {
  upper: { component: UpperBodyIcon, label: 'Верх', color: '#3b82f6' },
  lower: { component: LowerBodyIcon, label: 'Низ', color: '#8b5cf6' },
  push: { component: PushIcon, label: 'Push', color: '#ef4444' },
  pull: { component: PullIcon, label: 'Pull', color: '#22c55e' },
  legs: { component: LegsIcon, label: 'Ноги', color: '#f97316' },
  arms: { component: ArmsIcon, label: 'Руки', color: '#ec4899' },
  shoulders: { component: ShouldersIcon, label: 'Плечи', color: '#14b8a6' },
  chest: { component: ChestIcon, label: 'Грудь', color: '#f43f5e' },
  back: { component: BackIcon, label: 'Спина', color: '#6366f1' },
  core: { component: CoreIcon, label: 'Пресс', color: '#eab308' },
  cardio: { component: CardioIcon, label: 'Кардио', color: '#06b6d4' },
  full: { component: FullBodyIcon, label: 'Всё тело', color: '#a855f7' },
};

// Универсальный компонент иконки тренировки
export const WorkoutIcon: React.FC<{
  type: WorkoutIconType | null | undefined;
  className?: string;
  size?: number;
  showColor?: boolean;
}> = ({ type, className = '', size = 24, showColor = true }) => {
  if (!type || !WORKOUT_ICONS[type]) return null;
  
  const { component: Icon, color } = WORKOUT_ICONS[type];
  const style = showColor ? { color } : undefined;
  
  return <Icon className={className} size={size} />;
};

export default WorkoutIcon;
