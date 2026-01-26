# 🔍 Отладка: Отсутствуют Authorization headers

## ❌ Проблема обнаружена!

В деталях запроса в Supabase **нет Authorization header**, хотя код его отправляет.

**Возможные причины:**
1. Веб-приложение не обновлено (старая версия задеплоена)
2. Переменные окружения не доступны на GitHub Pages
3. CORS блокирует заголовки

---

## ✅ Решение 1: Проверьте переменные окружения

### Проблема может быть в том, что `SUPABASE_ANON_KEY` пустой

Проверьте в консоли браузера:

```javascript
// Откройте приложение в Telegram, F12 → Console
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY);
```

**Если ключ пустой:**
- GitHub Secrets не добавлены
- Или не задеплоено после добавления секретов

---

## ✅ Решение 2: Добавьте GitHub Secrets

### 1. Проверьте GitHub Secrets

1. GitHub → Settings → **Secrets and variables** → **Actions**
2. Должны быть:
   - `VITE_SUPABASE_URL` = `https://zhchkxukgltknfbropqu.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_m96BQEXNJw5_L_CI0kQkUg_0vdPodFS`

**Если секретов нет:**
- Добавьте их
- Перезапустите деплой

---

## ✅ Решение 3: Задеплойте обновления

### 1. Закоммитьте изменения

```bash
cd /Users/mansurusupov/tg-finance-miniapp
git add .
git commit -m "Fix: Add apikey header and ensure Authorization is sent"
git push
```

### 2. Дождитесь деплоя

1. GitHub → Actions
2. Дождитесь завершения workflow
3. Должен быть зеленый статус ✅

---

## 🧪 Тест в консоли браузера

Откройте приложение в Telegram, F12 → Console и выполните:

```javascript
// Проверить переменные окружения
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');

// Проверить, что headers отправляются
const initData = window.Telegram?.WebApp?.initData;
const url = 'https://zhchkxukgltknfbropqu.supabase.co/functions/v1/sync';
const key = 'sb_publishable_m96BQEXNJw5_L_CI0kQkUg_0vdPodFS';

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`,
    'apikey': key,
    'x-telegram-init-data': initData
  },
  body: JSON.stringify({ accounts: [] })
})
.then(r => {
  console.log('Status:', r.status);
  console.log('Headers sent:', {
    'Authorization': `Bearer ${key.substring(0, 20)}...`,
    'apikey': key.substring(0, 20) + '...',
    'x-telegram-init-data': initData ? 'Есть' : 'Нет'
  });
  return r.json();
})
.then(data => {
  console.log('Response:', data);
})
.catch(err => console.error('Error:', err));
```

**Ожидаемый результат:**
- Status: **200** (не 401!)
- Headers должны быть отправлены
- Response: `{ success: true }`

---

## 📝 Что проверить:

1. ✅ **GitHub Secrets добавлены?** (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
2. ✅ **Веб-приложение задеплоено?** (Actions → зеленый статус)
3. ✅ **Переменные окружения доступны?** (проверьте в консоли)
4. ✅ **Headers отправляются?** (проверьте тест выше)

---

## ❓ Если проблема останется

Проверьте:
1. Что показывает консоль браузера (F12)?
2. Какие переменные окружения доступны?
3. Задеплоено ли веб-приложение?
