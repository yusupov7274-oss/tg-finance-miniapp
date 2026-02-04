import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import { pool } from './db.js';

const app = express();
const BOT_TOKEN = process.env.BOT_TOKEN;
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// CORS: разрешаем запросы с Vercel и локальной разработки
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    try {
      const host = new URL(origin).hostname;
      const isVercel = host.endsWith('.vercel.app');
      const isLocal =
        host === 'localhost' ||
        host === '127.0.0.1';
      const customOrigins = (process.env.CORS_ORIGIN || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const isCustom = customOrigins.includes(origin);
      if (isVercel || isLocal || isCustom) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } catch {
      callback(new Error('Invalid origin'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/db/health', async (_req, res) => {
  try {
    await pool.query('select 1 as ok');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

function validateTelegramInitData(initData) {
  if (!initData || typeof initData !== 'string' || !initData.trim()) {
    return { valid: false, reason: 'missing' };
  }
  const params = new URLSearchParams(initData.trim());
  const hash = params.get('hash');
  const authDate = params.get('auth_date');
  if (!hash || !authDate) {
    return { valid: false, reason: 'format' };
  }
  const authTimestamp = parseInt(authDate, 10);
  if (Number.isNaN(authTimestamp)) {
    return { valid: false, reason: 'format' };
  }
  const maxAge = 24 * 60 * 60;
  if (Math.abs(Date.now() / 1000 - authTimestamp) > maxAge) {
    return { valid: false, reason: 'expired' };
  }
  const dataCheckParts = [];
  for (const key of params.keys()) {
    if (key === 'hash') continue;
    dataCheckParts.push(`${key}=${params.get(key)}`);
  }
  dataCheckParts.sort();
  const dataCheckString = dataCheckParts.join('\n');
  const secretKey = crypto.createHash('sha256').update(BOT_TOKEN, 'utf8').digest();
  const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString, 'utf8').digest('hex');
  const hashBuf = Buffer.from(hash, 'hex');
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  if (hashBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(hashBuf, expectedBuf)) {
    return { valid: false, reason: 'signature' };
  }
  const userRaw = params.get('user');
  if (!userRaw) {
    return { valid: false, reason: 'format' };
  }
  let user;
  try {
    user = JSON.parse(decodeURIComponent(userRaw));
  } catch {
    return { valid: false, reason: 'format' };
  }
  if (!user || typeof user.id !== 'number') {
    return { valid: false, reason: 'format' };
  }
  return { valid: true, user };
}

app.post('/auth/telegram', async (req, res) => {
  const initData = req.body?.initData;
  if (!initData) {
    return res.status(400).json({ ok: false, error: 'initData required' });
  }
  if (!BOT_TOKEN) {
    return res.status(500).json({ ok: false, error: 'Server misconfiguration' });
  }
  const result = validateTelegramInitData(initData);
  if (!result.valid) {
    if (result.reason === 'missing' || result.reason === 'format') {
      return res.status(400).json({ ok: false, error: 'Invalid initData' });
    }
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  const { user: tgUser } = result;
  try {
    const upsert = await pool.query(
      `INSERT INTO users (tg_user_id, username, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tg_user_id) DO UPDATE SET
         username = EXCLUDED.username,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         updated_at = now()
       RETURNING id, tg_user_id, username, first_name, last_name`,
      [
        tgUser.id,
        tgUser.username ?? null,
        tgUser.first_name ?? null,
        tgUser.last_name ?? null,
      ]
    );
    const row = upsert.rows[0];
    return res.json({
      ok: true,
      user: {
        id: row.id,
        tg_user_id: String(row.tg_user_id),
        username: row.username,
        first_name: row.first_name,
        last_name: row.last_name,
      },
    });
  } catch (err) {
    console.error('Auth DB error:', err);
    return res.status(500).json({ ok: false, error: 'Database error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
