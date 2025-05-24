// Запуск сервера для Render.com
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Загружаем tsx для выполнения TypeScript
require('tsx/cjs');

// Запускаем основной сервер
import('./server/index.ts');