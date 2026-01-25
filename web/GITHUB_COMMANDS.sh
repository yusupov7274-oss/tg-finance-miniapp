#!/bin/bash

# Команды для загрузки на GitHub
# Выполните их по порядку в терминале

echo "🚀 Загрузка проекта на GitHub..."
echo ""

# Переходим в папку с файлами
cd /Users/mansurusupov/tg-finance-miniapp/web/dist

# Инициализируем Git
echo "📦 Инициализация Git..."
git init

# Добавляем все файлы
echo "📝 Добавление файлов..."
git add .

# Создаем коммит
echo "💾 Создание коммита..."
git commit -m "Initial commit: Telegram Finance Mini App"

# Добавляем удаленный репозиторий
echo "🔗 Подключение к GitHub..."
git remote add origin https://github.com/yusupov7274-oss/tg-finance-app.git

# Переименовываем ветку
echo "🌿 Настройка ветки..."
git branch -M main

# Отправляем на GitHub
echo "⬆️  Отправка на GitHub..."
git push -u origin main

echo ""
echo "✅ Готово! Файлы загружены на GitHub!"
echo ""
echo "📋 Следующий шаг:"
echo "1. Откройте репозиторий: https://github.com/yusupov7274-oss/tg-finance-app"
echo "2. Перейдите в Settings → Pages"
echo "3. Source: Branch 'main', Folder '/ (root)'"
echo "4. Сохраните и получите URL: https://yusupov7274-oss.github.io/tg-finance-app/"
