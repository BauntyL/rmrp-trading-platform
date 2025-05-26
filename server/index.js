const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const { initializeDatabase } = require('./db');
const { initializeAuth } = require('./auth');

const app = express();
const PORT = process.env.PORT || 10000;

// Инициализация базы данных
initializeDatabase().then(() => {
  console.log('✅ Database initialized successfully');
}).catch(err => {
  console.error('❌ Database initialization failed:', err);
  process.exit(1);
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка сессий
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Инициализация аутентификации
initializeAuth();
app.use(passport.initialize());
app.use(passport.session());

// Статические файлы
console.log('📁 Setting up static files middleware...');
app.use(express.static(path.join(__dirname, '../public')));

// Middleware для логирования запросов
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.url}`);
  next();
});

// API routes
const routes = require('./routes');
app.use('/api', routes);

console.log('✅ All routes registered successfully');

// SPA fallback - отдаем index.html для всех неизвестных маршрутов
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
  console.log(`📊 Database connected: PostgreSQL`);
});

module.exports = app;
