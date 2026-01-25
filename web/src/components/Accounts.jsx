import { useState, useMemo } from 'react';

export default function Accounts({ accounts, setAccounts, currencies, balanceChecks, setBalanceChecks }) {
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    currency: 'RUB',
    balance: 0,
    color: '#2481cc'
  });
  const [balanceDisplay, setBalanceDisplay] = useState('');

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

  const colors = [
    '#2481cc', '#00a86b', '#ff4444', '#ffa500',
    '#9c27b0', '#00bcd4', '#ff9800', '#4caf50'
  ];

  // Функция для получения номера недели
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  // Проверка статуса еженедельной проверки балансов
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

  // Обработчик подтверждения проверки балансов
  const handleConfirmBalanceCheck = () => {
    const now = new Date();
    const newCheck = {
      id: Date.now(),
      date: now.toISOString(),
      confirmed: true
    };
    setBalanceChecks([...balanceChecks, newCheck]);
  };

  const handleOpenModal = (account = null) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        currency: account.currency,
        balance: account.balance,
        color: account.color
      });
      setBalanceDisplay(formatNumberInput(account.balance));
    } else {
      setEditingAccount(null);
      setFormData({
        name: '',
        currency: 'RUB',
        balance: 0,
        color: '#2481cc'
      });
      setBalanceDisplay('');
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAccount(null);
    setFormData({
      name: '',
      currency: 'RUB',
      balance: 0,
      color: '#2481cc'
    });
    setBalanceDisplay('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Парсим отформатированное значение баланса
    const newBalance = parseFormattedNumber(balanceDisplay);
    
    if (editingAccount) {
      // Редактирование - проверяем изменение баланса
      const oldBalance = editingAccount.balance;
      
      if (oldBalance !== newBalance) {
        const formatNum = (num) => new Intl.NumberFormat('ru-RU', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2,
          useGrouping: true 
        }).format(num);
        if (!window.confirm(`Изменить баланс с ${formatNum(oldBalance)} на ${formatNum(newBalance)}?`)) {
          return;
        }
      }
      
      // Редактирование
      const updated = accounts.map(acc =>
        acc.id === editingAccount.id
          ? { ...acc, ...formData, balance: newBalance }
          : acc
      );
      setAccounts(updated);
    } else {
      // Создание
      const newAccount = {
        id: Date.now(),
        ...formData,
        balance: newBalance
      };
      setAccounts([...accounts, newAccount]);
    }
    
    handleCloseModal();
  };

  const handleDelete = (id) => {
    if (window.confirm('Удалить этот счет?')) {
      setAccounts(accounts.filter(acc => acc.id !== id));
    }
  };

  const formatAmount = (amount, currency) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency || 'RUB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true, // Включаем разделители тысяч
    }).format(amount);
  };

  return (
    <div>
      {/* Напоминание о проверке балансов */}
      {balanceCheckStatus === 'unchecked' && (
        <div className="card" style={{ 
          background: '#3a1a1a', 
          border: '1px solid #ff6b6b',
          animation: 'fadeIn 0.5s ease',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 600, color: '#ff6b6b', marginBottom: '4px' }}>
                Требуется проверка балансов
              </div>
              <div style={{ fontSize: '12px', color: '#ff6b6b' }}>
                Проверьте все деньги на всех счетах и подтвердите проверку
              </div>
            </div>
          </div>
          <button 
            className="btn btn-primary"
            onClick={handleConfirmBalanceCheck}
            style={{ width: '100%' }}
          >
            ✅ Подтвердить проверку
          </button>
        </div>
      )}

      {balanceCheckStatus === 'checked' && (
        <div className="card" style={{ 
          background: '#1a3a2a', 
          border: '1px solid #4ade80',
          animation: 'fadeIn 0.5s ease',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>✅</span>
            <div>
              <div style={{ fontWeight: 600, color: '#4ade80', marginBottom: '4px' }}>
                Балансы проверены
              </div>
              <div style={{ fontSize: '12px', color: '#4ade80' }}>
                Проверка подтверждена на этой неделе
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Мои счета</h2>
          <button className="btn btn-primary btn-small" onClick={() => handleOpenModal()}>
            + Добавить
          </button>
        </div>
        
        {accounts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💳</div>
            <div className="empty-state-text">Нет счетов</div>
            <button className="btn btn-primary mt-16" onClick={() => handleOpenModal()}>
              Создать первый счет
            </button>
          </div>
        ) : (
          <ul className="list">
            {accounts.map(account => {
              // Определяем тип счета по названию
              const isCard = account.name.toLowerCase().includes('карт') || 
                            account.name.toLowerCase().includes('card') ||
                            account.name.toLowerCase().includes('дебет') ||
                            account.name.toLowerCase().includes('кредит');
              const isCash = account.name.toLowerCase().includes('налич') ||
                            account.name.toLowerCase().includes('cash') ||
                            account.name.toLowerCase().includes('кошелек');
              
              // Иконки для разных валют
              const currencyIcons = {
                'RUB': '₽',
                'USD': '$',
                'EUR': '€',
                'KZT': '₸',
                'GBP': '£',
                'CNY': '¥',
                'JPY': '¥',
                'UAH': '₴'
              };
              
              return (
                <li key={account.id} className="list-item" style={{ 
                  animation: 'fadeIn 0.3s ease',
                  animationFillMode: 'both'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    {/* Визуализация счета */}
                    <div style={{
                      width: '48px',
                      height: '32px',
                      borderRadius: isCard ? '6px' : '4px',
                      background: isCard 
                        ? `linear-gradient(135deg, ${account.color} 0%, ${account.color}dd 100%)`
                        : `linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                      boxShadow: isCard 
                        ? '0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                        : '0 1px 3px rgba(0, 0, 0, 0.1)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {isCard ? (
                        <>
                          {/* Полоски на карте */}
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            width: '32px',
                            height: '4px',
                            background: 'rgba(0, 0, 0, 0.3)',
                            borderRadius: '2px'
                          }} />
                          <div style={{
                            position: 'absolute',
                            top: '14px',
                            left: '8px',
                            width: '24px',
                            height: '4px',
                            background: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: '2px'
                          }} />
                          {/* Чип */}
                          <div style={{
                            position: 'absolute',
                            bottom: '4px',
                            right: '4px',
                            width: '12px',
                            height: '10px',
                            background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                            borderRadius: '2px',
                            border: '1px solid rgba(0, 0, 0, 0.2)'
                          }} />
                        </>
                      ) : isCash ? (
                        <span style={{ fontSize: '20px' }}>
                          {currencyIcons[account.currency] || '💵'}
                        </span>
                      ) : (
                        <span 
                          className="color-indicator" 
                          style={{ 
                            backgroundColor: account.color,
                            width: '16px',
                            height: '16px'
                          }}
                        />
                      )}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                        {account.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        {account.currency}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginRight: '12px' }}>
                      <div style={{ fontWeight: 600 }}>
                        {formatAmount(account.balance, account.currency)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary btn-small"
                      onClick={() => handleOpenModal(account)}
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn btn-danger btn-small"
                      onClick={() => handleDelete(account.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingAccount ? 'Редактировать счет' : 'Новый счет'}
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Название</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Основной счет"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Валюта</label>
                <select
                  className="form-select"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                >
                  {currencies.map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} - {curr.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Начальный баланс</label>
                <input
                  type="text"
                  inputMode="decimal"
                  className="form-input"
                  value={balanceDisplay}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    // Разрешаем ввод только цифр, точки, запятой и пробелов
                    if (/^[\d\s.,]*$/.test(inputValue) || inputValue === '') {
                      // Убираем пробелы для парсинга, затем форматируем обратно
                      const cleaned = inputValue.replace(/\s/g, '');
                      if (cleaned === '' || cleaned === '.') {
                        setBalanceDisplay(cleaned);
                        setFormData({ ...formData, balance: 0 });
                      } else {
                        const parsed = parseFloat(cleaned.replace(',', '.')) || 0;
                        setFormData({ ...formData, balance: parsed });
                        // Форматируем только если введено достаточно цифр или при завершении ввода
                        if (cleaned.length > 3 || cleaned.includes('.') || cleaned.includes(',')) {
                          setBalanceDisplay(formatNumberInput(parsed));
                        } else {
                          setBalanceDisplay(cleaned);
                        }
                      }
                    }
                  }}
                  onFocus={(e) => {
                    if (balanceDisplay === '' || parseFormattedNumber(balanceDisplay) === 0) {
                      setBalanceDisplay('');
                    } else {
                      e.target.select();
                    }
                  }}
                  onBlur={(e) => {
                    const parsed = parseFormattedNumber(balanceDisplay);
                    if (parsed === 0) {
                      setBalanceDisplay('');
                    } else {
                      setBalanceDisplay(formatNumberInput(parsed));
                    }
                  }}
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Цвет</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: formData.color === color ? '3px solid #333' : '2px solid #ddd',
                        backgroundColor: color,
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingAccount ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
