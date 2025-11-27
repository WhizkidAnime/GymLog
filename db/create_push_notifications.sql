-- Таблица для хранения push-подписок пользователей
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Таблица для хранения запланированных таймеров
CREATE TABLE IF NOT EXISTS scheduled_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id TEXT,
  fire_at TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL DEFAULT 'Таймер отдыха',
  body TEXT NOT NULL DEFAULT 'Время отдыха закончилось!',
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_timers_fire_at ON scheduled_timers(fire_at) WHERE sent = false;
CREATE INDEX IF NOT EXISTS idx_scheduled_timers_user_id ON scheduled_timers(user_id);

-- RLS политики
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_timers ENABLE ROW LEVEL SECURITY;

-- Политики для push_subscriptions
CREATE POLICY "Users can view own subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Политики для scheduled_timers
CREATE POLICY "Users can view own timers" ON scheduled_timers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own timers" ON scheduled_timers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own timers" ON scheduled_timers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own timers" ON scheduled_timers
  FOR DELETE USING (auth.uid() = user_id);

-- Функция для очистки старых таймеров (запускать по cron)
CREATE OR REPLACE FUNCTION cleanup_old_timers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM scheduled_timers
  WHERE fire_at < now() - INTERVAL '1 hour';
END;
$$;
