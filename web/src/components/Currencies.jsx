import { useState } from 'react';

export default function Currencies({ currencies, setCurrencies }) {
  const [showModal, setShowModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    rate: 1,
    source: 'manual'
  });
  const [rateDisplay, setRateDisplay] = useState('');
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

  const handleOpenModal = (currency = null) => {
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
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCurrency(null);
    setFormData({
      code: '',
      name: '',
      rate: 1,
      source: 'manual'
    });
    setRateDisplay('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Парсим отформатированное значение курса
    const newRate = parseFormattedNumber(rateDisplay);
    
    if (editingCurrency) {
      // Редактирование - проверяем изменение курса
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
      
      // Редактирование
      const updated = currencies.map(curr =>
        curr.code === editingCurrency.code
          ? { ...curr, ...formData, rate: newRate }
          : curr
      );
      setCurrencies(updated);
    } else {
      // Создание
      const newCurrency = {
        ...formData,
        rate: newRate
      };
      setCurrencies([...currencies, newCurrency]);
    }
    
    handleCloseModal();
  };

  const handleDelete = (code) => {
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
      alert('Выберите валюту (не RUB)');
      return;
    }

    setLoading(true);
    try {
      // Используем бесплатный API для получения курсов валют
      // Пример: exchangerate-api.com или другой публичный API
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/RUB`);
      const data = await response.json();
      
      if (data.rates && data.rates[formData.code]) {
        const rate = 1 / data.rates[formData.code]; // Конвертируем в рубли
        setFormData({ ...formData, rate: parseFloat(rate.toFixed(4)), source: 'api' });
        alert(`Курс обновлен: 1 ${formData.code} = ${rate.toFixed(2)} RUB`);
      } else {
        alert('Не удалось получить курс для этой валюты');
      }
    } catch (error) {
      console.error('Ошибка при получении курса:', error);
      alert('Не удалось получить курс. Проверьте подключение к интернету.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAllRates = async () => {
    if (!window.confirm('Обновить курсы всех валют из интернета?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/RUB`);
      const data = await response.json();
      
      if (data.rates) {
        const updated = currencies.map(curr => {
          if (curr.code === 'RUB') {
            return curr; // RUB всегда 1
          }
          if (data.rates[curr.code]) {
            const rate = 1 / data.rates[curr.code];
            return { ...curr, rate: parseFloat(rate.toFixed(4)), source: 'api' };
          }
          return curr;
        });
        setCurrencies(updated);
        alert('Курсы обновлены!');
      }
    } catch (error) {
      console.error('Ошибка при обновлении курсов:', error);
      alert('Не удалось обновить курсы. Проверьте подключение к интернету.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (code) => {
    const currencyInfo = currencyCodes.find(c => c.code === code);
    setFormData({
      ...formData,
      code: code,
      name: currencyInfo ? currencyInfo.name : ''
    });
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Валюты и курсы</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary btn-small" 
              onClick={handleUpdateAllRates}
              disabled={loading}
            >
              {loading ? '⏳' : '🔄'} Обновить все
            </button>
            <button className="btn btn-primary btn-small" onClick={() => handleOpenModal()}>
              + Добавить
            </button>
          </div>
        </div>
        
        {currencies.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💱</div>
            <div className="empty-state-text">Нет валют</div>
          </div>
        ) : (
          <ul className="list">
            {currencies.map(currency => (
              <li key={currency.code} className="list-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                    {currency.code} - {currency.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    1 {currency.code} = {currency.rate.toFixed(4)} RUB
                    {currency.source === 'api' && (
                      <span style={{ marginLeft: '8px', color: '#4ade80' }}>• Авто</span>
                    )}
                    {currency.source === 'manual' && (
                      <span style={{ marginLeft: '8px', color: '#999' }}>• Ручной</span>
                    )}
                  </div>
                </div>
                {currency.code !== 'RUB' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary btn-small"
                      onClick={() => handleOpenModal(currency)}
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn btn-danger btn-small"
                      onClick={() => handleDelete(currency.code)}
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingCurrency ? 'Редактировать валюту' : 'Новая валюта'}
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Код валюты</label>
                <select
                  className="form-select"
                  value={formData.code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  required
                  disabled={!!editingCurrency}
                >
                  <option value="">Выберите валюту</option>
                  {currencyCodes
                    .filter(c => !currencies.find(curr => curr.code === c.code) || (editingCurrency && editingCurrency.code === c.code))
                    .map(c => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Название</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Название валюты"
                  required
                />
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
                      // Разрешаем ввод только цифр, точки, запятой и пробелов
                      if (/^[\d\s.,]*$/.test(inputValue) || inputValue === '') {
                        setRateDisplay(inputValue);
                        const parsed = parseFormattedNumber(inputValue);
                        setFormData({ ...formData, rate: parsed, source: 'manual' });
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
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
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
    </div>
  );
}
