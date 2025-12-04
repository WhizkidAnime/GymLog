-- Добавляем колонку icon в таблицу workouts
-- Значение может быть: upper, lower, push, pull, legs, arms, shoulders, chest, back, core, cardio, full или NULL
-- Используется для кастомных тренировок (без шаблона)

ALTER TABLE workouts
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT NULL;
