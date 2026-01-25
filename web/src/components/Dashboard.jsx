import { useMemo, useState } from 'react';

export default function Dashboard({ accounts, transactions, currencies, expensePlan, setExpensePlan, setTransactions, setAccounts, closedMonths, setClosedMonths, expenseCategories, incomeCategories }) {
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planInput, setPlanInput] = useState('');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({
    type: 'expense',
    accountId: accounts[0]?.id || '',
    amount: 0,
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [amountDisplay, setAmountDisplay] = useState('');

  // Форматирование числа с разделителями тысяч для отображения в input
  const formatNumberInput = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/\s/g, '')) : value;
    if (isNaN(numValue)) return '';
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      useGrouping: true
    }).format(numValue);
  };

  // Парсинг отформатированного числа обратно в число
  const parseFormattedNumber = (value) => {
    if (!value || value === '') return 0;
    const cleaned = value.toString().replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  // Используем категории из настроек, если они есть, иначе дефолтные
  const categories = expenseCategories.length > 0 ? expenseCategories : [
    'Продукты', 'Транспорт', 'Жилье', 'Развлечения',
    'Здоровье', 'Образование', 'Одежда', 'Подарки',
    'Другое'
  ];
  
  const incomeCats = incomeCategories.length > 0 ? incomeCategories : [
    'Зарплата', 'Подарки', 'Инвестиции', 'Другое'
  ];

  const handleOpenExpenseModal = () => {
    setExpenseFormData({
      type: 'expense',
      accountId: accounts[0]?.id || '',
      amount: 0,
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    setAmountDisplay('');
    setShowExpenseModal(true);
  };

  const handleCloseExpenseModal = () => {
    setShowExpenseModal(false);
    setAmountDisplay('');
  };

  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    
    const newAmount = parseFormattedNumber(amountDisplay);
    if (newAmount <= 0) {
      alert('Введите сумму больше нуля');
      return;
    }

    const newTransaction = {
      id: Date.now(),
      ...expenseFormData,
      amount: newAmount,
      date: new Date(expenseFormData.date).toISOString()
    };
    setTransactions([...transactions, newTransaction]);
    
    // Обновление баланса счета
    const account = accounts.find(a => a.id === expenseFormData.accountId);
    if (account) {
      const updatedAccounts = accounts.map(acc =>
        acc.id === account.id
          ? {
              ...acc,
              balance: expenseFormData.type === 'income' 
                ? acc.balance + newAmount 
                : acc.balance - newAmount
            }
          : acc
      );
      setAccounts(updatedAccounts);
    }
    
    handleCloseExpenseModal();
  };

  const getAccountCurrency = (accountId) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.currency : 'RUB';
  };


  // Вычисление общего баланса (капитал) с учетом закрытых месяцев
  const totalBalance = useMemo(() => {
    // Баланс из закрытых месяцев (базовый баланс на начало текущего месяца)
    const baseBalance = closedMonths.length > 0 
      ? closedMonths[closedMonths.length - 1].endingBalance 
      : 0;
    
    // Текущие балансы счетов
    const currentBalance = accounts.reduce((sum, account) => {
      const currency = currencies.find(c => c.code === account.currency);
      const rate = currency ? currency.rate : 1;
      return sum + (account.balance * rate);
    }, 0);
    
    return baseBalance + currentBalance;
  }, [accounts, currencies, closedMonths]);

  // Статистика за текущий месяц
  const monthStats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= monthStart && tDate <= now;
    });

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => {
        const account = accounts.find(a => a.id === t.accountId);
        const currency = currencies.find(c => c.code === account?.currency);
        const rate = currency ? currency.rate : 1;
        return sum + (t.amount * rate);
      }, 0);

    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => {
        const account = accounts.find(a => a.id === t.accountId);
        const currency = currencies.find(c => c.code === account?.currency);
        const rate = currency ? currency.rate : 1;
        return sum + (t.amount * rate);
      }, 0);

    return { income, expenses, count: monthTransactions.length };
  }, [transactions, accounts, currencies]);

  // Остаток баланса: сумма всех денег на всех счетах
  const remainingBalance = useMemo(() => {
    return accounts.reduce((sum, account) => {
      const currency = currencies.find(c => c.code === account.currency);
      const rate = currency ? currency.rate : 1;
      return sum + (account.balance * rate);
    }, 0);
  }, [accounts, currencies]);

  // Расчет всех доходов и расходов за все время
  const allTimeStats = useMemo(() => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => {
        const account = accounts.find(a => a.id === t.accountId);
        const currency = currencies.find(c => c.code === account?.currency);
        const rate = currency ? currency.rate : 1;
        return sum + (t.amount * rate);
      }, 0);

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => {
        const account = accounts.find(a => a.id === t.accountId);
        const currency = currencies.find(c => c.code === account?.currency);
        const rate = currency ? currency.rate : 1;
        return sum + (t.amount * rate);
      }, 0);

    return { income, expenses };
  }, [transactions, accounts, currencies]);

  // Расчет расхождения: (Доходы - Расходы) - (Сумма денег на всех счетах)
  const discrepancy = useMemo(() => {
    const incomeMinusExpenses = allTimeStats.income - allTimeStats.expenses;
    return incomeMinusExpenses - remainingBalance;
  }, [allTimeStats, remainingBalance]);


  // Расчет прогресса по плану расходов
  const planProgress = useMemo(() => {
    if (!expensePlan || expensePlan <= 0) return null;

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysPassed = now.getDate();
      const daysRemaining = daysInMonth - daysPassed;

      const expenses = monthStats?.expenses || 0;
      const progress = expensePlan > 0 ? (expenses / expensePlan) * 100 : 0;
      const remaining = expensePlan - expenses;
      const dailyNorm = remaining > 0 && daysRemaining > 0 ? remaining / daysRemaining : 0;

      return {
        progress: Math.min(progress, 100),
        remaining,
        dailyNorm,
        daysRemaining,
        daysInMonth,
        daysPassed
      };
    } catch (error) {
      console.error('Error calculating plan progress:', error);
      return null;
    }
  }, [expensePlan, monthStats]);

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true, // Включаем разделители тысяч
    }).format(amount);
  };


  const handleSavePlan = () => {
    const plan = parseFormattedNumber(planInput);
    setExpensePlan(plan);
    setShowPlanModal(false);
    setPlanInput('');
  };


  return (
    <div>
      {/* Основные показатели */}
      <div className="card" style={{ animation: 'fadeIn 0.5s ease', padding: '12px', marginBottom: '12px' }}>
        <div className="card-header" style={{ marginBottom: '8px', paddingBottom: '8px' }}>
          <h2 className="card-title" style={{ fontSize: '18px' }}>Финансовый обзор</h2>
        </div>
        
        {/* Остаток баланса */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
            Остаток баланса
          </div>
        <div 
          className={`balance ${remainingBalance >= 0 ? 'balance-positive' : 'balance-negative'}`} 
          style={{ 
            fontSize: '32px', 
            margin: '0',
            animation: 'numberChange 0.5s ease'
          }}
          key={remainingBalance}
        >
          {formatAmount(remainingBalance)}
        </div>
        </div>

        {/* Расходы за месяц */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
            Расходы за месяц
          </div>
          <div 
            style={{ 
              fontSize: '32px', 
              fontWeight: 700, 
              color: '#ff6b6b', 
              margin: '0',
              animation: 'numberChange 0.5s ease'
            }}
            key={monthStats.expenses}
          >
            {formatAmount(monthStats.expenses)}
          </div>
        </div>

        {/* Расхождение */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
            Расхождение
          </div>
          <div 
            style={{ 
              fontSize: '24px', 
              fontWeight: 700, 
              color: discrepancy < 0 ? '#4ade80' : discrepancy > 0 ? '#ff6b6b' : '#999', 
              margin: '0',
              animation: 'numberChange 0.5s ease'
            }}
            key={discrepancy}
          >
            {discrepancy < 0 ? 'Неучтенный доход: ' : discrepancy > 0 ? 'Неучтенный расход: ' : 'Нет расхождений'}
            {discrepancy !== 0 && formatAmount(Math.abs(discrepancy))}
          </div>
          <div style={{ fontSize: '10px', color: '#777', marginTop: '2px' }}>
            (Доходы - Расходы) - Сумма на счетах
          </div>
        </div>


        {/* Информация о плане расходов */}
        {expensePlan > 0 && (
          <div style={{ 
            padding: '16px',
            background: '#2d2d2d',
            borderRadius: '12px',
            marginBottom: '12px',
            border: '1px solid #333',
            animation: 'fadeIn 0.5s ease'
          }}>
            <div style={{ textAlign: 'center', width: '100%' }}>
              {/* План */}
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                План
              </div>
              <div 
                style={{ 
                  fontSize: '32px', 
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: '0 0 12px 0',
                  animation: 'numberChange 0.5s ease'
                }}
                key={expensePlan}
              >
                {formatAmount(expensePlan)}
              </div>
              
              {/* Норма в день */}
              {planProgress && planProgress.daysRemaining > 0 && (
                <>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                    Норма в день
                  </div>
                  <div 
                    style={{ 
                      fontSize: '32px', 
                      fontWeight: 700,
                      color: planProgress.dailyNorm > 0 ? '#4ade80' : '#ff6b6b',
                      margin: '0 0 12px 0',
                      animation: 'numberChange 0.5s ease'
                    }}
                    key={planProgress.dailyNorm}
                  >
                    {formatAmount(planProgress.dailyNorm)}
                  </div>
                </>
              )}
              
              {/* Осталось */}
              {planProgress && (
                <>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 600,
                    color: planProgress.remaining >= 0 ? '#4ade80' : '#ff6b6b',
                    marginBottom: '4px'
                  }}>
                    Осталось: {formatAmount(planProgress.remaining)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#777', marginTop: '2px' }}>
                    {planProgress.daysPassed} из {planProgress.daysInMonth} дней
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Кнопка установки плана */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          {expensePlan <= 0 ? (
            <button 
              className="btn btn-primary"
              onClick={() => {
                setPlanInput('');
                setShowPlanModal(true);
              }}
              style={{ padding: '10px 16px', fontSize: '14px' }}
            >
              📋 Установить план расходов
            </button>
          ) : (
            <button 
              className="btn btn-secondary btn-small"
              onClick={() => {
                setPlanInput(formatNumberInput(expensePlan));
                setShowPlanModal(true);
              }}
              style={{ padding: '8px 12px', fontSize: '12px' }}
            >
              ✏️ Изменить план
            </button>
          )}
        </div>

      </div>

      {/* Кнопка внести расход */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '12px' }}>
        <button
          onClick={handleOpenExpenseModal}
          className="expense-button-main"
          style={{
            width: '100%',
            padding: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4), 0 8px 30px rgba(118, 75, 162, 0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontSize: '20px',
            fontWeight: 600,
            color: 'white',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 25px rgba(102, 126, 234, 0.5), 0 10px 40px rgba(118, 75, 162, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.4), 0 8px 30px rgba(118, 75, 162, 0.3)';
          }}
        >
          {/* Анимация падающих денег */}
          <div className="money-falling" style={{
            position: 'absolute',
            top: '-50px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            overflow: 'hidden'
          }}>
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  fontSize: '24px',
                  left: `${20 + i * 15}%`,
                  animation: `moneyFall ${2 + i * 0.3}s infinite`,
                  animationDelay: `${i * 0.2}s`,
                  opacity: 0
                }}
              >
                💰
              </span>
            ))}
          </div>
          <span style={{ 
            fontSize: '24px',
            display: 'block',
            transition: 'transform 0.3s ease',
            position: 'relative',
            zIndex: 1
          }}>
            💰
          </span>
          <span style={{ position: 'relative', zIndex: 1, fontSize: '20px' }}>Внести расход/доход</span>
        </button>
      </div>

      {/* Модальное окно для плана */}
      {showPlanModal && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">План расходов на месяц</h3>
              <button type="button" className="modal-close" onClick={() => setShowPlanModal(false)}>×</button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSavePlan(); }}>
              <div className="form-group">
                <label className="form-label">Сумма плана (RUB)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="form-input"
                  value={planInput || formatNumberInput(expensePlan)}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    // Разрешаем ввод только цифр, точки, запятой и пробелов
                    if (/^[\d\s.,]*$/.test(inputValue) || inputValue === '') {
                      // Убираем пробелы для парсинга, затем форматируем обратно
                      const cleaned = inputValue.replace(/\s/g, '');
                      if (cleaned === '' || cleaned === '.') {
                        setPlanInput(cleaned);
                      } else {
                        const parsed = parseFloat(cleaned.replace(',', '.')) || 0;
                        // Форматируем только если введено достаточно цифр или при завершении ввода
                        if (cleaned.length > 3 || cleaned.includes('.') || cleaned.includes(',')) {
                          setPlanInput(formatNumberInput(parsed));
                        } else {
                          setPlanInput(cleaned);
                        }
                      }
                    }
                  }}
                  onFocus={(e) => {
                    if (expensePlan > 0) {
                      setPlanInput(formatNumberInput(expensePlan));
                      e.target.select();
                    } else {
                      setPlanInput('');
                    }
                  }}
                  onBlur={(e) => {
                    const parsed = parseFormattedNumber(planInput || expensePlan);
                    if (parsed === 0) {
                      setPlanInput('');
                    } else {
                      setPlanInput(formatNumberInput(parsed));
                    }
                  }}
                  placeholder="0"
                  autoFocus
                />
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  Укажите максимальную сумму расходов на текущий месяц
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowPlanModal(false)}
                >
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно для быстрого добавления расхода */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={handleCloseExpenseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Внести расход/доход</h3>
              <button className="modal-close" onClick={handleCloseExpenseModal}>×</button>
            </div>
            
            <form onSubmit={handleExpenseSubmit}>
              <div className="form-group">
                <label className="form-label">Тип операции</label>
                <select
                  className="form-select"
                  value={expenseFormData.type}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, type: e.target.value })}
                  required
                >
                  <option value="expense">Расход</option>
                  <option value="income">Доход</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Счет</label>
                <select
                  className="form-select"
                  value={expenseFormData.accountId}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, accountId: parseInt(e.target.value) })}
                  required
                >
                  <option value="">Выберите счет</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Сумма</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="form-input"
                  value={amountDisplay}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    if (/^[\d\s.,]*$/.test(inputValue) || inputValue === '') {
                      // Убираем пробелы для парсинга, затем форматируем обратно
                      const cleaned = inputValue.replace(/\s/g, '');
                      if (cleaned === '' || cleaned === '.') {
                        setAmountDisplay(cleaned);
                        setExpenseFormData({ ...expenseFormData, amount: 0 });
                      } else {
                        const parsed = parseFloat(cleaned.replace(',', '.')) || 0;
                        setExpenseFormData({ ...expenseFormData, amount: parsed });
                        // Форматируем только если введено достаточно цифр или при завершении ввода
                        if (cleaned.length > 3 || cleaned.includes('.') || cleaned.includes(',')) {
                          setAmountDisplay(formatNumberInput(parsed));
                        } else {
                          setAmountDisplay(cleaned);
                        }
                      }
                    }
                  }}
                  onFocus={(e) => {
                    if (amountDisplay === '' || parseFormattedNumber(amountDisplay) === 0) {
                      setAmountDisplay('');
                    } else {
                      e.target.select();
                    }
                  }}
                  onBlur={(e) => {
                    const parsed = parseFormattedNumber(amountDisplay);
                    if (parsed === 0) {
                      setAmountDisplay('');
                    } else {
                      setAmountDisplay(formatNumberInput(parsed));
                    }
                  }}
                  placeholder="0"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Категория</label>
                <select
                  className="form-select"
                  value={expenseFormData.category}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
                >
                  <option value="">Выберите категорию</option>
                  {(expenseFormData.type === 'income' ? incomeCats : categories).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Описание</label>
                <input
                  type="text"
                  className="form-input"
                  value={expenseFormData.description}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                  placeholder="Необязательно"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Дата</label>
                <input
                  type="date"
                  className="form-input"
                  value={expenseFormData.date}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, date: e.target.value })}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseExpenseModal}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  {expenseFormData.type === 'income' ? 'Добавить доход' : 'Добавить расход'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
