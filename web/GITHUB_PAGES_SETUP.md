# Настройка GitHub Pages для Telegram Mini App

## Шаг 1: Создание репозитория на GitHub

1. Откройте [github.com](https://github.com) и войдите в аккаунт
2. Нажмите кнопку **"New"** (или **"+"** → **"New repository"**)
3. Заполните данные:
   - **Repository name**: `tg-finance-app` (или любое другое имя)
   - **Description**: Telegram Mini App для управления личными финансами
   - Выберите **Public** (для бесплатного GitHub Pages)
   - **НЕ** ставьте галочки на "Add a README file", "Add .gitignore", "Choose a license"
4. Нажмите **"Create repository"**

## Шаг 2: Инициализация Git и загрузка файлов

Выполните следующие команды в терминале:

```bash
cd /Users/mansurusupov/tg-finance-miniapp/web
```

### Если Git еще не инициализирован:

```bash
# Инициализация Git
git init

# Добавление файлов из папки dist
git add dist/*

# Первый коммит
git commit -m "Initial commit: Telegram Finance Mini App"

# Добавление удаленного репозитория (замените YOUR_USERNAME на ваш GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/tg-finance-app.git

# Отправка файлов на GitHub
git branch -M main
git push -u origin main
```

### Если Git уже инициализирован:

```bash
# Перейдите в папку dist
cd dist

# Инициализация Git (если нужно)
git init

# Добавление всех файлов
git add .

# Коммит
git commit -m "Deploy Telegram Finance Mini App"

# Добавление удаленного репозитория (замените YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/tg-finance-app.git

# Отправка на GitHub
git branch -M main
git push -u origin main
```

## Шаг 3: Настройка GitHub Pages

1. Откройте ваш репозиторий на GitHub
2. Перейдите в **Settings** (Настройки)
3. В левом меню найдите **Pages**
4. В разделе **Source** выберите:
   - **Branch**: `main`
   - **Folder**: `/ (root)` или `/dist` (в зависимости от того, где находятся файлы)
5. Нажмите **Save**

## Шаг 4: Получение URL

После сохранения настроек GitHub Pages:
1. Подождите 1-2 минуты
2. Обновите страницу Settings → Pages
3. Вы увидите URL вида: `https://YOUR_USERNAME.github.io/tg-finance-app/`
4. **Скопируйте этот URL** - он понадобится для настройки в Telegram

## Шаг 5: Настройка в @BotFather

1. Откройте **@BotFather** в Telegram
2. Отправьте команду `/newapp`
3. Выберите вашего бота
4. Заполните данные:
   - **Title**: Личные финансы
   - **Short name**: finance
   - **Description**: Приложение для управления личными финансами
   - **Web App URL**: вставьте URL из GitHub Pages (например: `https://YOUR_USERNAME.github.io/tg-finance-app/`)
5. Сохраните изменения

## Важно!

- Убедитесь, что URL заканчивается на `/` (слеш)
- GitHub Pages работает только с публичными репозиториями (бесплатно)
- Изменения могут появиться через 1-2 минуты после загрузки

## Обновление приложения

Когда вы внесете изменения в код:

```bash
cd /Users/mansurusupov/tg-finance-miniapp/web

# Пересобрать проект
npm run build

# Перейти в папку dist
cd dist

# Добавить изменения
git add .

# Коммит
git commit -m "Update app"

# Отправить на GitHub
git push
```

После этого GitHub Pages автоматически обновится через 1-2 минуты.
