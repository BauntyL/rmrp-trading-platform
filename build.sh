#!/bin/bash
echo "Начинаем сборку проекта..."

echo "1. Установка зависимостей..."
npm install

echo "2. Сборка фронтенда..."
npm run build

echo "3. Проверяем результат сборки..."
if [ -d "dist" ]; then
    echo "✅ Фронтенд собран успешно!"
    ls -la dist/
else
    echo "❌ Ошибка: папка dist не создана"
    exit 1
fi

echo "🎉 Сборка завершена успешно!"