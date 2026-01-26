# ✅ Проверка Edge Function

## ✅ Секрет `SUPABASE_SERVICE_ROLE_KEY` уже есть — отлично!

Теперь нужно проверить, что Edge Function обновлена и использует правильный код.

---

## 📋 Шаг 1: Проверьте код Edge Function

### 1. Откройте Edge Function

1. Supabase → Edge Functions → `sync` → **Code**

### 2. Проверьте создание клиента (около строки 117-133)

Должно быть:

```typescript
// Получаем переменные окружения Supabase
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://zhchkxukgltknfbropqu.supabase.co";

// Используем service_role key для создания клиента (обходит RLS и не требует JWT)
// service_role key должен быть добавлен как секрет SUPABASE_SERVICE_ROLE_KEY
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || 
                      Deno.env.get("SUPABASE_ANON_KEY") || 
                      "sb_publishable_m96BQEXNJw5_L_CI0kQkUg_0vdPodFS";

// Создаем клиент Supabase с service_role key
// Это позволяет обойти RLS и работать напрямую с базой данных
const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
```

**Если код другой:**
- Скопируйте код из файла `supabase_edge_function_sync_FULL.ts`
- Вставьте в Edge Function
- Задеплойте

---

## 📋 Шаг 2: Проверьте, что веб-приложение обновлено

### 1. Проверьте код в `web/src/lib/api.js`

Должно быть `apikey` header в запросах:

```javascript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'apikey': SUPABASE_ANON_KEY,  // ← Должен быть этот header
  'x-telegram-init-data': initData,
}
```

### 2. Задеплойте обновления

```bash
cd /Users/mansurusupov/tg-finance-miniapp
git add .
git commit -m "Fix: Add apikey header to Supabase requests"
git push
```

---

## 📋 Шаг 3: Проверьте работу

### 1. После деплоя

1. Дождитесь завершения деплоя веб-приложения
2. Откройте приложение в Telegram
3. Попробуйте добавить данные
4. Проверьте Invocations — должны быть 200 OK (не 401)

### 2. Проверьте таблицы

1. Supabase → Table Editor → `users`
2. Должна появиться запись с вашим `telegram_user_id`

3. Table Editor → `user_data`
4. Должны появиться записи с вашими данными

---

## ❓ Если все еще 401 ошибки

Проверьте:
1. ✅ Обновлен ли код Edge Function? (проверьте строки 117-133)
2. ✅ Задеплоена ли Edge Function?
3. ✅ Задеплоено ли веб-приложение?
4. ✅ Что показывает консоль браузера (F12)?

---

## 🧪 Тест в консоли

Откройте приложение в Telegram, F12 → Console и выполните:

```javascript
const initData = window.Telegram?.WebApp?.initData;

if (initData) {
  fetch('https://zhchkxukgltknfbropqu.supabase.co/functions/v1/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sb_publishable_m96BQEXNJw5_L_CI0kQkUg_0vdPodFS',
      'apikey': 'sb_publishable_m96BQEXNJw5_L_CI0kQkUg_0vdPodFS',
      'x-telegram-init-data': initData
    },
    body: JSON.stringify({
      accounts: [{ id: 1, name: 'Тест', currency: 'RUB', balance: 100, color: '#2481cc' }]
    })
  })
  .then(r => {
    console.log('Status:', r.status);
    return r.json();
  })
  .then(data => {
    console.log('Response:', data);
    if (r.status === 200) {
      console.log('✅ Успешно!');
    } else {
      console.error('❌ Ошибка:', data.error);
    }
  })
  .catch(err => console.error('❌ Ошибка:', err));
}
```

**Ожидаемый результат:**
- Status: **200** (не 401!)
- Response: `{ success: true }`

---

## 📝 Что проверить сейчас:

1. ✅ **Код Edge Function** — использует ли `SUPABASE_SERVICE_ROLE_KEY`?
2. ✅ **Веб-приложение** — добавлен ли `apikey` header?
3. ✅ **Деплой** — все обновлено?
