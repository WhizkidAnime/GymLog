-- Добавляем колонку icon в таблицу workout_templates
-- Значение может быть: upper, lower, push, pull, legs, arms, shoulders, chest, back, core, cardio, full или NULL

ALTER TABLE workout_templates
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT NULL;
