# Развертывание на GitHub Pages

## Шаг 1: Создайте репозиторий на GitHub

1. Откройте https://github.com и войдите
2. Нажмите **"+"** → **"New repository"**
3. Заполните:
   - **Repository name**: `tg-finance-app` (или любое другое)
   - **Description**: Telegram Mini App для управления личными финансами
   - Выберите **Public** (обязательно для бесплатного GitHub Pages)
   - **НЕ** ставьте галочки на "Add a README file", "Add .gitignore", "Choose a license"
4. Нажмите **"Create repository"**

## Шаг 2: Загрузите файлы на GitHub

Выполните команды в терминале:

```bash
# 1. Перейдите в папку с собранными файлами
cd /Users/mansurusupov/tg-finance-miniapp/web/dist

# 2. Инициализируйте Git (если еще не инициализирован)
git init

# 3. Добавьте все файлы
git add .

# 4. Создайте первый коммит
git commit -m "Initial commit: Telegram Finance Mini App"

# 5. Добавьте удаленный репозиторий (ЗАМЕНИТЕ YOUR_USERNAME на ваш GitHub username!)
git remote add origin https://github.com/YOUR_USERNAME/tg-finance-app.git

# 6. Переименуйте ветку в main
git branch -M main

# 7. Отправьте файлы на GitHub
git push -u origin main
```

**Важно:** Замените `YOUR_USERNAME` на ваш реальный GitHub username!

## Шаг 3: Включите GitHub Pages

1. Откройте ваш репозиторий на GitHub
2. Перейдите в **Settings** (вкладка вверху)
3. В левом меню найдите **Pages**
4. В разделе **Source**:
   - Выберите **Branch**: `main`
   - Выберите **Folder**: `/ (root)`
5. Нажмите **Save**

## Шаг 4: Получите URL

1. Подождите 1-2 минуты
2. Обновите страницу Settings → Pages
3. Вы увидите URL вида: `https://YOUR_USERNAME.github.io/tg-finance-app/`
4. **Скопируйте этот URL!**

## Шаг 5: Настройте в @BotFather

1. Откройте **@BotFather** в Telegram
2. Отправьте команду `/myapps`
3. Выберите ваше приложение `myfinance`
4. Отправьте команду для редактирования или используйте `/newapp` заново
5. Когда бот спросит про **Web App URL**, вставьте URL из GitHub Pages:
   ```
   https://YOUR_USERNAME.github.io/tg-finance-app/
   ```
   **Важно:** URL должен заканчиваться на `/` (слеш)!

## Обновление приложения

Когда вы внесете изменения:

```bash
cd /Users/mansurusupov/tg-finance-miniapp/web

# Пересобрать проект
npm run build

# Перейти в папку dist
cd dist

# Обновить на GitHub
git add .
git commit -m "Update app"
git push
```

GitHub Pages автоматически обновится через 1-2 минуты.

## Структура файлов

В репозитории должны быть (в корне):
- `index.html`
- `vite.svg`
- Папка `assets/` с файлами:
  - `index-*.js`
  - `index-*.css`
