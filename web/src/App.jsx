import { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
import { setItem, loadAllFromCloud, saveAllToCloud, isCloudAvailable } from './lib/storage';
import Dashboard from './components/Dashboard';
import Accounts from './components/Accounts';
import Transactions from './components/Transactions';
import Statistics from './components/Statistics';
import MonthClosure from './components/MonthClosure';
import Settings from './components/Settings';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [hideBottomNav, setHideBottomNav] = useState(false);
  const [showKeyboardAddButton, setShowKeyboardAddButton] = useState(false);
  const activeFormRef = useRef(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [expensePlan, setExpensePlan] = useState(0);
  const [closedMonths, setClosedMonths] = useState([]);
  const [balanceChecks, setBalanceChecks] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [storageReady, setStorageReady] = useState(false);

  // Скрывать нижнюю навигацию и показывать кнопку "Добавить данные" при фокусе на полях ввода
  useEffect(() => {
    const focusableSelector = 'input, textarea, [contenteditable="true"]';
    const amountInputSelector = 'input[inputmode="decimal"], input[inputmode="numeric"], input[type="number"]';
    let showNavTimer = null;

    const handleFocusIn = (e) => {
      if (e.target.matches?.(focusableSelector)) {
        if (showNavTimer) {
          clearTimeout(showNavTimer);
          showNavTimer = null;
        }
        setHideBottomNav(true);

        if (e.target.matches?.(amountInputSelector)) {
          const form = e.target.closest?.('form');
          if (form) {
            activeFormRef.current = form;
            setShowKeyboardAddButton(true);
          } else {
            activeFormRef.current = null;
            setShowKeyboardAddButton(false);
          }
        } else {
          activeFormRef.current = null;
          setShowKeyboardAddButton(false);
        }
      }
    };

    const handleFocusOut = (e) => {
      if (e.target.matches?.(focusableSelector)) {
        const related = e.relatedTarget;
        if (related?.matches?.(focusableSelector)) return;
        showNavTimer = setTimeout(() => {
          setHideBottomNav(false);
          setShowKeyboardAddButton(false);
          activeFormRef.current = null;
        }, 200);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      if (showNavTimer) clearTimeout(showNavTimer);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Инициализация Telegram Web App
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      // Устанавливаем цветовую схему
      tg.setHeaderColor('#1e1e1e');
      tg.setBackgroundColor('#121212');
      
      // Отключаем вибрацию при клике (опционально)
      tg.enableClosingConfirmation();
      
      // Устанавливаем безопасные зоны для iOS
      const safeAreaInsets = tg.safeAreaInsets || { top: 0, bottom: 0 };
      document.documentElement.style.setProperty('--safe-area-inset-top', `${safeAreaInsets.top}px`);
      document.documentElement.style.setProperty('--safe-area-inset-bottom', `${safeAreaInsets.bottom}px`);
    }
  }, []);

  // Загрузка данных: сначала быстро из localStorage, потом синхронизация с сервером
  useEffect(() => {
    let cancelled = false;

    const defaultAccounts = [
      { id: 1, name: 'Основной счет', currency: 'RUB', balance: 0, color: '#2481cc' }
    ];
    const defaultCurrencies = [
      { code: 'RUB', name: 'Российский рубль', rate: 1, source: 'manual' },
      { code: 'USD', name: 'Доллар США', rate: 100, source: 'manual' },
      { code: 'EUR', name: 'Евро', rate: 110, source: 'manual' },
      { code: 'KZT', name: 'Казахстанский тенге', rate: 0.15, source: 'manual' }
    ];
    const defaultExpenseCategories = [
      'Продукты', 'Транспорт', 'Жилье', 'Развлечения',
      'Здоровье', 'Образование', 'Одежда', 'Подарки', 'Другое'
    ];
    const defaultIncomeCategories = ['Зарплата', 'Подарки', 'Инвестиции', 'Другое'];

    // Функция для загрузки из localStorage (синхронно, быстро)
    const loadFromLocalSync = () => {
      const PREFIX = 'finance_';
      const keys = ['accounts', 'transactions', 'currencies', 'expense_plan', 'closed_months', 'balance_checks', 'expense_categories', 'income_categories'];
      const result = {};
      
      for (const key of keys) {
        const k = PREFIX + key;
        const v = localStorage.getItem(k);
        if (v) {
          try {
            result[key] = JSON.parse(v);
          } catch {
            result[key] = v;
          }
        }
      }
      return result;
    };

    // Функция для применения данных к состоянию
    const applyData = (raw) => {
      let acc = Array.isArray(raw.accounts) && raw.accounts.length ? raw.accounts : defaultAccounts;
      setAccounts(acc);
      if (!Array.isArray(raw.accounts) || !raw.accounts.length) {
        setItem('accounts', acc);
      }

      let tr = Array.isArray(raw.transactions) ? raw.transactions : [];
      setTransactions(tr);
      if (!Array.isArray(raw.transactions)) setItem('transactions', []);

      let cur = Array.isArray(raw.currencies) && raw.currencies.length ? raw.currencies : defaultCurrencies;
      const hasKZT = cur.some(c => c.code === 'KZT');
      if (!hasKZT) {
        cur = [...cur, { code: 'KZT', name: 'Казахстанский тенге', rate: 0.15, source: 'manual' }];
        setItem('currencies', cur);
      }
      setCurrencies(cur);
      if (!Array.isArray(raw.currencies) || !raw.currencies.length) {
        setItem('currencies', cur);
      }

      const plan = typeof raw.expense_plan === 'number' && raw.expense_plan >= 0
        ? raw.expense_plan
        : (typeof raw.expense_plan === 'string' ? parseFloat(raw.expense_plan) : 0) || 0;
      setExpensePlan(plan);
      if (raw.expense_plan == null) setItem('expense_plan', 0);

      let closed = Array.isArray(raw.closed_months) ? raw.closed_months : [];
      setClosedMonths(closed);
      if (!Array.isArray(raw.closed_months)) setItem('closed_months', []);

      let checks = Array.isArray(raw.balance_checks) ? raw.balance_checks : [];
      setBalanceChecks(checks);
      if (!Array.isArray(raw.balance_checks)) setItem('balance_checks', []);

      let expCat = Array.isArray(raw.expense_categories) && raw.expense_categories.length
        ? raw.expense_categories
        : defaultExpenseCategories;
      setExpenseCategories(expCat);
      if (!Array.isArray(raw.expense_categories) || !raw.expense_categories.length) {
        setItem('expense_categories', defaultExpenseCategories);
      }

      let incCat = Array.isArray(raw.income_categories) && raw.income_categories.length
        ? raw.income_categories
        : defaultIncomeCategories;
      setIncomeCategories(incCat);
      if (!Array.isArray(raw.income_categories) || !raw.income_categories.length) {
        setItem('income_categories', defaultIncomeCategories);
      }
    };

    // Шаг 1: Быстро загружаем из localStorage и показываем UI
    const localData = loadFromLocalSync();
    applyData(localData);
    if (!cancelled) setStorageReady(true);

    // Шаг 2: В фоне синхронизируем с сервером (не блокируем UI)
    (async () => {
      let serverData = null;
      try {
        // Таймаут 3 секунды для загрузки с сервера
        const loadPromise = loadAllFromCloud();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Server load timeout')), 3000)
        );
        serverData = await Promise.race([loadPromise, timeoutPromise]);
      } catch (error) {
        console.warn('Background sync failed, using local data:', error.message || error);
        return; // Используем данные из localStorage
      }
      
      if (cancelled || !serverData) return;

      // Обновляем данные, если с сервера пришли более свежие
      const raw = serverData || {};

      // Обновляем состояние только если данные изменились
      applyData(raw);

      // Сохраняем в localStorage для следующего раза
      for (const key of Object.keys(raw)) {
        if (raw[key] !== undefined && raw[key] !== null) {
          const k = 'finance_' + key;
          localStorage.setItem(k, typeof raw[key] === 'string' ? raw[key] : JSON.stringify(raw[key]));
        }
      }

      // Синхронизируем обратно на сервер (если нужно)
      if (isCloudAvailable()) {
        try {
          const syncPromise = saveAllToCloud(raw);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Sync timeout')), 3000)
          );
          await Promise.race([syncPromise, timeoutPromise]);
        } catch (e) {
          console.warn('Background sync failed (non-critical):', e.message || e);
        }
      }
    })();

    return () => { 
      cancelled = true;
    };
  }, []);

  // Сохранение данных: localStorage + облако (Mini App) для синхронизации между устройствами
  const saveAccounts = (newAccounts) => {
    setAccounts(newAccounts);
    setItem('accounts', newAccounts);
  };

  const saveTransactions = (newTransactions) => {
    setTransactions(newTransactions);
    setItem('transactions', newTransactions);
  };

  const saveCurrencies = (newCurrencies) => {
    setCurrencies(newCurrencies);
    setItem('currencies', newCurrencies);
  };

  const saveExpensePlan = (plan) => {
    setExpensePlan(plan);
    setItem('expense_plan', typeof plan === 'number' ? plan : parseFloat(plan) || 0);
  };

  const saveClosedMonths = (months) => {
    setClosedMonths(months);
    setItem('closed_months', months);
  };

  const saveBalanceChecks = (checks) => {
    setBalanceChecks(checks);
    setItem('balance_checks', checks);
  };

  const saveExpenseCategories = (categories) => {
    setExpenseCategories(categories);
    setItem('expense_categories', categories);
  };

  const saveIncomeCategories = (categories) => {
    setIncomeCategories(categories);
    setItem('income_categories', categories);
  };

  // Проверяем незакрытые месяцы для бейджа
  const unclosedMonthsCount = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    let count = 0;
    
    for (let year = 2020; year <= currentYear; year++) {
      const maxMonth = year === currentYear ? currentMonth - 1 : 11;
      for (let month = 0; month <= maxMonth; month++) {
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
        const hasTransactions = transactions.some(t => {
          const tDate = new Date(t.date);
          return tDate >= monthStart && tDate <= monthEnd;
        });
        const isClosed = closedMonths.some(m => m.year === year && m.month === month);
        
        if (hasTransactions && !isClosed) {
          count++;
        }
      }
    }
    
    return count;
  }, [transactions, closedMonths]);

  // Функция для получения номера недели
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  // Проверка статуса еженедельной проверки балансов для иконки
  const balanceCheckStatus = useMemo(() => {
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const currentYear = now.getFullYear();
    
    // Ищем последнюю проверку для текущей недели
    const lastCheck = balanceChecks
      .filter(check => {
        const checkDate = new Date(check.date);
        const checkWeek = getWeekNumber(checkDate);
        const checkYear = checkDate.getFullYear();
        return checkWeek === currentWeek && checkYear === currentYear;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    
    return lastCheck ? 'checked' : 'unchecked';
  }, [balanceChecks]);

  const tabs = [
    { id: 'dashboard', label: 'Главная', icon: '📊' },
    { id: 'accounts', label: 'Счета', icon: balanceCheckStatus === 'unchecked' ? '🔴' : '💳' },
    { id: 'transactions', label: 'Операции', icon: '💰', badge: transactions.length },
    { id: 'statistics', label: 'Статистика', icon: '📈' },
    { id: 'closure', label: 'Закрытие', icon: '🔒', badge: unclosedMonthsCount },
    { id: 'settings', label: 'Настройки', icon: '⚙️' }
  ];

  if (!storageReady) {
    return (
      <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ color: '#999', fontSize: '16px' }}>Загрузка…</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-content">
        {activeTab === 'dashboard' && (
          <Dashboard 
            accounts={accounts}
            transactions={transactions}
            currencies={currencies}
            expensePlan={expensePlan}
            setExpensePlan={saveExpensePlan}
            setTransactions={saveTransactions}
            setAccounts={saveAccounts}
            closedMonths={closedMonths}
            setClosedMonths={saveClosedMonths}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
          />
        )}
        {activeTab === 'accounts' && (
          <Accounts 
            accounts={accounts}
            setAccounts={saveAccounts}
            currencies={currencies}
            balanceChecks={balanceChecks}
            setBalanceChecks={saveBalanceChecks}
          />
        )}
        {activeTab === 'transactions' && (
          <Transactions 
            transactions={transactions}
            setTransactions={saveTransactions}
            accounts={accounts}
            setAccounts={saveAccounts}
            currencies={currencies}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
          />
        )}
        {activeTab === 'statistics' && (
          <Statistics 
            accounts={accounts}
            transactions={transactions}
            currencies={currencies}
          />
        )}
        {activeTab === 'closure' && (
          <MonthClosure 
            accounts={accounts}
            transactions={transactions}
            currencies={currencies}
            closedMonths={closedMonths}
            setClosedMonths={saveClosedMonths}
            setAccounts={saveAccounts}
          />
        )}
        {activeTab === 'settings' && (
          <Settings 
            currencies={currencies}
            setCurrencies={saveCurrencies}
            expenseCategories={expenseCategories}
            setExpenseCategories={saveExpenseCategories}
            incomeCategories={incomeCategories}
            setIncomeCategories={saveIncomeCategories}
          />
        )}
      </div>
      
      <nav className={`bottom-nav ${hideBottomNav ? 'bottom-nav--hidden' : ''}`}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`nav-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
            {tab.badge && tab.badge > 0 && (
              <span className="nav-badge">{tab.badge}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Кнопка "Добавить данные" над клавиатурой при вводе сумм */}
      {showKeyboardAddButton && (
        <button
          type="button"
          className="keyboard-add-btn"
          onClick={() => {
            activeFormRef.current?.requestSubmit?.();
          }}
        >
          Добавить данные
        </button>
      )}
    </div>
  );
}

export default App;
