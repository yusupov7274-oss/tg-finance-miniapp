/**
 * API клиент для Supabase Edge Function.
 * Обрабатывает проверку подписки, загрузку и сохранение данных.
 * Работает офлайн: использует localStorage как кэш, синхронизирует при наличии сети.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Проверка доступности Telegram WebApp
function getInitData() {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
    return window.Telegram.WebApp.initData;
  }
  return null;
}

// Проверка доступности API
function isApiAvailable() {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// Проверка доступности Telegram Mini App
function isTelegramMiniApp() {
  return typeof window !== 'undefined' && window.Telegram?.WebApp;
}

/**
 * Загрузить данные с сервера.
 * @returns {Promise<Object>} Данные пользователя или null при ошибке
 */
export async function loadFromServer() {
  if (!isApiAvailable()) {
    console.warn('API not configured');
    return null;
  }

  const initData = getInitData();
  if (!initData) {
    console.warn('Telegram initData not available');
    return null;
  }

  try {
    // Таймаут 10 секунд, чтобы не зависать
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/sync`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'x-telegram-init-data': initData,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      if (error.code === 'NOT_SUBSCRIBED') {
        throw new Error('NOT_SUBSCRIBED');
      }
      
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to load from server:', error);
    throw error;
  }
}

/**
 * Сохранить данные на сервер.
 * @param {Object} data - Данные для сохранения
 * @returns {Promise<boolean>} Успешно ли сохранено
 */
export async function saveToServer(data) {
  if (!isApiAvailable()) {
    console.warn('API not configured');
    return false;
  }

  const initData = getInitData();
  if (!initData) {
    console.warn('Telegram initData not available');
    return false;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'x-telegram-init-data': initData,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      if (error.code === 'NOT_SUBSCRIBED') {
        throw new Error('NOT_SUBSCRIBED');
      }
      
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Failed to save to server:', error);
    throw error;
  }
}

/**
 * Проверить, доступен ли сервер.
 * @returns {Promise<boolean>}
 */
export async function checkServerAvailable() {
  if (!isApiAvailable()) return false;
  
  try {
    const initData = getInitData();
    if (!initData) return false;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/sync`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'x-telegram-init-data': initData,
      },
    });

    return response.ok || response.status === 403; // 403 = не подписан, но сервер работает
  } catch {
    return false;
  }
}

/**
 * Проверить, является ли пользователь подписчиком канала.
 * @returns {Promise<boolean>}
 */
export async function checkSubscription() {
  try {
    await loadFromServer();
    return true;
  } catch (error) {
    if (error.message === 'NOT_SUBSCRIBED') {
      return false;
    }
    // Другие ошибки (сеть, сервер) — считаем, что подписка не проверена
    return null;
  }
}

export { isApiAvailable, isTelegramMiniApp };
