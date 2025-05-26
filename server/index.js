const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');

const app = express();
const PORT = process.env.PORT || 10000;

// ПРОВЕРЯЕМ И ИНИЦИАЛИЗИРУЕМ БД
try {
  const db = require('./db');
  if (db && db.initializeDatabase) {
    db.initializeDatabase().then(() => {
      console.log('✅ Database initialized successfully');
    }).catch(err => {
      console.error('❌ Database initialization failed:', err);
    });
  } else {
    console.log('⚠️ Database initialization function not found, continuing...');
  }
} catch (err) {
  console.log('⚠️ Database module not found, continuing...');
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка сессий
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// ПРОВЕРЯЕМ И ИНИЦИАЛИЗИРУЕМ AUTH
try {
  const auth = require('./auth');
  if (auth && auth.initializeAuth) {
    auth.initializeAuth();
    console.log('✅ Auth initialized successfully');
  } else {
    console.log('⚠️ Auth initialization function not found, continuing...');
  }
} catch (err) {
  console.log('⚠️ Auth module not found, continuing...');
}

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
