const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 10000;

// РУЧНОЙ CORS (без пакета cors)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  
  // Обработка preflight запросов
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// ИСПРАВЛЕННАЯ ИНИЦИАЛИЗАЦИЯ БД
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    const storage = require('./storage-fixed');
    await storage.initializeDatabase();
    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ Failed to initialize database:', err);
    // НЕ останавливаем сервер, просто логируем ошибку
  }
}

// Запускаем инициализацию БД
initializeDatabase();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ИСПРАВЛЕННАЯ НАСТРОЙКА СЕССИЙ
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here-12345',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: false, // ИЗМЕНЯЕМ НА false для отладки
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax' // ДОБАВЛЯЕМ sameSite
  },
  name: 'connect.sid'
}));

// MIDDLEWARE ДЛЯ ОТЛАДКИ СЕССИЙ
app.use((req, res, next) => {
  console.log('🔍 Session middleware - Session ID:', req.sessionID);
  console.log('🔍 Session data before request:', req.session);
  next();
});

// Статические файлы
console.log('📁 Setting up static files middleware...');
app.use(express.static(path.join(__dirname, '../public')));

// Middleware для логирования запросов
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.url}`);
  console.log('🍪 Cookies:', req.headers.cookie);
  next();
});

// API routes
try {
  const routes = require('./routes');
  app.use('/api', routes);
  console.log('✅ All routes registered successfully');
} catch (err) {
  console.error('❌ Failed to load routes:', err);
}

// SPA fallback
app.get('*', (req, res) => {
  console.log('📝 Serving SPA for route:', req.path);
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API available at http://localhost:${PORT}/api/`);
  console.log(`📊 Ready to serve requests`);
});

module.exports = app;
