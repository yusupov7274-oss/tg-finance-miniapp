#!/bin/bash

# Скрипт для загрузки приложения на GitHub Pages

echo "🚀 Подготовка к загрузке на GitHub Pages..."
echo ""

# Переходим в папку dist
cd dist

# Инициализируем Git (если еще не инициализирован)
if [ ! -d ".git" ]; then
    echo "📦 Инициализация Git..."
    git init
fi

# Добавляем все файлы
echo "📝 Добавление файлов..."
git add .

# Коммит
echo "💾 Создание коммита..."
git commit -m "Deploy Telegram Finance Mini App" || echo "Нет изменений для коммита"

echo ""
echo "✅ Готово!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Создайте репозиторий на GitHub (github.com → New repository)"
echo "2. Выполните команды (замените YOUR_USERNAME на ваш GitHub username):"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/tg-finance-app.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. В настройках репозитория включите GitHub Pages (Settings → Pages)"
echo "4. Выберите branch: main, folder: / (root)"
echo "5. Скопируйте URL и используйте его в @BotFather"
