/**
 * Единый слой хранилища: Supabase API + localStorage (кэш) + Telegram Cloud Storage (fallback).
 * Приоритет:
 * 1. Supabase API (серверное хранилище, синхронизация между устройствами)
 * 2. localStorage (быстрый доступ, офлайн-режим)
 * 3. Telegram Cloud Storage (fallback, если Supabase недоступен)
 * 
 * Офлайн-first: приложение работает даже без сети, синхронизирует при подключении.
 */

import * as api from './api.js';

const PREFIX = 'finance_';
const MAX_VALUE_LEN = 4000;
const CHUNK_META = '_chunks';
const SYNC_FLAG = '_sync_pending';

// Флаг для отслеживания синхронизации (чтобы не блокировать UI)
let syncInProgress = false;
let syncQueue = new Set();

function hasCloudStorage() {
  return typeof window !== 'undefined' && window.Telegram?.WebApp?.CloudStorage;
}

function cloudSetItem(key, value) {
  return new Promise((resolve, reject) => {
    if (!hasCloudStorage()) {
      reject(new Error('CloudStorage not available'));
      return;
    }
    window.Telegram.WebApp.CloudStorage.setItem(key, value, (err, ok) => {
      if (err) reject(err);
      else resolve(ok);
    });
  });
}

function cloudGetItem(key) {
  return new Promise((resolve, reject) => {
    if (!hasCloudStorage()) {
      reject(new Error('CloudStorage not available'));
      return;
    }
    window.Telegram.WebApp.CloudStorage.getItem(key, (err, value) => {
      if (err) reject(err);
      else resolve(value ?? '');
    });
  });
}

function cloudGetItems(keys) {
  return new Promise((resolve, reject) => {
    if (!hasCloudStorage()) {
      reject(new Error('CloudStorage not available'));
      return;
    }
    window.Telegram.WebApp.CloudStorage.getItems(keys, (err, obj) => {
      if (err) reject(err);
      else resolve(obj ?? {});
    });
  });
}

function cloudRemoveItem(key) {
  return new Promise((resolve, reject) => {
    if (!hasCloudStorage()) {
      reject(new Error('CloudStorage not available'));
      return;
    }
    window.Telegram.WebApp.CloudStorage.removeItem(key, (err, ok) => {
      if (err) reject(err);
      else resolve(ok);
    });
  });
}

/**
 * Сохранить значение.
 * Приоритет: localStorage (сразу) → Supabase API (фоновая синхронизация) → Cloud Storage (fallback).
 */
export async function setItem(key, value) {
  const k = PREFIX + key;
  const str = typeof value === 'string' ? value : JSON.stringify(value);

  // 1. Сохраняем в localStorage сразу (офлайн-first)
  localStorage.setItem(k, str);

  // 2. Пытаемся синхронизировать с Supabase (в фоне, не блокируем UI)
  if (api.isApiAvailable() && api.isTelegramMiniApp()) {
    syncQueue.add(key);
    scheduleSync();
  }

  // 3. Fallback: Cloud Storage (если Supabase недоступен)
  if (!hasCloudStorage()) return;

  try {
    if (str.length <= MAX_VALUE_LEN) {
      await cloudSetItem(k, str);
      await cloudRemoveItem(k + CHUNK_META).catch(() => {});
      for (let i = 0; ; i++) {
        const ok = await cloudRemoveItem(`${k}_${i}`).catch(() => false);
        if (!ok) break;
      }
    } else {
      const chunks = [];
      for (let i = 0; i < str.length; i += MAX_VALUE_LEN) {
        chunks.push(str.slice(i, i + MAX_VALUE_LEN));
      }
      await cloudSetItem(k + CHUNK_META, String(chunks.length));
      for (let i = 0; i < chunks.length; i++) {
        await cloudSetItem(`${k}_${i}`, chunks[i]);
      }
      await cloudRemoveItem(k).catch(() => {});
    }
  } catch (e) {
    console.warn('CloudStorage setItem failed:', key, e);
  }
}

/**
 * Прочитать значение.
 * Приоритет: localStorage (быстро) → Supabase API → Cloud Storage (fallback).
 */
