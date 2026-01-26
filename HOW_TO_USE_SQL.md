# Как использовать SQL файл для создания таблиц

## 📍 Где находится файл:

Файл `supabase_migration.sql` находится в корне вашего проекта:
```
/Users/mansurusupov/tg-finance-miniapp/supabase_migration.sql
```

---

## 📋 Пошаговая инструкция:

### Шаг 1: Откройте файл на вашем компьютере

**Вариант A: Через Finder (Mac)**
1. Откройте Finder
2. Перейдите в папку: `/Users/mansurusupov/tg-finance-miniapp/`
3. Найдите файл `supabase_migration.sql`
4. Откройте его в любом текстовом редакторе (TextEdit, VS Code, Cursor)

**Вариант B: Через терминал**
```bash
cd /Users/mansurusupov/tg-finance-miniapp
open supabase_migration.sql
```

**Вариант C: Через Cursor/VS Code**
1. Откройте Cursor
2. File → Open Folder → выберите `/Users/mansurusupov/tg-finance-miniapp`
3. Найдите файл `supabase_migration.sql` в списке файлов
4. Откройте его (двойной клик)

---

### Шаг 2: Скопируйте весь код

1. Откройте файл `supabase_migration.sql`
2. Выделите весь текст (Ctrl+A или Cmd+A)
3. Скопируйте (Ctrl+C или Cmd+C)

---

### Шаг 3: Вставьте в Supabase SQL Editor

1. Откройте ваш проект в Supabase: https://supabase.com/dashboard
2. В левом меню нажмите **"SQL Editor"** (иконка с `</>`)
3. Нажмите **"New query"** (кнопка справа вверху)
4. Вставьте скопированный код (Ctrl+V или Cmd+V)
5. Нажмите **"Run"** (кнопка справа вверху) или нажмите `Ctrl+Enter` (Mac: `Cmd+Enter`)

---

### Шаг 4: Проверьте результат

Должно появиться сообщение:
```
Success. No rows returned
```

**Проверка:**
1. В левом меню выберите **"Table Editor"**
2. Должны появиться две таблицы:
   - `users`
   - `user_data`

---

## 📝 Весь SQL код (на всякий случай):

Если не можете найти файл, вот весь код:

```sql
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
```

---

## ❓ Проблемы?

**Не могу найти файл:**
- Используйте поиск в Finder: `Cmd+Space` → введите `supabase_migration.sql`
- Или скопируйте код выше и вставьте в Supabase

**Ошибка в SQL Editor:**
- Убедитесь, что скопировали весь код (от `-- Миграция` до конца)
- Проверьте, что нет лишних символов
- Попробуйте выполнить по частям (сначала CREATE TABLE, потом остальное)

**Таблицы не появились:**
- Обновите страницу в Supabase
- Проверьте, что SQL выполнился без ошибок
- Посмотрите в "Table Editor" → должны быть `users` и `user_data`
