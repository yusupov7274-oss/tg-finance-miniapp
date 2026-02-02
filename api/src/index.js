import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
