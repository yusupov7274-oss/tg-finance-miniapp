import { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
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

  // Загрузка данных из localStorage
  useEffect(() => {
    const savedAccounts = localStorage.getItem('finance_accounts');
    const savedTransactions = localStorage.getItem('finance_transactions');
    const savedCurrencies = localStorage.getItem('finance_currencies');
    const savedExpensePlan = localStorage.getItem('finance_expense_plan');

    if (savedAccounts) {
      setAccounts(JSON.parse(savedAccounts));
    } else {
      // Начальные данные
      const defaultAccounts = [
        { id: 1, name: 'Основной счет', currency: 'RUB', balance: 0, color: '#2481cc' }
      ];
      setAccounts(defaultAccounts);
      localStorage.setItem('finance_accounts', JSON.stringify(defaultAccounts));
    }

    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    } else {
      setTransactions([]);
      localStorage.setItem('finance_transactions', JSON.stringify([]));
    }

    if (savedCurrencies) {
      const currencies = JSON.parse(savedCurrencies);
      // Проверяем, есть ли тенге в сохраненных валютах
      const hasKZT = currencies.some(c => c.code === 'KZT');
      if (!hasKZT) {
        // Добавляем тенге, если его нет (примерный курс, можно обновить через API)
        currencies.push({ code: 'KZT', name: 'Казахстанский тенге', rate: 0.15, source: 'manual' });
        localStorage.setItem('finance_currencies', JSON.stringify(currencies));
      }
      setCurrencies(currencies);
    } else {
      // Начальные валюты с курсами
      // Примечание: курсы примерные, можно обновить через API кнопкой "🔄 Обновить все"
      const defaultCurrencies = [
        { code: 'RUB', name: 'Российский рубль', rate: 1, source: 'manual' },
        { code: 'USD', name: 'Доллар США', rate: 100, source: 'manual' },
        { code: 'EUR', name: 'Евро', rate: 110, source: 'manual' },
        { code: 'KZT', name: 'Казахстанский тенге', rate: 0.15, source: 'manual' }
      ];
      setCurrencies(defaultCurrencies);
      localStorage.setItem('finance_currencies', JSON.stringify(defaultCurrencies));
    }

    if (savedExpensePlan) {
      setExpensePlan(parseFloat(savedExpensePlan));
    } else {
      setExpensePlan(0);
      localStorage.setItem('finance_expense_plan', '0');
    }

    const savedClosedMonths = localStorage.getItem('finance_closed_months');
    if (savedClosedMonths) {
      setClosedMonths(JSON.parse(savedClosedMonths));
    } else {
      setClosedMonths([]);
      localStorage.setItem('finance_closed_months', JSON.stringify([]));
    }

    const savedBalanceChecks = localStorage.getItem('finance_balance_checks');
    if (savedBalanceChecks) {
      setBalanceChecks(JSON.parse(savedBalanceChecks));
    } else {
      setBalanceChecks([]);
      localStorage.setItem('finance_balance_checks', JSON.stringify([]));
    }

    const savedExpenseCategories = localStorage.getItem('finance_expense_categories');
    if (savedExpenseCategories) {
      setExpenseCategories(JSON.parse(savedExpenseCategories));
    } else {
      const defaultExpenseCategories = [
        'Продукты', 'Транспорт', 'Жилье', 'Развлечения',
        'Здоровье', 'Образование', 'Одежда', 'Подарки', 'Другое'
      ];
      setExpenseCategories(defaultExpenseCategories);
      localStorage.setItem('finance_expense_categories', JSON.stringify(defaultExpenseCategories));
    }

    const savedIncomeCategories = localStorage.getItem('finance_income_categories');
    if (savedIncomeCategories) {
      setIncomeCategories(JSON.parse(savedIncomeCategories));
    } else {
      const defaultIncomeCategories = [
        'Зарплата', 'Подарки', 'Инвестиции', 'Другое'
      ];
      setIncomeCategories(defaultIncomeCategories);
      localStorage.setItem('finance_income_categories', JSON.stringify(defaultIncomeCategories));
    }
  }, []);

  // Сохранение данных в localStorage
  const saveAccounts = (newAccounts) => {
    setAccounts(newAccounts);
    localStorage.setItem('finance_accounts', JSON.stringify(newAccounts));
  };

  const saveTransactions = (newTransactions) => {
    setTransactions(newTransactions);
    localStorage.setItem('finance_transactions', JSON.stringify(newTransactions));
  };

  const saveCurrencies = (newCurrencies) => {
    setCurrencies(newCurrencies);
    localStorage.setItem('finance_currencies', JSON.stringify(newCurrencies));
  };

  const saveExpensePlan = (plan) => {
    setExpensePlan(plan);
    localStorage.setItem('finance_expense_plan', plan.toString());
  };

  const saveClosedMonths = (months) => {
    setClosedMonths(months);
    localStorage.setItem('finance_closed_months', JSON.stringify(months));
  };

  const saveBalanceChecks = (checks) => {
    setBalanceChecks(checks);
    localStorage.setItem('finance_balance_checks', JSON.stringify(checks));
  };

  const saveExpenseCategories = (categories) => {
    setExpenseCategories(categories);
    localStorage.setItem('finance_expense_categories', JSON.stringify(categories));
  };

  const saveIncomeCategories = (categories) => {
    setIncomeCategories(categories);
    localStorage.setItem('finance_income_categories', JSON.stringify(categories));
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
