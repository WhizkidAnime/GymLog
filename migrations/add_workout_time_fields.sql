-- Добавление полей для учета времени тренировки
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ DEFAULT NULL;
