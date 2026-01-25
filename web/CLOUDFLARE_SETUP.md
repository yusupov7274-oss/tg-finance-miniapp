# Настройка Cloudflare Pages для Telegram Mini App

## Преимущества Cloudflare Pages:
- ✅ Бесплатно
- ✅ Быстрая загрузка (CDN по всему миру)
- ✅ Автоматический HTTPS
- ✅ Простая настройка
- ✅ Можно подключить GitHub для автоматического деплоя

## Шаг 1: Создание аккаунта Cloudflare

1. Откройте https://pages.cloudflare.com
2. Нажмите **"Sign up"** или **"Log in"**
3. Войдите или зарегистрируйтесь (можно через GitHub)

## Шаг 2: Создание проекта

1. После входа нажмите **"Create a project"**
2. Выберите **"Upload assets"** (загрузка файлов напрямую)
3. Или выберите **"Connect to Git"** (если хотите автоматический деплой из GitHub)

## Вариант A: Прямая загрузка (быстрый способ)

1. Нажмите **"Upload assets"**
2. Перетащите **все файлы из папки `dist`** в окно загрузки
   - Или нажмите "Select files" и выберите все файлы из папки `dist`
3. Заполните:
   - **Project name**: `tg-finance-app` (или любое другое)
4. Нажмите **"Deploy site"**
5. Подождите 1-2 минуты
6. Получите URL вида: `https://tg-finance-app.pages.dev`

## Вариант B: Через GitHub (рекомендуется для обновлений)

### 2.1. Сначала загрузите на GitHub (если еще не сделали):

```bash
cd /Users/mansurusupov/tg-finance-miniapp/web/dist
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/tg-finance-app.git
git branch -M main
git push -u origin main
```

### 2.2. Подключите GitHub к Cloudflare:

1. В Cloudflare Pages выберите **"Connect to Git"**
2. Авторизуйтесь через GitHub
3. Выберите репозиторий `tg-finance-app`
4. Настройки сборки:
   - **Framework preset**: None (или Vite)
   - **Build command**: `npm run build` (если используете исходники)
   - **Build output directory**: `dist`
   - **Root directory**: `/web` (если репозиторий содержит папку web)
   
   **ИЛИ** если загружаете только папку dist:
   - **Framework preset**: None
   - **Build command**: (оставьте пустым)
   - **Build output directory**: `/` (root)
   - **Root directory**: `/` (root)

5. Нажмите **"Save and Deploy"**

## Шаг 3: Получение URL

После деплоя:
1. Cloudflare автоматически создаст URL вида: `https://tg-finance-app.pages.dev`
2. Вы также можете настроить кастомный домен (опционально)
3. **Скопируйте этот URL** - он понадобится для @BotFather

## Шаг 4: Настройка в @BotFather

1. Откройте **@BotFather** в Telegram
2. Отправьте команду `/newapp`
3. Выберите вашего бота
4. Заполните:
   - **Title**: Личные финансы
   - **Short name**: finance
   - **Description**: Приложение для управления личными финансами
   - **Web App URL**: вставьте URL из Cloudflare Pages (например: `https://tg-finance-app.pages.dev`)
5. Сохраните изменения

## Обновление приложения

### Если использовали прямую загрузку:
- Просто загрузите новые файлы через интерфейс Cloudflare Pages

### Если использовали GitHub:
- Изменения будут деплоиться автоматически при каждом push в репозиторий
- Или можно запустить деплой вручную в панели Cloudflare

## Преимущества Cloudflare Pages перед GitHub Pages:

- ✅ Быстрее загружается (CDN)
- ✅ Больше возможностей настройки
- ✅ Лучшая производительность
- ✅ Можно использовать кастомный домен бесплатно
