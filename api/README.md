# Backend API для TG Finance

Express API для Telegram WebApp учёта личных финансов.

## Запуск локально

```bash
npm install
npm run dev
```

## Переменные окружения

- `PORT` — порт сервера (Railway задаёт автоматически)
- `CORS_ORIGIN` — дополнительный origin для CORS (через запятую)

## Деплой на Railway

1. Создайте проект на Railway
2. Подключите репозиторий
3. Укажите **Root Directory**: `api`
4. Railway автоматически определит Node.js и выполнит `npm install` + `npm start`
5. Добавьте переменную `CORS_ORIGIN` при необходимости (домен Vercel)

## Эндпоинты

- `GET /health` — проверка работоспособности
