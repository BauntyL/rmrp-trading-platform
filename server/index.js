const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 10000;

// ГЛОБАЛЬНАЯ ПЕРЕМЕННАЯ ДЛЯ STORAGE
let storage = null;
let dbInitialized = false;

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
    httpOnly: false,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  },
  name: 'connect.sid'
}));

// MIDDLEWARE ДЛЯ ПРОВЕРКИ ИНИЦИАЛИЗАЦИИ БД
function requireDatabase(req, res, next) {
  if (!dbInitialized || !storage) {
    console.log('❌ База данных не инициализирована');
    return res.status(500).json({ 
      error: 'Database not initialized',
      message: 'Сервер еще загружается, попробуйте через несколько секунд'
    });
  }
  next();
}

// ИСПРАВЛЕННАЯ ИНИЦИАЛИЗАЦИЯ БД
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...');
    
    // Импортируем storage
    storage = require('./storage-fixed');
    
    // Инициализируем базу данных
    await storage.initializeDatabase();
    
    dbInitialized = true;
    console.log('✅ Database initialized successfully');
    
  } catch (err) {
    console.error('❌ Failed to initialize database:', err);
    dbInitialized = false;
    storage = null;
    
    // Повторная попытка через 5 секунд
    setTimeout(initializeDatabase, 5000);
  }
}

// Запускаем инициализацию БД
initializeDatabase();

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

// ✅ СТАТУС СЕРВЕРА (БЕЗ ПРОВЕРКИ БД)
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    dbInitialized,
    timestamp: new Date().toISOString()
  });
});

// ✅ API ENDPOINTS С ПРОВЕРКОЙ БД

// Получение текущего пользователя
app.get('/api/user', requireDatabase, (req, res) => {
  try {
    console.log('🔍 GET /api/user - Session:', req.session);
    
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('❌ Error in GET /api/user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Регистрация
app.post('/api/register', requireDatabase, async (req, res) => {
  try {
    console.log('📝 POST /api/register - Body:', req.body);
    
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const existingUser = storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = storage.createUser({
      username,
      password: hashedPassword,
      email: email || null,
      role: 'user'
    });

    req.session.userId = newUser.id;
    
    const { password: _, ...userWithoutPassword } = newUser;
    res.json({ user: userWithoutPassword });
    
  } catch (error) {
    console.error('❌ Error in POST /api/register:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Авторизация
app.post('/api/login', requireDatabase, async (req, res) => {
  try {
    console.log('🔐 POST /api/login - Body:', req.body);
    
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
    
  } catch (error) {
    console.error('❌ Error in POST /api/login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Выход
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Error destroying session:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// ✅ ENDPOINT ДЛЯ ОТПРАВКИ СООБЩЕНИЙ
app.post('/api/messages', requireDatabase, async (req, res) => {
  try {
    console.log('📤 POST /api/messages - получен запрос:', req.body);
    console.log('👤 Session userId:', req.session?.userId);
    
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const { carId, sellerId, message } = req.body;

    if (!carId || !sellerId || !message) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: 'Сообщение слишком длинное' });
    }

    // Проверка на запрещенные слова
    const prohibitedWords = ['telegram', 'discord', 'whatsapp', 'viber', '@', 'http', 'www'];
    const containsProhibited = prohibitedWords.some(word => 
      message.toLowerCase().includes(word.toLowerCase())
    );

    if (containsProhibited) {
      return res.status(400).json({ error: 'Сообщение содержит запрещенные слова или ссылки' });
    }

    // Создаем сообщение
    const newMessage = storage.createMessage({
      senderId: req.session.userId,
      receiverId: sellerId,
      carId: carId,
      content: message
    });

    console.log('✅ Сообщение создано:', newMessage);
    
    res.json({ 
      success: true, 
      message: newMessage,
      msg: 'Сообщение отправлено' 
    });

  } catch (error) {
    console.error('❌ Ошибка отправки сообщения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение автомобилей
app.get('/api/cars', requireDatabase, (req, res) => {
  try {
    const cars = storage.getAllCars();
    res.json(cars);
  } catch (error) {
    console.error('❌ Error in GET /api/cars:', error);
    res.status(500).json({ error: 'Failed to fetch cars' });
  }
});

// Создание автомобиля
app.post('/api/cars', requireDatabase, (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const carData = {
      ...req.body,
      createdBy: req.session.userId,
      owner_id: req.session.userId,
      status: 'approved'
    };

    const newCar = storage.createCar(carData);
    res.json(newCar);
  } catch (error) {
    console.error('❌ Error in POST /api/cars:', error);
    res.status(500).json({ error: 'Failed to create car' });
  }
});

// Обновление автомобиля
app.put('/api/cars/:id', requireDatabase, (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const carId = parseInt(req.params.id);
    const updatedCar = storage.updateCar(carId, req.body);
    
    if (!updatedCar) {
      return res.status(404).json({ error: 'Car not found' });
    }

    res.json(updatedCar);
  } catch (error) {
    console.error('❌ Error in PUT /api/cars:', error);
    res.status(500).json({ error: 'Failed to update car' });
  }
});

// Удаление автомобиля
app.delete('/api/cars/:id', requireDatabase, (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const carId = parseInt(req.params.id);
    const success = storage.deleteCar(carId);
    
    if (!success) {
      return res.status(404).json({ error: 'Car not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error in DELETE /api/cars:', error);
    res.status(500).json({ error: 'Failed to delete car' });
  }
});

// Избранное
app.get('/api/favorites', requireDatabase, (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const favorites = storage.getUserFavorites(req.session.userId);
    res.json(favorites);
  } catch (error) {
    console.error('❌ Error in GET /api/favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

app.post('/api/favorites/:carId', requireDatabase, (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const carId = parseInt(req.params.carId);
    const favorite = storage.addToFavorites(req.session.userId, carId);
    res.json(favorite);
  } catch (error) {
    console.error('❌ Error in POST /api/favorites:', error);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

app.delete('/api/favorites/:carId', requireDatabase, (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const carId = parseInt(req.params.carId);
    const success = storage.removeFromFavorites(req.session.userId, carId);
    res.json({ success });
  } catch (error) {
    console.error('❌ Error in DELETE /api/favorites:', error);
    res.status(500).json({ error: 'Failed to remove from favorites' });
  }
});

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
