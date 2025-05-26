const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const setupAuth = require('./auth');
const setupRoutes = require('./routes');
const db = require('./db');

const app = express();

// Логирование всех запросов для отладки
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Основные middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS для development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
}

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'rmrp-trading-platform-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Для Render.com должно быть false
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 часа
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Настройка авторизации
setupAuth(passport);

// ВАЖНО: API ROUTES ПЕРВЫМИ!
setupRoutes(app);

const PORT = process.env.PORT || 3000;

// Инициализация базы данных и запуск сервера
async function startServer() {
  try {
    console.log('🔄 Initializing database...');
    await db.initDb();
    console.log('✅ Database initialized successfully');
    
    // Запуск сервера
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API available at http://localhost:${PORT}/api/`);
      console.log(`📊 Database connected: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'Local'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🔄 SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('✅ Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();
