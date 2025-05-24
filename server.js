// Перенаправление для совместимости с Render.com
import('./dist/index.js').catch(() => {
  // Fallback если dist не найден
  import('./server/index.js');
});