export async function getItem(key) {
  const k = PREFIX + key;
  const fromLocal = localStorage.getItem(k);

  // Если есть в localStorage, возвращаем сразу (быстро)
  if (fromLocal) {
    try {
      return JSON.parse(fromLocal);
    } catch {
      return fromLocal;
    }
  }

  // Пытаемся загрузить с Supabase (если доступен)
  if (api.isApiAvailable() && api.isTelegramMiniApp()) {
    try {
      const allData = await api.loadFromServer();
      if (allData && allData[key] !== undefined) {
        const value = allData[key];
        // Кэшируем в localStorage
        localStorage.setItem(k, typeof value === 'string' ? value : JSON.stringify(value));
        return value;
      }
    } catch (e) {
      console.warn('Failed to load from server:', key, e);
    }
  }

  // Fallback: Cloud Storage
  if (!hasCloudStorage()) return null;

  try {
    const meta = await cloudGetItem(k + CHUNK_META);
    if (meta && /^\d+$/.test(meta)) {
      const n = parseInt(meta, 10);
      const chunkKeys = [];
      for (let i = 0; i < n; i++) chunkKeys.push(`${k}_${i}`);
      const obj = await cloudGetItems(chunkKeys);
      const parts = [];
      for (let i = 0; i < n; i++) {
        const v = obj[`${k}_${i}`];
        if (v) parts.push(v);
      }
      const out = parts.join('');
      try {
        const parsed = JSON.parse(out);
        // Кэшируем в localStorage
        localStorage.setItem(k, out);
        return parsed;
      } catch {
        return out;
      }
    }
    const cloud = await cloudGetItem(k);
    if (cloud) {
      try {
        const parsed = JSON.parse(cloud);
        // Кэшируем в localStorage
        localStorage.setItem(k, cloud);
        return parsed;
      } catch {
        return cloud;
      }
    }
  } catch (e) {
    console.warn('CloudStorage getItem failed:', key, e);
  }

  return null;
}

/**
 * Синхронное чтение из localStorage (для быстрого старта UI).
 */
export function getItemSync(key) {
  const k = PREFIX + key;
  const v = localStorage.getItem(k);
  if (v == null) return null;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

/**
 * Загрузить все ключи: с сервера (Supabase) → localStorage → Cloud Storage.
 * При наличии сервера обновляет localStorage для офлайн-доступа.
 */
export async function loadAllFromCloud() {
  const keys = [
    'accounts', 'transactions', 'currencies', 'expense_plan',
    'closed_months', 'balance_checks', 'expense_categories', 'income_categories'
  ];

  // Пытаемся загрузить с Supabase (если доступен)
  if (api.isApiAvailable() && api.isTelegramMiniApp()) {
    try {
      const serverData = await api.loadFromServer();
      if (serverData) {
        // Обновляем localStorage из сервера
        for (const key of keys) {
          if (serverData[key] !== undefined && serverData[key] !== null) {
            const k = PREFIX + key;
            localStorage.setItem(k, typeof serverData[key] === 'string' 
              ? serverData[key] 
              : JSON.stringify(serverData[key]));
          }
        }
        return serverData;
      }
    } catch (e) {
      console.warn('Failed to load from server, using local cache:', e);
      // Продолжаем с localStorage/Cloud Storage
    }
  }

  // Fallback: загружаем из localStorage или Cloud Storage
  const result = {};
  for (const key of keys) {
    const v = await getItem(key);
    result[key] = v;
  }

  return result;
}

/**
 * Сохранить всё на сервер (Supabase) или в Cloud Storage (fallback).
 */
export async function saveAllToCloud(data) {
  const keys = [
    'accounts', 'transactions', 'currencies', 'expense_plan',
    'closed_months', 'balance_checks', 'expense_categories', 'income_categories'
  ];

  // Пытаемся сохранить на Supabase (если доступен)
  if (api.isApiAvailable() && api.isTelegramMiniApp()) {
    try {
      const dataToSave = {};
      for (const key of keys) {
        if (data[key] !== undefined) {
          dataToSave[key] = data[key];
        }
      }
      await api.saveToServer(dataToSave);
      return;
    } catch (e) {
      console.warn('Failed to save to server, using Cloud Storage:', e);
      // Продолжаем с Cloud Storage
    }
  }

  // Fallback: Cloud Storage
  for (const key of keys) {
    const v = data[key];
    if (v !== undefined) await setItem(key, v);
  }
}

/**
 * Есть ли облачное хранилище (Mini App).
 */
export function isCloudAvailable() {
  return hasCloudStorage();
}

/**
 * Фоновая синхронизация с сервером (не блокирует UI).
 */
async function scheduleSync() {
  if (syncInProgress || syncQueue.size === 0) return;
  
  syncInProgress = true;
  
  try {
    // Собираем все данные из localStorage
    const keys = [
      'accounts', 'transactions', 'currencies', 'expense_plan',
      'closed_months', 'balance_checks', 'expense_categories', 'income_categories'
    ];
    
    const dataToSync = {};
    for (const key of keys) {
      if (syncQueue.has(key)) {
        const k = PREFIX + key;
        const v = localStorage.getItem(k);
        if (v) {
          try {
            dataToSync[key] = JSON.parse(v);
          } catch {
            dataToSync[key] = v;
          }
        }
      }
    }

    if (Object.keys(dataToSync).length > 0) {
      await api.saveToServer(dataToSync);
      syncQueue.clear();
    }
  } catch (e) {
    console.warn('Background sync failed:', e);
    // Ошибка не критична, данные уже в localStorage
  } finally {
    syncInProgress = false;
    
    // Если есть еще элементы в очереди, повторим через 2 секунды
    if (syncQueue.size > 0) {
      setTimeout(() => scheduleSync(), 2000);
    }
  }
}
