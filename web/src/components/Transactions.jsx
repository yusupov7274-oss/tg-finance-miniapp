import { useState, useMemo } from 'react';

export default function Transactions({ transactions, setTransactions, accounts, setAccounts, currencies, expenseCategories, incomeCategories }) {
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState({
    type: 'expense',
    accountId: '',
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
  const expenseCats = expenseCategories && expenseCategories.length > 0 ? expenseCategories : [
    'Продукты', 'Транспорт', 'Жилье', 'Развлечения',
    'Здоровье', 'Образование', 'Одежда', 'Подарки',
    'Другое'
  ];
  
  const incomeCats = incomeCategories && incomeCategories.length > 0 ? incomeCategories : [
    'Зарплата', 'Подарки', 'Инвестиции', 'Другое'
  ];
  
  const categories = formData.type === 'income' ? incomeCats : expenseCats;

  const handleOpenModal = (transaction = null) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setFormData({
        type: transaction.type,
        accountId: transaction.accountId,
        amount: transaction.amount,
        category: transaction.category || '',
        description: transaction.description || '',
        date: transaction.date.split('T')[0]
      });
      setAmountDisplay(formatNumberInput(transaction.amount));
    } else {
      setEditingTransaction(null);
      setFormData({
        type: 'expense',
        accountId: accounts[0]?.id || '',
        amount: 0,
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      setAmountDisplay('');
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTransaction(null);
    setAmountDisplay('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Парсим отформатированное значение суммы
    const newAmount = parseFormattedNumber(amountDisplay);
    
    if (editingTransaction) {
      // Редактирование - проверяем изменение суммы
      const oldAmount = editingTransaction.amount;
      const accountChanged = editingTransaction.accountId !== parseInt(formData.accountId);
      const typeChanged = editingTransaction.type !== formData.type;
      
      if (oldAmount !== newAmount || accountChanged || typeChanged) {
        const changes = [];
        if (oldAmount !== newAmount) {
          const formatNum = (num) => new Intl.NumberFormat('ru-RU', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2,
            useGrouping: true 
          }).format(num);
          changes.push(`сумму с ${formatNum(oldAmount)} на ${formatNum(newAmount)}`);
        }
        if (accountChanged) changes.push('счет');
        if (typeChanged) changes.push('тип операции');
        
        if (!window.confirm(`Изменить ${changes.join(', ')}?`)) {
          return;
        }
      }
      
      // Восстанавливаем старый баланс перед применением новой транзакции
      const oldAccount = accounts.find(a => a.id === editingTransaction.accountId);
      if (oldAccount) {
        const restoredAccounts = accounts.map(acc =>
          acc.id === oldAccount.id
            ? {
                ...acc,
                balance: editingTransaction.type === 'income'
                  ? acc.balance - editingTransaction.amount
                  : acc.balance + editingTransaction.amount
              }
            : acc
        );
        setAccounts(restoredAccounts);
      }
      
      // Применяем новую транзакцию
      const updated = transactions.map(t =>
        t.id === editingTransaction.id
          ? { ...t, ...formData, amount: newAmount, accountId: parseInt(formData.accountId), date: new Date(formData.date).toISOString() }
          : t
      );
      setTransactions(updated);
      
      // Обновляем баланс с новыми данными
      const newAccountId = parseInt(formData.accountId);
      const newAccount = accounts.find(a => a.id === newAccountId);
      if (newAccount) {
        const updatedAccounts = accounts.map(acc =>
          acc.id === newAccountId
            ? {
                ...acc,
                balance: formData.type === 'income'
                  ? acc.balance + newAmount
                  : acc.balance - newAmount
              }
            : acc
        );
        setAccounts(updatedAccounts);
      }
    } else {
      // Создание
      const newTransaction = {
        id: Date.now(),
        ...formData,
        amount: newAmount,
        date: new Date(formData.date).toISOString()
      };
      setTransactions([...transactions, newTransaction]);
      
      // Обновление баланса счета
      const account = accounts.find(a => a.id === formData.accountId);
      if (account) {
        const updatedAccounts = accounts.map(acc =>
          acc.id === account.id
            ? {
                ...acc,
                balance: formData.type === 'income'
                  ? acc.balance + newAmount
                  : acc.balance - newAmount
              }
            : acc
        );
        setAccounts(updatedAccounts);
      }
    }
    
    handleCloseModal();
  };

  const handleDelete = (id) => {
    if (window.confirm('Удалить эту транзакцию?')) {
      const transaction = transactions.find(t => t.id === id);
      if (transaction) {
        // Восстанавливаем баланс
        const account = accounts.find(a => a.id === transaction.accountId);
        if (account) {
        const updatedAccounts = accounts.map(acc =>
          acc.id === account.id
            ? {
                ...acc,
                balance: transaction.type === 'income'
                  ? acc.balance - transaction.amount
                  : acc.balance + transaction.amount
                }
              : acc
          );
          setAccounts(updatedAccounts);
        }
      }
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  // Сортированные транзакции
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions]);

  const formatAmount = (amount, currency) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency || 'RUB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true, // Включаем разделители тысяч
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

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Операции</h2>
          <button className="btn btn-primary btn-small" onClick={() => handleOpenModal()}>
            + Добавить
          </button>
        </div>
        
        {sortedTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💰</div>
            <div className="empty-state-text">Нет транзакций</div>
            <button className="btn btn-primary mt-16" onClick={() => handleOpenModal()}>
              Добавить первую операцию
            </button>
          </div>
        ) : (
          <ul className="list">
            {sortedTransactions.map(transaction => {
              const currency = getAccountCurrency(transaction.accountId);
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
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                        {transaction.description}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', marginRight: '12px' }}>
                  <div style={{ 
                    fontWeight: 600,
                    color: transaction.type === 'income' ? '#4ade80' : '#ff6b6b'
                  }}>
                    {transaction.type === 'income' ? '+' : '-'}{formatAmount(transaction.amount, currency)}
                  </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      className="btn btn-secondary btn-small"
                      onClick={() => handleOpenModal(transaction)}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn btn-danger btn-small"
                      onClick={() => handleDelete(transaction.id)}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
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
                {editingTransaction ? 'Редактировать операцию' : 'Новая операция'}
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Тип</label>
                <select
                  className="form-select"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="income">Доход</option>
                  <option value="expense">Расход</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Счет</label>
                <select
                  className="form-select"
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: parseInt(e.target.value) })}
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
                    // Разрешаем ввод только цифр, точки, запятой и пробелов
                    if (/^[\d\s.,]*$/.test(inputValue) || inputValue === '') {
                      // Убираем пробелы для парсинга, затем форматируем обратно
                      const cleaned = inputValue.replace(/\s/g, '');
                      if (cleaned === '' || cleaned === '.') {
                        setAmountDisplay(cleaned);
                        setFormData({ ...formData, amount: 0 });
                      } else {
                        const parsed = parseFloat(cleaned.replace(',', '.')) || 0;
                        setFormData({ ...formData, amount: parsed });
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
                />
              </div>

              <div className="form-group">
                <label className="form-label">Категория</label>
                <select
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Выберите категорию</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Описание</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Необязательно"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Дата</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTransaction ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
