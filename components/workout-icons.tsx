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

// Верхняя часть тела (торс + руки)
export const UpperBodyIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="4" r="2.5" />
    <path d="M12 6.5v6" />
    <path d="M8 8.5l-4 3v4" />
    <path d="M16 8.5l4 3v4" />
    <path d="M9 12.5h6" />
  </svg>
);

// Нижняя часть тела (ноги)
export const LowerBodyIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 4h8" />
    <path d="M9 4v5c0 1-1 2-1 4v7" />
    <path d="M15 4v5c0 1 1 2 1 4v7" />
    <circle cx="8" cy="21" r="1" />
    <circle cx="16" cy="21" r="1" />
  </svg>
);

// Push (толкающие)
export const PushIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </svg>
);

// Pull (тянущие)
export const PullIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" />
    <path d="M12 5l-7 7 7 7" />
  </svg>
);

// Ноги
export const LegsIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 3c0 0-1 4-1 8s1 7 1 10c0 1-1 2-2 2" />
    <path d="M14 3c0 0 1 4 1 8s-1 7-1 10c0 1 1 2 2 2" />
    <ellipse cx="10" cy="10" rx="1.5" ry="3" />
    <ellipse cx="14" cy="10" rx="1.5" ry="3" />
  </svg>
);

// Руки
export const ArmsIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8c-1 0-2.5.5-2.5 2.5S5 14 6 16c1 2 1.5 4.5 1.5 4.5" />
    <path d="M18 8c1 0 2.5.5 2.5 2.5S19 14 18 16c-1 2-1.5 4.5-1.5 4.5" />
    <ellipse cx="6" cy="11" rx="2" ry="3" />
    <ellipse cx="18" cy="11" rx="2" ry="3" />
    <path d="M9 5h6" />
  </svg>
);

// Плечи
export const ShouldersIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <path d="M6 9c-2 0-3 1.5-3 3" />
    <path d="M18 9c2 0 3 1.5 3 3" />
    <circle cx="5" cy="9" r="2" />
    <circle cx="19" cy="9" r="2" />
    <path d="M7 9h10" />
  </svg>
);

// Грудь
export const ChestIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10c0-3 3-5 8-5s8 2 8 5c0 2-1 4-3 5l-1 4H8l-1-4c-2-1-3-3-3-5z" />
    <path d="M9 10a2 2 0 1 0 0 4" />
    <path d="M15 10a2 2 0 1 1 0 4" />
    <path d="M12 8v6" />
  </svg>
);

// Спина
export const BackIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3c-4 0-7 2-7 5v8c0 2 2 4 4 5h6c2-1 4-3 4-5V8c0-3-3-5-7-5z" />
    <path d="M12 3v18" />
    <path d="M7 8c2 0 3 1 5 1s3-1 5-1" />
    <path d="M8 13c1.5 0 2.5.5 4 .5s2.5-.5 4-.5" />
  </svg>
);

// Пресс/Кор
export const CoreIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="7" y="4" width="10" height="16" rx="2" />
    <path d="M7 8h10" />
    <path d="M7 12h10" />
    <path d="M7 16h10" />
    <path d="M12 4v16" />
  </svg>
);

// Кардио
export const CardioIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21c-5-4-9-7.5-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 3.5-4 7-9 11z" />
    <path d="M3 12h4l2-3 3 6 2-3h7" />
  </svg>
);

// Всё тело
export const FullBodyIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="4" r="2.5" />
    <path d="M12 6.5v5.5" />
    <path d="M8 8l-4 3v3" />
    <path d="M16 8l4 3v3" />
    <path d="M9 12h6" />
    <path d="M9 12v9" />
    <path d="M15 12v9" />
    <circle cx="9" cy="22" r="1" />
    <circle cx="15" cy="22" r="1" />
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
