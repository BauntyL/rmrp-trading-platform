// Запуск сервера для Render.com через tsx
import { spawn } from 'child_process';

const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

server.on('error', (err) => {
  console.error('Ошибка запуска сервера:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  process.exit(code);
});