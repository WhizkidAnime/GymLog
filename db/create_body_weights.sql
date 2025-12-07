-- Таблица для хранения веса тела пользователя
CREATE TABLE IF NOT EXISTS user_body_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight NUMERIC(5, 2) NOT NULL,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, recorded_at)
);

-- Включаем RLS
ALTER TABLE user_body_weights ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь видит только свои записи
CREATE POLICY "Users can view own body weights" ON user_body_weights
  FOR SELECT USING (auth.uid() = user_id);

-- Политика: пользователь может добавлять свои записи
CREATE POLICY "Users can insert own body weights" ON user_body_weights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Политика: пользователь может обновлять свои записи
CREATE POLICY "Users can update own body weights" ON user_body_weights
  FOR UPDATE USING (auth.uid() = user_id);

-- Политика: пользователь может удалять свои записи
CREATE POLICY "Users can delete own body weights" ON user_body_weights
  FOR DELETE USING (auth.uid() = user_id);

-- Индекс для быстрого поиска по user_id и дате
CREATE INDEX IF NOT EXISTS idx_user_body_weights_user_date ON user_body_weights(user_id, recorded_at DESC);
