import { useState, useEffect } from 'react';

export default function Settings({ currencies, setCurrencies, expenseCategories, setExpenseCategories, incomeCategories, setIncomeCategories }) {
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryType, setCategoryType] = useState('expense'); // 'expense' или 'income'
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    rate: 1,
    source: 'manual'
  });
  const [rateDisplay, setRateDisplay] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(false);

  // Форматирование числа с разделителями тысяч для отображения в input
  const formatNumberInput = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/\s/g, '')) : value;
    if (isNaN(numValue)) return '';
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
      useGrouping: true
    }).format(numValue);
  };

  // Парсинг отформатированного числа обратно в число
  const parseFormattedNumber = (value) => {
    if (!value || value === '') return 0;
    const cleaned = value.toString().replace(/\s/g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const currencyCodes = [
    { code: 'RUB', name: 'Российский рубль' },
    { code: 'USD', name: 'Доллар США' },
    { code: 'EUR', name: 'Евро' },
    { code: 'GBP', name: 'Фунт стерлингов' },
    { code: 'CNY', name: 'Китайский юань' },
    { code: 'JPY', name: 'Японская иена' },
    { code: 'KZT', name: 'Казахстанский тенге' },
    { code: 'UAH', name: 'Украинская гривна' }
  ];

  // Валюты
  const handleOpenCurrencyModal = (currency = null) => {
    if (currency) {
      setEditingCurrency(currency);
      setFormData({
        code: currency.code,
        name: currency.name,
        rate: currency.rate,
        source: currency.source || 'manual'
      });
      setRateDisplay(formatNumberInput(currency.rate));
    } else {
      setEditingCurrency(null);
      setFormData({
        code: '',
        name: '',
        rate: 1,
        source: 'manual'
      });
      setRateDisplay('');
    }
    setShowCurrencyModal(true);
  };

  const handleCloseCurrencyModal = () => {
    setShowCurrencyModal(false);
    setEditingCurrency(null);
    setFormData({
      code: '',
      name: '',
      rate: 1,
      source: 'manual'
    });
    setRateDisplay('');
  };

  const handleCurrencySubmit = (e) => {
    e.preventDefault();
    
    const newRate = parseFormattedNumber(rateDisplay);
    
    if (editingCurrency) {
      const oldRate = editingCurrency.rate;
      
      if (oldRate !== newRate) {
        const formatNum = (num) => new Intl.NumberFormat('ru-RU', { 
          minimumFractionDigits: 4, 
          maximumFractionDigits: 4,
          useGrouping: true 
        }).format(num);
        if (!window.confirm(`Изменить курс с ${formatNum(oldRate)} на ${formatNum(newRate)}?`)) {
          return;
        }
      }
      
      const updated = currencies.map(curr =>
        curr.code === editingCurrency.code
          ? { ...curr, ...formData, rate: newRate }
          : curr
      );
      setCurrencies(updated);
    } else {
      const newCurrency = {
        ...formData,
        rate: newRate
      };
      setCurrencies([...currencies, newCurrency]);
    }
    
    handleCloseCurrencyModal();
  };

  const handleDeleteCurrency = (code) => {
    if (code === 'RUB') {
      alert('Нельзя удалить базовую валюту (RUB)');
      return;
    }
    if (window.confirm('Удалить эту валюту?')) {
      setCurrencies(currencies.filter(c => c.code !== code));
    }
  };

  const handleFetchRate = async () => {
    if (!formData.code || formData.code === 'RUB') {
      alert('Нельзя получить курс для базовой валюты');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/RUB`);
      const data = await response.json();
      
      if (data.rates && data.rates[formData.code]) {
        const rate = 1 / data.rates[formData.code];
        setFormData({ ...formData, rate, source: 'api' });
        setRateDisplay(formatNumberInput(rate));
      } else {
        alert('Не удалось получить курс для этой валюты');
      }
    } catch (error) {
      alert('Ошибка при получении курса. Проверьте подключение к интернету.');
    } finally {
      setLoading(false);
    }
  };

  // Категории
  const handleOpenCategoryModal = (category = null, type = 'expense') => {
    setCategoryType(type);
    if (category) {
      setEditingCategory(category);
      setCategoryName(category);
    } else {
      setEditingCategory(null);
      setCategoryName('');
    }
    setShowCategoryModal(true);
  };

  const handleCloseCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryName('');
  };

  const handleCategorySubmit = (e) => {
    e.preventDefault();
    
    if (!categoryName.trim()) {
      alert('Введите название категории');
      return;
    }

    if (categoryType === 'expense') {
      if (editingCategory) {
        // Редактирование
        const updated = expenseCategories.map(cat => 
          cat === editingCategory ? categoryName.trim() : cat
        );
        setExpenseCategories(updated);
      } else {
        // Добавление
        if (expenseCategories.includes(categoryName.trim())) {
          alert('Такая категория уже существует');
          return;
        }
        setExpenseCategories([...expenseCategories, categoryName.trim()]);
      }
    } else {
      if (editingCategory) {
        // Редактирование
        const updated = incomeCategories.map(cat => 
          cat === editingCategory ? categoryName.trim() : cat
        );
        setIncomeCategories(updated);
      } else {
        // Добавление
        if (incomeCategories.includes(categoryName.trim())) {
          alert('Такая категория уже существует');
          return;
        }
        setIncomeCategories([...incomeCategories, categoryName.trim()]);
      }
    }
    
    handleCloseCategoryModal();
  };

  const handleDeleteCategory = (category, type) => {
    if (window.confirm(`Удалить категорию "${category}"?`)) {
      if (type === 'expense') {
        setExpenseCategories(expenseCategories.filter(cat => cat !== category));
      } else {
        setIncomeCategories(incomeCategories.filter(cat => cat !== category));
      }
    }
  };

  return (
    <div>
      {/* Категории расходов */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Категории расходов</h2>
          <button 
            className="btn btn-primary btn-small" 
            onClick={() => handleOpenCategoryModal(null, 'expense')}
          >
            + Добавить
          </button>
        </div>
        
        {expenseCategories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">Нет категорий</div>
          </div>
        ) : (
          <ul className="list">
            {expenseCategories.map((category, index) => (
              <li key={index} className="list-item">
                <div style={{ fontWeight: 500 }}>{category}</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => handleOpenCategoryModal(category, 'expense')}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => handleDeleteCategory(category, 'expense')}
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Категории доходов */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Категории доходов</h2>
          <button 
            className="btn btn-primary btn-small" 
            onClick={() => handleOpenCategoryModal(null, 'income')}
          >
            + Добавить
          </button>
        </div>
        
        {incomeCategories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">Нет категорий</div>
          </div>
        ) : (
          <ul className="list">
            {incomeCategories.map((category, index) => (
              <li key={index} className="list-item">
                <div style={{ fontWeight: 500 }}>{category}</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => handleOpenCategoryModal(category, 'income')}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => handleDeleteCategory(category, 'income')}
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Валюты */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Валюты</h2>
          <button 
            className="btn btn-primary btn-small" 
            onClick={() => handleOpenCurrencyModal()}
          >
            + Добавить
          </button>
        </div>
        
        {currencies.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💱</div>
            <div className="empty-state-text">Нет валют</div>
            <button className="btn btn-primary mt-16" onClick={() => handleOpenCurrencyModal()}>
              Добавить валюту
            </button>
          </div>
        ) : (
          <ul className="list">
            {currencies.map(currency => (
              <li key={currency.code} className="list-item">
                <div>
                  <div style={{ fontWeight: 500 }}>
                    {currency.code} - {currency.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    Курс: {formatNumberInput(currency.rate)} RUB
                    {currency.source === 'api' && ' (из API)'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => handleOpenCurrencyModal(currency)}
                  >
                    ✏️
                  </button>
                  {currency.code !== 'RUB' && (
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => handleDeleteCurrency(currency.code)}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Модальное окно для валюты */}
      {showCurrencyModal && (
        <div className="modal-overlay" onClick={handleCloseCurrencyModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCurrency ? 'Редактировать валюту' : 'Добавить валюту'}
              </h3>
              <button className="modal-close" onClick={handleCloseCurrencyModal}>×</button>
            </div>
            
            <form onSubmit={handleCurrencySubmit}>
              <div className="form-group">
                <label className="form-label">Код валюты</label>
                <select
                  className="form-select"
                  value={formData.code}
                  onChange={(e) => {
                    const selected = currencyCodes.find(c => c.code === e.target.value);
                    setFormData({ 
                      ...formData, 
                      code: e.target.value,
                      name: selected ? selected.name : ''
                    });
                  }}
                  required
                  disabled={!!editingCurrency}
                >
                  <option value="">Выберите валюту</option>
                  {currencyCodes.map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} - {curr.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Курс к RUB (1 {formData.code || 'XXX'} = ? RUB)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="form-input"
                    value={rateDisplay || (formData.code === 'RUB' ? '1' : '')}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      if (/^[\d\s.,]*$/.test(inputValue) || inputValue === '') {
                        // Убираем пробелы для парсинга, затем форматируем обратно
                        const cleaned = inputValue.replace(/\s/g, '');
                        if (cleaned === '' || cleaned === '.') {
                          setRateDisplay(cleaned);
                          setFormData({ ...formData, rate: 0, source: 'manual' });
                        } else {
                          const parsed = parseFloat(cleaned.replace(',', '.')) || 0;
                          setFormData({ ...formData, rate: parsed, source: 'manual' });
                          // Форматируем только если введено достаточно цифр или при завершении ввода
                          if (cleaned.length > 3 || cleaned.includes('.') || cleaned.includes(',')) {
                            setRateDisplay(formatNumberInput(parsed));
                          } else {
                            setRateDisplay(cleaned);
                          }
                        }
                      }
                    }}
                    onFocus={(e) => {
                      if (rateDisplay === '' || parseFormattedNumber(rateDisplay) === 0) {
                        if (formData.code === 'RUB') {
                          setRateDisplay('1');
                          setFormData({ ...formData, rate: 1 });
                        } else {
                          setRateDisplay('');
                        }
                      } else {
                        e.target.select();
                      }
                    }}
                    onBlur={(e) => {
                      const parsed = parseFormattedNumber(rateDisplay);
                      if (parsed === 0) {
                        if (formData.code === 'RUB') {
                          setRateDisplay('1');
                          setFormData({ ...formData, rate: 1 });
                        } else {
                          setRateDisplay('');
                        }
                      } else {
                        setRateDisplay(formatNumberInput(parsed));
                      }
                    }}
                    placeholder={formData.code === 'RUB' ? '1' : '0'}
                    required
                    style={{ flex: 1 }}
                  />
                  {formData.code && formData.code !== 'RUB' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleFetchRate}
                      disabled={loading}
                    >
                      {loading ? '⏳' : '🔄'}
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  {formData.source === 'api' ? 'Курс получен из API' : 'Ручной ввод'}
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleCloseCurrencyModal}
                >
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCurrency ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно для категории */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={handleCloseCategoryModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCategory ? 'Редактировать категорию' : 'Добавить категорию'}
              </h3>
              <button className="modal-close" onClick={handleCloseCategoryModal}>×</button>
            </div>
            
            <form onSubmit={handleCategorySubmit}>
              <div className="form-group">
                <label className="form-label">
                  Название категории {categoryType === 'expense' ? 'расхода' : 'дохода'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Например: Продукты"
                  required
                  autoFocus
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleCloseCategoryModal}
                >
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
