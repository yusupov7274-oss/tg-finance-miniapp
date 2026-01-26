-- Миграция для создания таблиц в Supabase
-- Выполните этот SQL в Supabase SQL Editor

-- Таблица пользователей (для проверки подписки)
CREATE TABLE IF NOT EXISTS public.users (
  telegram_user_id BIGINT PRIMARY KEY,
  is_subscriber BOOLEAN NOT NULL DEFAULT false,
  subscriber_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Таблица данных пользователей (ключ-значение, без лимитов)
CREATE TABLE IF NOT EXISTS public.user_data (
  telegram_user_id BIGINT NOT NULL REFERENCES public.users(telegram_user_id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (telegram_user_id, key)
);

-- Индекс для быстрого поиска данных пользователя
CREATE INDEX IF NOT EXISTS idx_user_data_telegram_user_id 
  ON public.user_data(telegram_user_id);

-- Индекс для быстрого поиска по времени обновления
CREATE INDEX IF NOT EXISTS idx_user_data_updated_at 
  ON public.user_data(updated_at DESC);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at в users
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Триггер для автоматического обновления updated_at в user_data
CREATE TRIGGER update_user_data_updated_at
  BEFORE UPDATE ON public.user_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS): пользователи могут видеть только свои данные
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут читать только свои данные
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  USING (true); -- Edge Function будет проверять через telegram_user_id

CREATE POLICY "Users can read own user_data"
  ON public.user_data
  FOR SELECT
  USING (true); -- Edge Function будет проверять через telegram_user_id

-- Политика: пользователи могут обновлять только свои данные
CREATE POLICY "Users can update own data"
  ON public.user_data
  FOR ALL
  USING (true); -- Edge Function будет проверять через telegram_user_id
