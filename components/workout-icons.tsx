import React from 'react';
import upperSvg from '../src/assets/icons/workout-icons/upper.svg';
import lowerBodyDaySvg from '../src/assets/icons/workout-icons/lower-body-day.svg';
import pushDaySvg from '../src/assets/icons/workout-icons/push-day.svg';
import pullDaySvg from '../src/assets/icons/workout-icons/pull-day.svg';
import legDaySvg from '../src/assets/icons/workout-icons/leg-day.svg';
import armDaySvg from '../src/assets/icons/workout-icons/arm-day.svg';
import shouldersSvg from '../src/assets/icons/workout-icons/shoulders.svg';
import chestSvg from '../src/assets/icons/workout-icons/chest.svg';
import backSvg from '../src/assets/icons/workout-icons/back.svg';
import absSvg from '../src/assets/icons/workout-icons/abs.svg';
import cardioSvg from '../src/assets/icons/workout-icons/cardio.svg';
import fullBodySvg from '../src/assets/icons/workout-icons/full-body.svg';

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
  <img
    src={upperSvg}
    alt=""
    className={className}
    style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
  />
);

// Нижняя часть тела (ноги/штаны)
export const LowerBodyIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <img
    src={lowerBodyDaySvg}
    alt=""
    className={className}
    style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
  />
);

// Push (Жим / Грудь+Трицепс+Плечи) - Штанга над грудью (Bench Press)
export const PushIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <img
    src={pushDaySvg}
    alt=""
    className={className}
    style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
  />
);

// Pull (Тяга / Спина+Бицепс) - Подтягивания
export const PullIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <img
    src={pullDaySvg}
    alt=""
    className={className}
    style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
  />
);

// Ноги (Квадрицепсы)
export const LegsIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <img
    src={legDaySvg}
    alt=""
    className={className}
    style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
  />
);

// Руки (Гантель)
export const ArmsIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <img
    src={armDaySvg}
    alt=""
    className={className}
    style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
  />
);

// Плечи (Акцент на дельты)
export const ShouldersIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <img
    src={shouldersSvg}
    alt=""
    className={className}
    style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
  />
);

// Грудь (Грудные мышцы)
export const ChestIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <img
    src={chestSvg}
    alt=""
    className={className}
    style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
  />
);

// Спина (V-shape)
export const BackIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <img
    src={backSvg}
    alt=""
    className={className}
    style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
  />
);

// Пресс (Кубики)
export const CoreIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <img
    src={absSvg}
    alt=""
    className={className}
    style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
  />
);

// Кардио (Пульс)
export const CardioIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <img
    src={cardioSvg}
    alt=""
    className={className}
    style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
  />
);

// Всё тело
export const FullBodyIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <img
    src={fullBodySvg}
    alt=""
    className={className}
    style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
  />
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
