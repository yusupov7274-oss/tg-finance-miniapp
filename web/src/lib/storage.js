/**
 * Единый слой хранилища: Telegram Cloud Storage + localStorage.
 * В Mini App — облако Telegram (синхронизация между устройствами).
 * Вне Mini App — localStorage.
 * Лимит Cloud Storage: 4096 символов на значение → разбиение на чанки.
 */

const MAX_VALUE_LEN = 4000;
const PREFIX = 'finance_';
const CHUNK_META = '_chunks';

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
 * Сохранить значение. Если > MAX_VALUE_LEN — разбить на чанки.
 */
export async function setItem(key, value) {
  const k = PREFIX + key;
  const str = typeof value === 'string' ? value : JSON.stringify(value);

  localStorage.setItem(k, str);

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
 * Прочитать значение. Поддержка чанков.
 */
export async function getItem(key) {
  const k = PREFIX + key;
  const fromLocal = localStorage.getItem(k);

  if (!hasCloudStorage()) {
    if (fromLocal) {
      try {
        return JSON.parse(fromLocal);
      } catch {
        return fromLocal;
      }
    }
    return null;
  }

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
        return JSON.parse(out);
      } catch {
        return out;
      }
    }
    const cloud = await cloudGetItem(k);
    if (cloud) {
      try {
        return JSON.parse(cloud);
      } catch {
        return cloud;
      }
    }
  } catch (e) {
    console.warn('CloudStorage getItem failed:', key, e);
  }

  if (fromLocal) {
    try {
      return JSON.parse(fromLocal);
    } catch {
      return fromLocal;
    }
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
 * Загрузить все ключи: из облака (Mini App) или из localStorage.
 * При наличии облака обновляет localStorage для офлайн-доступа.
 */
export async function loadAllFromCloud() {
  const keys = [
    'accounts', 'transactions', 'currencies', 'expense_plan',
    'closed_months', 'balance_checks', 'expense_categories', 'income_categories'
  ];

  const result = {};
  for (const key of keys) {
    const v = await getItem(key);
    result[key] = v;
    const k = PREFIX + key;
    if (v != null && hasCloudStorage()) {
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }
  return result;
}

/**
 * Сохранить всё из localStorage в облако (миграция или принудительная синхронизация).
 */
export async function saveAllToCloud(data) {
  const keys = [
    'accounts', 'transactions', 'currencies', 'expense_plan',
    'closed_months', 'balance_checks', 'expense_categories', 'income_categories'
  ];

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
