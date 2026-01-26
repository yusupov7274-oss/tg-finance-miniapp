# Как создать Edge Function в Supabase

## ✅ Шаг 1: Таблицы созданы!

Теперь создаем Edge Function `sync`.

---

## 📋 Шаг 2: Создание Edge Function

### 1. Откройте Edge Functions в Supabase

1. В левом меню Supabase нажмите **"Edge Functions"** (иконка с молнией ⚡)
2. Нажмите **"Create a new function"** (кнопка справа вверху)

### 2. Создайте функцию

1. В поле **"Function name"** введите: `sync` (маленькими буквами)
2. Нажмите **"Create function"**

### 3. Вставьте код

1. Откройте файл `supabase_edge_function_sync.ts` в вашем проекте:
   - В Cursor: найдите файл в списке файлов слева
   - Или откройте: `/Users/mansurusupov/tg-finance-miniapp/supabase_edge_function_sync.ts`

2. **Скопируйте ВЕСЬ код** из файла (Ctrl+A, Ctrl+C)

3. В Supabase Edge Function Editor:
   - Удалите весь код по умолчанию (если есть)
   - Вставьте скопированный код (Ctrl+V или Cmd+V)

4. Нажмите **"Deploy"** (кнопка справа вверху)

5. Должно появиться: **"Function deployed successfully"**

---

## 📝 Весь код Edge Function (на всякий случай):

Если не можете найти файл, вот весь код:

```typescript
// Supabase Edge Function: sync
// Разместите этот код в Supabase Edge Functions → Create function → sync

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("BOT_TOKEN");
const CHANNEL_ID = Deno.env.get("TELEGRAM_CHANNEL_ID") || Deno.env.get("TELEGRAM_CHANNEL_USERNAME");

// Проверка initData от Telegram (HMAC-SHA256)
async function verifyInitData(initData: string): Promise<{ user_id: number } | null> {
  if (!BOT_TOKEN) return null;

  try {
    // Парсим initData (формат: key=value&key2=value2&hash=...)
    const params = new URLSearchParams(initData);
    const receivedHash = params.get("hash");
    if (!receivedHash) return null;

    // Создаем data-check-string (все параметры кроме hash, отсортированные, через \n)
    params.delete("hash");
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    // Шаг 1: Вычисляем secret_key = HMAC-SHA256(bot_token, "WebAppData")
    const webAppDataKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const secretKeyBuffer = await crypto.subtle.sign(
      "HMAC",
      webAppDataKey,
      new TextEncoder().encode(BOT_TOKEN)
    );

    // Шаг 2: Вычисляем hash = HMAC-SHA256(secret_key, data-check-string)
    const secretKey = await crypto.subtle.importKey(
      "raw",
      secretKeyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const calculatedHashBuffer = await crypto.subtle.sign(
      "HMAC",
      secretKey,
      new TextEncoder().encode(dataCheckString)
    );

    // Конвертируем в hex для сравнения
    const calculatedHash = Array.from(new Uint8Array(calculatedHashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Сравниваем hash
    if (calculatedHash !== receivedHash) {
      console.error("Hash mismatch");
      return null;
    }

    // Извлекаем user_id
    const userStr = params.get("user");
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return { user_id: user.id };
  } catch (e) {
    console.error("Verify error:", e);
    return null;
  }
}

// Проверка подписки на канал
async function checkSubscription(userId: number): Promise<boolean> {
  if (!BOT_TOKEN || !CHANNEL_ID) return false;

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        user_id: userId,
      }),
    });

    const data = await response.json();
    if (!data.ok) return false;

    const status = data.result?.status;
    return status === "member" || status === "administrator" || status === "creator";
  } catch (e) {
    console.error("Subscription check error:", e);
    return false;
  }
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-telegram-init-data",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Получаем initData из заголовка
    const initData = req.headers.get("x-telegram-init-data");
    if (!initData) {
      return new Response(
        JSON.stringify({ error: "Missing x-telegram-init-data header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Проверяем initData и получаем user_id
    const verified = await verifyInitData(initData);
    if (!verified) {
      return new Response(
        JSON.stringify({ error: "Invalid initData" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id } = verified;

    // Проверяем подписку на канал
    const isSubscriber = await checkSubscription(user_id);
    if (!isSubscriber) {
      return new Response(
        JSON.stringify({ error: "User is not subscribed to the channel", code: "NOT_SUBSCRIBED" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Обновляем информацию о пользователе
    await supabaseClient
      .from("users")
      .upsert({
        telegram_user_id: user_id,
        is_subscriber: true,
        subscriber_checked_at: new Date().toISOString(),
      }, { onConflict: "telegram_user_id" });

    // GET: загрузка данных
    if (req.method === "GET") {
      const { data, error } = await supabaseClient
        .from("user_data")
        .select("key, value")
        .eq("telegram_user_id", user_id);

      if (error) throw error;

      // Преобразуем в формат { accounts: [...], transactions: [...], ... }
      const result = {};
      const keys = ["accounts", "transactions", "currencies", "expense_plan", "closed_months", "balance_checks", "expense_categories", "income_categories"];
      
      for (const key of keys) {
        const item = data?.find((d) => d.key === key);
        result[key] = item ? item.value : null;
      }

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: сохранение данных
    if (req.method === "POST") {
      const body = await req.json();
      const keys = ["accounts", "transactions", "currencies", "expense_plan", "closed_months", "balance_checks", "expense_categories", "income_categories"];

      const updates = [];
      for (const key of keys) {
        if (body[key] !== undefined) {
          updates.push({
            telegram_user_id: user_id,
            key,
            value: body[key],
          });
        }
      }

      if (updates.length > 0) {
        const { error } = await supabaseClient
          .from("user_data")
          .upsert(updates, { onConflict: "telegram_user_id,key" });

        if (error) throw error;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## ✅ Проверка:

После деплоя должно появиться:
- ✅ **"Function deployed successfully"**
- ✅ Функция `sync` видна в списке Edge Functions

---

## 📝 Что дальше?

После создания Edge Function переходите к **Шагу 3: Добавление секретов**.
