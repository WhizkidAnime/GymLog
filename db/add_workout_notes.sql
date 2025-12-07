-- Добавляем колонку notes в таблицу workouts
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
