import { useMemo, useState } from 'react';

export default function Statistics({ accounts, transactions, currencies }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('month'); // 'day', 'period'

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

  // Статистика за год
  const yearStats = useMemo(() => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    
    const yearTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= yearStart && tDate <= now;
    });

    const income = yearTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => {
        const account = accounts.find(a => a.id === t.accountId);
        const currency = currencies.find(c => c.code === account?.currency);
        const rate = currency ? currency.rate : 1;
        return sum + (t.amount * rate);
      }, 0);

    const expenses = yearTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => {
        const account = accounts.find(a => a.id === t.accountId);
        const currency = currencies.find(c => c.code === account?.currency);
        const rate = currency ? currency.rate : 1;
        return sum + (t.amount * rate);
      }, 0);

    return { income, expenses, count: yearTransactions.length };
  }, [transactions, accounts, currencies]);

  // Статистика за конкретный день
  const dayStats = useMemo(() => {
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    const nextDay = new Date(selected);
    nextDay.setDate(nextDay.getDate() + 1);

    const dayTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= selected && tDate < nextDay;
    });

    const income = dayTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => {
        const account = accounts.find(a => a.id === t.accountId);
        const currency = currencies.find(c => c.code === account?.currency);
        const rate = currency ? currency.rate : 1;
        return sum + (t.amount * rate);
      }, 0);

    const expenses = dayTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => {
        const account = accounts.find(a => a.id === t.accountId);
        const currency = currencies.find(c => c.code === account?.currency);
        const rate = currency ? currency.rate : 1;
        return sum + (t.amount * rate);
      }, 0);

    return { 
      income, 
      expenses, 
      transactions: dayTransactions,
      count: dayTransactions.length 
    };
  }, [selectedDate, transactions, accounts, currencies]);

  // Статистика за период
  const periodStats = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const periodTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= start && tDate <= end;
    });

    const income = periodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => {
        const account = accounts.find(a => a.id === t.accountId);
        const currency = currencies.find(c => c.code === account?.currency);
        const rate = currency ? currency.rate : 1;
        return sum + (t.amount * rate);
      }, 0);

    const expenses = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => {
        const account = accounts.find(a => a.id === t.accountId);
        const currency = currencies.find(c => c.code === account?.currency);
        const rate = currency ? currency.rate : 1;
        return sum + (t.amount * rate);
      }, 0);

    return { 
      income, 
      expenses, 
      transactions: periodTransactions,
      count: periodTransactions.length 
    };
  }, [startDate, endDate, transactions, accounts, currencies]);

  // Прогноз на месяц (на основе средних расходов)
  const monthForecast = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    
    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= monthStart && tDate <= now && t.type === 'expense';
    });

    const monthExpenses = monthTransactions.reduce((sum, t) => {
      const account = accounts.find(a => a.id === t.accountId);
      const currency = currencies.find(c => c.code === account?.currency);
      const rate = currency ? currency.rate : 1;
      return sum + (t.amount * rate);
    }, 0);

    const avgDailyExpense = daysPassed > 0 ? monthExpenses / daysPassed : 0;
    const forecast = avgDailyExpense * daysInMonth;

    return {
      current: monthExpenses,
      forecast,
      avgDaily: avgDailyExpense,
      daysPassed,
      daysInMonth
    };
  }, [transactions, accounts, currencies]);

  // Прогноз на год (на основе средних расходов)
  const yearForecast = useMemo(() => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const daysInYear = 365;
    const daysPassed = Math.floor((now - yearStart) / (1000 * 60 * 60 * 24)) + 1;
    
    const yearTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= yearStart && tDate <= now && t.type === 'expense';
    });

    const yearExpenses = yearTransactions.reduce((sum, t) => {
      const account = accounts.find(a => a.id === t.accountId);
      const currency = currencies.find(c => c.code === account?.currency);
      const rate = currency ? currency.rate : 1;
      return sum + (t.amount * rate);
    }, 0);

    const avgDailyExpense = daysPassed > 0 ? yearExpenses / daysPassed : 0;
    const forecast = avgDailyExpense * daysInYear;

    return {
      current: yearExpenses,
      forecast,
      avgDaily: avgDailyExpense,
      daysPassed,
      daysInYear
    };
  }, [transactions, accounts, currencies]);

  // Статистика по категориям за месяц
  const categoryStats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= monthStart && tDate <= now && t.type === 'expense';
    });

    const categories = {};
    monthTransactions.forEach(t => {
      const category = t.category || 'Без категории';
      const account = accounts.find(a => a.id === t.accountId);
      const currency = currencies.find(c => c.code === account?.currency);
      const rate = currency ? currency.rate : 1;
      const amount = t.amount * rate;
      
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category] += amount;
    });

    return Object.entries(categories)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions, accounts, currencies]);

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true,
    }).format(amount);
  };

  const getAccountName = (accountId) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : 'Неизвестный счет';
  };

  const getAccountCurrency = (accountId) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.currency : 'RUB';
  };

  const getMonthName = () => {
    const months = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return months[new Date().getMonth()];
  };

  return (
    <div>
      {/* Переключение режимов просмотра */}
      <div className="card">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            className={`btn ${viewMode === 'day' ? 'btn-primary' : 'btn-secondary'} btn-small`}
            onClick={() => setViewMode('day')}
            style={{ flex: 1 }}
          >
            📅 За день
          </button>
          <button
            className={`btn ${viewMode === 'period' ? 'btn-primary' : 'btn-secondary'} btn-small`}
            onClick={() => setViewMode('period')}
            style={{ flex: 1 }}
          >
            📆 За период
          </button>
          <button
            className={`btn ${viewMode === 'month' ? 'btn-primary' : 'btn-secondary'} btn-small`}
            onClick={() => setViewMode('month')}
            style={{ flex: 1 }}
          >
            📊 Общая статистика
          </button>
        </div>
      </div>

      {/* Статистика за день */}
      {viewMode === 'day' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Статистика за день</h2>
          </div>
          
          <div className="form-group">
            <label className="form-label">Выберите дату</label>
            <input
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="stats-grid" style={{ marginTop: '16px' }}>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#4ade80' }}>
                {formatAmount(dayStats.income)}
              </div>
              <div className="stat-label">Доходы</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#ff6b6b' }}>
                {formatAmount(dayStats.expenses)}
              </div>
              <div className="stat-label">Расходы</div>
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '12px', background: '#2d2d2d', borderRadius: '8px', border: '1px solid #333' }}>
            <div style={{ fontSize: '14px', color: '#999', marginBottom: '4px' }}>Баланс за день</div>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: 600,
              color: dayStats.income - dayStats.expenses >= 0 ? '#4ade80' : '#ff6b6b'
            }}>
              {formatAmount(dayStats.income - dayStats.expenses)}
            </div>
          </div>

          {dayStats.transactions.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#ffffff' }}>
                Операции ({dayStats.count})
              </div>
              <ul className="list">
                {dayStats.transactions
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map(transaction => {
                    const currency = getAccountCurrency(transaction.accountId);
                    const account = accounts.find(a => a.id === transaction.accountId);
                    const currencyObj = currencies.find(c => c.code === account?.currency);
                    const rate = currencyObj ? currencyObj.rate : 1;
                    const amountInBase = transaction.amount * rate;
                    
                    return (
                      <li key={transaction.id} className="list-item">
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span>{transaction.type === 'income' ? '📈' : '📉'}</span>
                            <div style={{ fontWeight: 500 }}>
                              {transaction.category || 'Без категории'}
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            {getAccountName(transaction.accountId)} • {new Date(transaction.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {transaction.description && (
                            <div style={{ fontSize: '12px', color: '#777', marginTop: '4px' }}>
                              {transaction.description}
                            </div>
                          )}
                        </div>
                        <div style={{ 
                          fontWeight: 600,
                          color: transaction.type === 'income' ? '#4ade80' : '#ff6b6b'
                        }}>
                          {transaction.type === 'income' ? '+' : '-'}{formatAmount(amountInBase)}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}

          {dayStats.transactions.length === 0 && (
            <div className="empty-state" style={{ padding: '24px' }}>
              <div className="empty-state-text">Нет операций за этот день</div>
            </div>
          )}
        </div>
      )}

      {/* Статистика за период */}
      {viewMode === 'period' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Статистика за период</h2>
          </div>
          
          <div className="form-group">
            <label className="form-label">Начало периода</label>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Конец периода</label>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="stats-grid" style={{ marginTop: '16px' }}>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#4ade80' }}>
                {formatAmount(periodStats.income)}
              </div>
              <div className="stat-label">Доходы</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#ff6b6b' }}>
                {formatAmount(periodStats.expenses)}
              </div>
              <div className="stat-label">Расходы</div>
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '12px', background: '#2d2d2d', borderRadius: '8px', border: '1px solid #333' }}>
            <div style={{ fontSize: '14px', color: '#999', marginBottom: '4px' }}>Баланс за период</div>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: 600,
              color: periodStats.income - periodStats.expenses >= 0 ? '#4ade80' : '#ff6b6b'
            }}>
              {formatAmount(periodStats.income - periodStats.expenses)}
            </div>
            <div style={{ fontSize: '12px', color: '#777', marginTop: '4px' }}>
              Операций: {periodStats.count}
            </div>
          </div>

          {periodStats.transactions.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#ffffff' }}>
                Операции ({periodStats.count})
              </div>
              <ul className="list">
                {periodStats.transactions
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map(transaction => {
                    const currency = getAccountCurrency(transaction.accountId);
                    const account = accounts.find(a => a.id === transaction.accountId);
                    const currencyObj = currencies.find(c => c.code === account?.currency);
                    const rate = currencyObj ? currencyObj.rate : 1;
                    const amountInBase = transaction.amount * rate;
                    
                    return (
                      <li key={transaction.id} className="list-item">
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span>{transaction.type === 'income' ? '📈' : '📉'}</span>
                            <div style={{ fontWeight: 500 }}>
                              {transaction.category || 'Без категории'}
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            {getAccountName(transaction.accountId)} • {new Date(transaction.date).toLocaleDateString('ru-RU')}
                          </div>
                          {transaction.description && (
                            <div style={{ fontSize: '12px', color: '#777', marginTop: '4px' }}>
                              {transaction.description}
                            </div>
                          )}
                        </div>
                        <div style={{ 
                          fontWeight: 600,
                          color: transaction.type === 'income' ? '#4ade80' : '#ff6b6b'
                        }}>
                          {transaction.type === 'income' ? '+' : '-'}{formatAmount(amountInBase)}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}

          {periodStats.transactions.length === 0 && (
            <div className="empty-state" style={{ padding: '24px' }}>
              <div className="empty-state-text">Нет операций за этот период</div>
            </div>
          )}
        </div>
      )}

      {/* Общая статистика (существующий контент) */}
      {viewMode === 'month' && (
        <>
          {/* Статистика за месяц */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Статистика за {getMonthName()}</h2>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#4ade80' }}>
                  {formatAmount(monthStats.income)}
                </div>
                <div className="stat-label">Доходы</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#ff6b6b' }}>
                  {formatAmount(monthStats.expenses)}
                </div>
                <div className="stat-label">Расходы</div>
              </div>
            </div>
            <div style={{ marginTop: '16px', padding: '12px', background: '#2d2d2d', borderRadius: '8px', border: '1px solid #333' }}>
              <div style={{ fontSize: '14px', color: '#999', marginBottom: '4px' }}>Баланс</div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 600,
                color: monthStats.income - monthStats.expenses >= 0 ? '#4ade80' : '#ff6b6b'
              }}>
                {formatAmount(monthStats.income - monthStats.expenses)}
              </div>
            </div>
          </div>

          {/* Прогноз на месяц */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Прогноз на {getMonthName()}</h2>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', color: '#999', marginBottom: '4px' }}>
                Текущие расходы ({monthForecast.daysPassed} из {monthForecast.daysInMonth} дней)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#ff6b6b' }}>
                {formatAmount(monthForecast.current)}
              </div>
            </div>
            <div style={{ padding: '12px', background: '#3d2d1a', borderRadius: '8px', border: '1px solid #ffa500' }}>
              <div style={{ fontSize: '12px', color: '#ffa500', marginBottom: '4px' }}>Прогноз на конец месяца</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#ffa500' }}>
                {formatAmount(monthForecast.forecast)}
              </div>
              <div style={{ fontSize: '12px', color: '#ffa500', marginTop: '4px' }}>
                Средний расход в день: {formatAmount(monthForecast.avgDaily)}
              </div>
            </div>
          </div>

          {/* Статистика за год */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Статистика за {new Date().getFullYear()} год</h2>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#4ade80' }}>
                  {formatAmount(yearStats.income)}
                </div>
                <div className="stat-label">Доходы</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#ff6b6b' }}>
                  {formatAmount(yearStats.expenses)}
                </div>
                <div className="stat-label">Расходы</div>
              </div>
            </div>
          </div>

          {/* Прогноз на год */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Прогноз на {new Date().getFullYear()} год</h2>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', color: '#999', marginBottom: '4px' }}>
                Текущие расходы ({yearForecast.daysPassed} из {yearForecast.daysInYear} дней)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#ff6b6b' }}>
                {formatAmount(yearForecast.current)}
              </div>
            </div>
            <div style={{ padding: '12px', background: '#3d2d1a', borderRadius: '8px', border: '1px solid #ffa500' }}>
              <div style={{ fontSize: '12px', color: '#ffa500', marginBottom: '4px' }}>Прогноз на конец года</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#ffa500' }}>
                {formatAmount(yearForecast.forecast)}
              </div>
              <div style={{ fontSize: '12px', color: '#ffa500', marginTop: '4px' }}>
                Средний расход в день: {formatAmount(yearForecast.avgDaily)}
              </div>
            </div>
          </div>

          {/* Топ категорий */}
          {categoryStats.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Топ категорий ({getMonthName()})</h2>
              </div>
              <ul className="list">
                {categoryStats.map((stat, index) => (
                  <li key={stat.category} className="list-item">
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        #{index + 1} {stat.category}
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, color: '#ff6b6b' }}>
                      {formatAmount(stat.amount)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
