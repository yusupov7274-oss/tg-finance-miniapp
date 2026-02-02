-- Схема БД для Telegram mini-app «Личные финансы»
-- PostgreSQL, идемпотентный скрипт (выполнять в Railway Postgres или любом клиенте)

-- =============================================================================
-- Вспомогательная функция для updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. Пользователи (Telegram)
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id           BIGSERIAL PRIMARY KEY,
  tg_user_id   BIGINT NOT NULL UNIQUE,
  username     TEXT,
  first_name   TEXT,
  last_name    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_tg_user_id ON users(tg_user_id);

DROP TRIGGER IF EXISTS tr_users_updated_at ON users;
CREATE TRIGGER tr_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- =============================================================================
-- 2. Счета
-- =============================================================================
CREATE TABLE IF NOT EXISTS accounts (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  currency_code  VARCHAR(3) NOT NULL DEFAULT 'RUB',
  initial_balance NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

DROP TRIGGER IF EXISTS tr_accounts_updated_at ON accounts;
CREATE TRIGGER tr_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- =============================================================================
-- 3. Категории доходов
-- =============================================================================
CREATE TABLE IF NOT EXISTS income_categories (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_income_categories_user_id ON income_categories(user_id);

DROP TRIGGER IF EXISTS tr_income_categories_updated_at ON income_categories;
CREATE TRIGGER tr_income_categories_updated_at
  BEFORE UPDATE ON income_categories
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- =============================================================================
-- 4. Категории расходов
-- =============================================================================
CREATE TABLE IF NOT EXISTS expense_categories (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON expense_categories(user_id);

DROP TRIGGER IF EXISTS tr_expense_categories_updated_at ON expense_categories;
CREATE TRIGGER tr_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- =============================================================================
-- 5. Операции (доход / расход / перевод)
-- =============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id            BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type                  VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount                NUMERIC(18, 2) NOT NULL,
  currency_code         VARCHAR(3) NOT NULL DEFAULT 'RUB',
  income_category_id    BIGINT REFERENCES income_categories(id) ON DELETE SET NULL,
  expense_category_id   BIGINT REFERENCES expense_categories(id) ON DELETE SET NULL,
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  description           TEXT,
  transfer_to_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at ON transactions(occurred_at);

DROP TRIGGER IF EXISTS tr_transactions_updated_at ON transactions;
CREATE TRIGGER tr_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- =============================================================================
-- 6. Месячные бюджеты (план расходов)
-- =============================================================================
CREATE TABLE IF NOT EXISTS monthly_budgets (
  id                   BIGSERIAL PRIMARY KEY,
  user_id              BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year_month           DATE NOT NULL,
  expense_category_id   BIGINT REFERENCES expense_categories(id) ON DELETE CASCADE,
  amount               NUMERIC(18, 2) NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, year_month, expense_category_id)
);

CREATE INDEX IF NOT EXISTS idx_monthly_budgets_user_id ON monthly_budgets(user_id);

DROP TRIGGER IF EXISTS tr_monthly_budgets_updated_at ON monthly_budgets;
CREATE TRIGGER tr_monthly_budgets_updated_at
  BEFORE UPDATE ON monthly_budgets
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- =============================================================================
-- 7. Настройки пользователя
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_settings (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  settings   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

DROP TRIGGER IF EXISTS tr_user_settings_updated_at ON user_settings;
CREATE TRIGGER tr_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- =============================================================================
-- 8. Кэш подписки на Telegram-канал
-- =============================================================================
CREATE TABLE IF NOT EXISTS subscription_cache (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id   TEXT NOT NULL,
  is_subscribed BOOLEAN NOT NULL DEFAULT false,
  checked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_cache_user_id ON subscription_cache(user_id);

DROP TRIGGER IF EXISTS tr_subscription_cache_updated_at ON subscription_cache;
CREATE TRIGGER tr_subscription_cache_updated_at
  BEFORE UPDATE ON subscription_cache
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- =============================================================================
-- 9. Закрытые месяцы (учёт)
-- =============================================================================
CREATE TABLE IF NOT EXISTS closed_months (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year_month DATE NOT NULL,
  closed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  snapshot   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_closed_months_user_id ON closed_months(user_id);

DROP TRIGGER IF EXISTS tr_closed_months_updated_at ON closed_months;
CREATE TRIGGER tr_closed_months_updated_at
  BEFORE UPDATE ON closed_months
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- =============================================================================
-- 10. Проверки баланса
-- =============================================================================
CREATE TABLE IF NOT EXISTS balance_checks (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id      BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expected_balance NUMERIC(18, 2) NOT NULL,
  actual_balance  NUMERIC(18, 2) NOT NULL,
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_balance_checks_user_id ON balance_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_checks_account_id ON balance_checks(account_id);

DROP TRIGGER IF EXISTS tr_balance_checks_updated_at ON balance_checks;
CREATE TRIGGER tr_balance_checks_updated_at
  BEFORE UPDATE ON balance_checks
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
