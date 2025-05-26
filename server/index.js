const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 10000;

// ПРЯМАЯ ИНИЦИАЛИЗАЦИЯ БД
try {
  const db = require('./db');
  console.log('🔄 Initializing database...');
  
  // ВЫЗЫВАЕМ initDb НАПРЯМУЮ
  if (db.initDb) {
    db.initDb();
    console.log('✅ Database initialized successfully');
  } else if (db.initializeDatabase) {
    db.initializeDatabase().then(() => {
      console.log('✅ Database initialized successfully (async)');
    }).catch(err => {
      console.error('❌ Database initialization failed:', err);
    });
  } else {
    console.log('⚠️ No database initialization function found');
  }
  
} catch (err) {
  console.error('❌ Failed to initialize database:', err);
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
  console.log(`🔗 API available at http://localhost:10000/api/`);
  console.log(`📊 Ready to serve requests`);
});

module.exports = app;
