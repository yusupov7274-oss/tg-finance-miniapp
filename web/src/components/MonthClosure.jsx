import { useState, useMemo } from 'react';

export default function MonthClosure({ accounts, transactions, currencies, closedMonths, setClosedMonths, setAccounts }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [monthToClose, setMonthToClose] = useState(null);

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true,
    }).format(amount);
  };

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  // Получаем список лет с транзакциями + текущий год и предыдущий
  const yearsWithTransactions = useMemo(() => {
    const years = new Set();
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Добавляем текущий год и предыдущий
    years.add(currentYear);
    years.add(currentYear - 1);
    
    // Добавляем годы из транзакций
    transactions.forEach(t => {
      const date = new Date(t.date);
      years.add(date.getFullYear());
    });
    
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Проверяем, есть ли транзакции в месяце
  const hasTransactionsInMonth = (year, month) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
    
    return transactions.some(t => {
      const tDate = new Date(t.date);
      return tDate >= monthStart && tDate <= monthEnd;
    });
  };

  // Проверяем, закрыт ли месяц
  const isMonthClosed = (year, month) => {
    return closedMonths.some(m => m.year === year && m.month === month);
  };

  // Получаем данные месяца для закрытия
  const getMonthData = (year, month) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
    
    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= monthStart && tDate <= monthEnd;
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
    
    return { income, expenses, transactions: monthTransactions, count: monthTransactions.length };
  };

  // Получаем незакрытые месяцы с транзакциями
  const getUnclosedMonths = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const unclosed = [];
    
    // Проверяем все месяцы до текущего
    for (let year = Math.min(...yearsWithTransactions, currentYear); year <= currentYear; year++) {
      const maxMonth = year === currentYear ? currentMonth - 1 : 11; // До прошлого месяца текущего года
      
      for (let month = 0; month <= maxMonth; month++) {
        if (hasTransactionsInMonth(year, month) && !isMonthClosed(year, month)) {
          unclosed.push({ year, month });
        }
      }
    }
    
    return unclosed;
  }, [transactions, closedMonths, yearsWithTransactions]);

  // Проверяем, нужно ли напоминание (с 1 числа)
  const shouldShowReminder = useMemo(() => {
    const now = new Date();
    return now.getDate() >= 1 && getUnclosedMonths.length > 0;
  }, [getUnclosedMonths]);

  // Функция закрытия месяца
  const handleCloseMonth = (year, month) => {
    const monthData = getMonthData(year, month);
    
    if (monthData.count === 0) {
      alert('В этом месяце нет транзакций');
      return;
    }
    
    // Баланс на начало месяца
    const lastClosedMonth = closedMonths
      .filter(m => m.year < year || (m.year === year && m.month < month))
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      })[0];
    
    // Восстанавливаем баланс на начало месяца
    let startingBalance = 0;
    if (lastClosedMonth) {
      startingBalance = lastClosedMonth.endingBalance;
    } else {
      // Если нет закрытых месяцев до этого, считаем от текущих балансов
      startingBalance = accounts.reduce((sum, account) => {
        const currency = currencies.find(c => c.code === account.currency);
        const rate = currency ? currency.rate : 1;
        return sum + (account.balance * rate);
      }, 0) - monthData.income + monthData.expenses;
    }
    
    // Баланс на конец месяца
    const endingBalance = startingBalance + monthData.income - monthData.expenses;
    
    // Снимок балансов счетов на конец месяца (восстанавливаем из транзакций)
    const accountsSnapshot = accounts.map(account => {
      // Восстанавливаем баланс счета на конец месяца
      let accountBalance = account.balance;
      
      // Откатываем все транзакции после этого месяца
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
      transactions.forEach(t => {
        const tDate = new Date(t.date);
        if (tDate > monthEnd && t.accountId === account.id) {
          if (t.type === 'income') {
            accountBalance -= t.amount;
          } else {
            accountBalance += t.amount;
          }
        }
      });
      
      return {
        id: account.id,
        name: account.name,
        currency: account.currency,
        balance: accountBalance,
        color: account.color
      };
    });
    
    const closedMonthData = {
      year,
      month,
      monthName: new Date(year, month).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
      startingBalance,
      endingBalance,
      income: monthData.income,
      expenses: monthData.expenses,
      transactionsCount: monthData.count,
      accountsSnapshot,
      closedAt: new Date().toISOString()
    };
    
    setMonthToClose(closedMonthData);
    setShowCloseModal(true);
  };

  const confirmCloseMonth = () => {
    if (!monthToClose) return;
    
    setClosedMonths([...closedMonths, monthToClose].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    }));
    
    // Обновляем балансы счетов на начало нового месяца (если это последний закрытый месяц)
    const isLatest = !closedMonths.some(m => 
      m.year > monthToClose.year || (m.year === monthToClose.year && m.month > monthToClose.month)
    );
    
    if (isLatest) {
      const updatedAccounts = accounts.map(account => {
        const snapshot = monthToClose.accountsSnapshot.find(a => a.id === account.id);
        if (snapshot) {
          return { ...account, balance: snapshot.balance };
        }
        return account;
      });
      setAccounts(updatedAccounts);
    }
    
    setShowCloseModal(false);
    setMonthToClose(null);
    alert(`Месяц ${monthToClose.monthName} успешно закрыт!`);
  };

  // Генерируем месяцы для отображения
  const monthsToShow = useMemo(() => {
    const months = [];
    const startYear = Math.min(...yearsWithTransactions, selectedYear);
    const endYear = Math.max(...yearsWithTransactions, selectedYear, new Date().getFullYear());
    
    for (let year = endYear; year >= startYear; year--) {
      const maxMonth = year === new Date().getFullYear() ? new Date().getMonth() : 11;
      for (let month = maxMonth; month >= 0; month--) {
        if (hasTransactionsInMonth(year, month) || isMonthClosed(year, month)) {
          months.push({ year, month });
        }
      }
    }
    
    return months;
  }, [selectedYear, transactions, closedMonths, yearsWithTransactions]);

  return (
    <div>
      {/* Напоминание о незакрытых месяцах */}
      {shouldShowReminder && (
        <div className="card" style={{ 
          background: '#3d2d1a', 
          border: '1px solid #ffa500',
          animation: 'fadeIn 0.5s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 600, color: '#ffa500', marginBottom: '4px' }}>
                Незакрытые месяцы
              </div>
              <div style={{ fontSize: '12px', color: '#ffa500' }}>
                Есть {getUnclosedMonths.length} {getUnclosedMonths.length === 1 ? 'месяц' : 'месяца'} с транзакциями, которые нужно закрыть
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {getUnclosedMonths.slice(0, 5).map(({ year, month }) => (
              <span 
                key={`${year}-${month}`}
                style={{
                  padding: '4px 8px',
                  background: '#ff6b6b',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#ffffff'
                }}
              >
                {monthNames[month]} {year}
              </span>
            ))}
            {getUnclosedMonths.length > 5 && (
              <span style={{ padding: '4px 8px', fontSize: '12px', color: '#ffa500' }}>
                +{getUnclosedMonths.length - 5} еще
              </span>
            )}
          </div>
        </div>
      )}

      {/* Выбор года */}
      <div className="card">
        <div className="form-group">
          <label className="form-label">Выберите год</label>
          <select
            className="form-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {yearsWithTransactions.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
            {!yearsWithTransactions.includes(selectedYear) && (
              <option value={selectedYear}>{selectedYear}</option>
            )}
          </select>
        </div>
      </div>

      {/* Календарь месяцев */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Календарь месяцев</h2>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '12px',
          marginTop: '16px'
        }}>
          {monthNames.map((monthName, monthIndex) => {
            const isClosed = isMonthClosed(selectedYear, monthIndex);
            const hasTransactions = hasTransactionsInMonth(selectedYear, monthIndex);
            const monthData = hasTransactions ? getMonthData(selectedYear, monthIndex) : null;
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            const currentDay = now.getDate();
            const isFuture = selectedYear > currentYear || 
                            (selectedYear === currentYear && monthIndex > currentMonth);
            
            // Определяем цвет месяца
            let monthColor = '#333';
            let monthBackground = '#2d2d2d';
            let monthStatus = '';
            
            if (isClosed) {
              monthColor = '#4ade80';
              monthBackground = '#1a3a2a';
              monthStatus = '✅ Закрыт';
            } else if (hasTransactions) {
              // Проверяем, является ли это текущим месяцем (месяц, который сейчас идет)
              const isCurrentMonth = (selectedYear === currentYear && monthIndex === currentMonth);
              
              if (isCurrentMonth) {
                // Текущий месяц (который сейчас идет) - желтый
                monthColor = '#ffa500';
                monthBackground = '#3a2d1a';
                monthStatus = '⚠️ Требует закрытия';
              } else {
                // Все остальные месяцы с транзакциями (прошедшие, но не закрытые) - красные
                monthColor = '#ff6b6b';
                monthBackground = '#3a1a1a';
                monthStatus = '⚠️ Не закрыт';
              }
            } else {
              monthColor = '#666';
              monthStatus = 'Нет данных';
            }
            
            return (
              <div
                key={monthIndex}
                onClick={() => {
                  if (!isFuture && hasTransactions && !isClosed) {
                    handleCloseMonth(selectedYear, monthIndex);
                  }
                }}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: '2px solid',
                  borderColor: monthColor,
                  background: monthBackground,
                  cursor: !isFuture && hasTransactions && !isClosed ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                  animation: 'fadeIn 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isFuture && hasTransactions && !isClosed) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 4px 12px ${monthColor}40`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 600,
                  color: monthColor,
                  marginBottom: '8px'
                }}>
                  {monthName}
                </div>
                
                {isFuture ? (
                  <div style={{ fontSize: '12px', color: '#666' }}>Будущий</div>
                ) : isClosed ? (
                  <>
                    <div style={{ fontSize: '12px', color: '#4ade80', marginBottom: '4px' }}>
                      {monthStatus}
                    </div>
                    {closedMonths.find(m => m.year === selectedYear && m.month === monthIndex) && (
                      <div style={{ fontSize: '11px', color: '#777' }}>
                        {formatAmount(closedMonths.find(m => m.year === selectedYear && m.month === monthIndex).endingBalance)}
                      </div>
                    )}
                  </>
                ) : hasTransactions ? (
                  <>
                    <div style={{ fontSize: '12px', color: monthColor, marginBottom: '4px' }}>
                      {monthStatus}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {monthData.count} {monthData.count === 1 ? 'операция' : 'операций'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#777', marginTop: '4px' }}>
                      Нажмите для закрытия
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '12px', color: '#666' }}>Нет данных</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* История закрытых месяцев */}
      {closedMonths.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">История закрытых месяцев</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {closedMonths.slice().reverse().map((month) => (
              <div
                key={`${month.year}-${month.month}`}
                style={{
                  padding: '16px',
                  background: '#1a3a2a',
                  borderRadius: '8px',
                  border: '1px solid #4ade80',
                  animation: 'fadeIn 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 600, fontSize: '16px', color: '#4ade80' }}>
                    {month.monthName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#777' }}>
                    {new Date(month.closedAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Доходы</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#4ade80' }}>
                      {formatAmount(month.income)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Расходы</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#ff6b6b' }}>
                      {formatAmount(month.expenses)}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', paddingTop: '12px', borderTop: '1px solid #333' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Начало месяца</div>
                    <div style={{ fontSize: '14px', color: '#ffffff' }}>
                      {formatAmount(month.startingBalance)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Конец месяца</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#4ade80' }}>
                      {formatAmount(month.endingBalance)}
                    </div>
                  </div>
                </div>
                
                <div style={{ fontSize: '12px', color: '#777', marginTop: '8px' }}>
                  Операций: {month.transactionsCount}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения закрытия */}
      {showCloseModal && monthToClose && (
        <div className="modal-overlay" onClick={() => setShowCloseModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Закрыть {monthToClose.monthName}?</h3>
              <button className="modal-close" onClick={() => setShowCloseModal(false)}>×</button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                padding: '16px', 
                background: '#2d2d2d', 
                borderRadius: '8px',
                marginBottom: '12px'
              }}>
                <div style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>Доходы</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#4ade80' }}>
                  {formatAmount(monthToClose.income)}
                </div>
              </div>
              
              <div style={{ 
                padding: '16px', 
                background: '#2d2d2d', 
                borderRadius: '8px',
                marginBottom: '12px'
              }}>
                <div style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>Расходы</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#ff6b6b' }}>
                  {formatAmount(monthToClose.expenses)}
                </div>
              </div>
              
              <div style={{ 
                padding: '16px', 
                background: '#2d2d2d', 
                borderRadius: '8px',
                marginBottom: '12px'
              }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Баланс на начало</div>
                <div style={{ fontSize: '18px', color: '#ffffff' }}>
                  {formatAmount(monthToClose.startingBalance)}
                </div>
              </div>
              
              <div style={{ 
                padding: '16px', 
                background: '#1a3a2a', 
                borderRadius: '8px',
                border: '1px solid #4ade80'
              }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Баланс на конец</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#4ade80' }}>
                  {formatAmount(monthToClose.endingBalance)}
                </div>
              </div>
              
              <div style={{ fontSize: '12px', color: '#999', marginTop: '12px', textAlign: 'center' }}>
                Операций: {monthToClose.transactionsCount}
              </div>
            </div>
            
            <div style={{ 
              padding: '12px', 
              background: '#3d2d1a', 
              borderRadius: '8px',
              border: '1px solid #ffa500',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '12px', color: '#ffa500' }}>
                ⚠️ После закрытия изменения в этом месяце не повлияют на расчеты
              </div>
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowCloseModal(false)}
              >
                Отмена
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={confirmCloseMonth}
              >
                Закрыть месяц
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
