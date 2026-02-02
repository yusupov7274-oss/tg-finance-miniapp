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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
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
  account_id            BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  type                  VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount                NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
  currency_code         VARCHAR(3) NOT NULL DEFAULT 'RUB',
  income_category_id    BIGINT REFERENCES income_categories(id) ON DELETE SET NULL,
  expense_category_id   BIGINT REFERENCES expense_categories(id) ON DELETE SET NULL,
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  description           TEXT,
  transfer_to_account_id BIGINT REFERENCES accounts(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_transactions_type_categories CHECK (
    (type = 'income'  AND income_category_id IS NOT NULL AND expense_category_id IS NULL AND transfer_to_account_id IS NULL) OR
    (type = 'expense' AND expense_category_id IS NOT NULL AND income_category_id IS NULL AND transfer_to_account_id IS NULL) OR
    (type = 'transfer' AND transfer_to_account_id IS NOT NULL AND income_category_id IS NULL AND expense_category_id IS NULL)
  )
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
  expense_category_id   BIGINT REFERENCES expense_categories(id) ON DELETE SET NULL,
  amount               NUMERIC(18, 2) NOT NULL CHECK (amount >= 0),
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
  channel_id   BIGINT NOT NULL,
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
  account_id      BIGINT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
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

-- =============================================================================
-- Идемпотентные миграции (для уже существующих БД)
-- =============================================================================

-- 1) transactions: FK account_id, transfer_to_account_id → ON DELETE RESTRICT
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_transfer_to_account_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_transfer_to_account_id_fkey
  FOREIGN KEY (transfer_to_account_id) REFERENCES accounts(id) ON DELETE RESTRICT;

-- 2) balance_checks: FK account_id → ON DELETE RESTRICT
ALTER TABLE balance_checks DROP CONSTRAINT IF EXISTS balance_checks_account_id_fkey;
ALTER TABLE balance_checks ADD CONSTRAINT balance_checks_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;

-- 3) transactions: CHECK amount > 0 и CHECK по типам категорий
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_transactions_amount_positive;
ALTER TABLE transactions ADD CONSTRAINT chk_transactions_amount_positive CHECK (amount > 0);

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_transactions_type_categories;
ALTER TABLE transactions ADD CONSTRAINT chk_transactions_type_categories CHECK (
  (type = 'income'  AND income_category_id IS NOT NULL AND expense_category_id IS NULL AND transfer_to_account_id IS NULL) OR
  (type = 'expense' AND expense_category_id IS NOT NULL AND income_category_id IS NULL AND transfer_to_account_id IS NULL) OR
  (type = 'transfer' AND transfer_to_account_id IS NOT NULL AND income_category_id IS NULL AND expense_category_id IS NULL)
);

-- 4) monthly_budgets: expense_category_id → ON DELETE SET NULL, CHECK amount >= 0
ALTER TABLE monthly_budgets DROP CONSTRAINT IF EXISTS monthly_budgets_expense_category_id_fkey;
ALTER TABLE monthly_budgets ADD CONSTRAINT monthly_budgets_expense_category_id_fkey
  FOREIGN KEY (expense_category_id) REFERENCES expense_categories(id) ON DELETE SET NULL;

ALTER TABLE monthly_budgets DROP CONSTRAINT IF EXISTS chk_monthly_budgets_amount_non_neg;
ALTER TABLE monthly_budgets ADD CONSTRAINT chk_monthly_budgets_amount_non_neg CHECK (amount >= 0);

-- 5) Уникальность категорий: (user_id, name)
ALTER TABLE income_categories DROP CONSTRAINT IF EXISTS income_categories_user_id_name_key;
ALTER TABLE income_categories ADD CONSTRAINT income_categories_user_id_name_key UNIQUE (user_id, name);

ALTER TABLE expense_categories DROP CONSTRAINT IF EXISTS expense_categories_user_id_name_key;
ALTER TABLE expense_categories ADD CONSTRAINT expense_categories_user_id_name_key UNIQUE (user_id, name);

-- 6) subscription_cache.channel_id: TEXT → BIGINT (идемпотентно: только если тип text)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_cache' AND column_name = 'channel_id' AND data_type = 'text'
  ) THEN
    ALTER TABLE subscription_cache ALTER COLUMN channel_id TYPE BIGINT USING channel_id::bigint;
  END IF;
END $$;
