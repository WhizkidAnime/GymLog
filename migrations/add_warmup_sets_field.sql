-- Добавление поля is_warmup для разминочных подходов
ALTER TABLE workout_sets 
ADD COLUMN IF NOT EXISTS is_warmup BOOLEAN DEFAULT false;
