const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 10000;

// ПРОСТОЕ ХРАНИЛИЩЕ В ПАМЯТИ
let users = [
  {
    id: 1,
    username: 'admin',
    password: '$2b$10$8YcWYI3oHpPG5Q8wXqx8yebBPCWYRYLcm1oKGtPqg9xLMBZoF2ksi', // admin123
    role: 'admin',
    email: 'admin@rmrp.com'
  },
  {
    id: 2,
    username: 'testuser',
    password: '$2b$10$8YcWYI3oHpPG5Q8wXqx8yebBPCWYRYLcm1oKGtPqg9xLMBZoF2ksi', // test123
    role: 'user',
    email: 'test@rmrp.com'
  }
];

let cars = [
  {
    id: 1,
    name: 'BMW M5 Competition',
    category: 'Спорт',
    server: 'Арбат',
    price: 15000000,
    maxSpeed: 305,
    acceleration: '3.3 сек',
    drive: 'AWD',
    phone: '+7 (999) 123-45-67',
    telegram: '@bmw_seller',
    discord: 'bmw_lover#1234',
    imageUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&h=600&fit=crop',
    description: 'Идеальное состояние, полная комплектация, один владелец',
    isPremium: true,
    status: 'approved',
    createdBy: 1,
    owner_id: 1,
    createdAt: new Date().toISOString()
  }
];

let favorites = [];
let messages = [];

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// УПРОЩЕННЫЕ СЕССИИ
app.use(session({
  secret: 'simple-secret-key-12345',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Логирование всех запросов
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.url}`);
  console.log('🍪 Session ID:', req.sessionID);
  console.log('👤 User ID:', req.session?.userId);
  next();
});

// Статические файлы
app.use(express.static(path.join(__dirname, '../public')));

// ✅ ПРОСТОЙ СТАТУС
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    usersCount: users.length,
    carsCount: cars.length
  });
});

// ✅ УПРОЩЕННАЯ АВТОРИЗАЦИЯ
app.post('/api/login', async (req, res) => {
  try {
    console.log('🔐 LOGIN attempt:', req.body);
    
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Ищем пользователя
    const user = users.find(u => u.username === username);
    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Проверяем пароль
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      console.log('❌ Invalid password for:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Сохраняем в сессию
    req.session.userId = user.id;
    console.log('✅ Login successful, session set:', req.session.userId);

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ✅ ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЯ
app.get('/api/user', (req, res) => {
  try {
    console.log('👤 GET /api/user - Session:', req.session);
    
    if (!req.session?.userId) {
      console.log('❌ No session');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = users.find(u => u.id === req.session.userId);
    if (!user) {
      console.log('❌ User not found in session');
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
    
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ РЕГИСТРАЦИЯ
app.post('/api/register', async (req, res) => {
  try {
    console.log('📝 REGISTER attempt:', req.body);
    
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Проверяем существующего пользователя
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Создаем нового пользователя
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: users.length + 1,
      username,
      password: hashedPassword,
      email: email || null,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    req.session.userId = newUser.id;

    const { password: _, ...userWithoutPassword } = newUser;
    res.json({ user: userWithoutPassword });
    
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ✅ ВЫХОД
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// ✅ АВТОМОБИЛИ
app.get('/api/cars', (req, res) => {
  console.log('🚗 GET /api/cars');
  res.json(cars);
});

app.post('/api/cars', (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const newCar = {
      id: cars.length + 1,
      ...req.body,
      createdBy: req.session.userId,
      owner_id: req.session.userId,
      status: 'approved',
      createdAt: new Date().toISOString()
    };

    cars.push(newCar);
    res.json(newCar);
  } catch (error) {
    console.error('❌ Create car error:', error);
    res.status(500).json({ error: 'Failed to create car' });
  }
});

app.put('/api/cars/:id', (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const carId = parseInt(req.params.id);
    const carIndex = cars.findIndex(c => c.id === carId);
    
    if (carIndex === -1) {
      return res.status(404).json({ error: 'Car not found' });
    }

    cars[carIndex] = { ...cars[carIndex], ...req.body, updatedAt: new Date().toISOString() };
    res.json(cars[carIndex]);
  } catch (error) {
    console.error('❌ Update car error:', error);
    res.status(500).json({ error: 'Failed to update car' });
  }
});

app.delete('/api/cars/:id', (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const carId = parseInt(req.params.id);
    const carIndex = cars.findIndex(c => c.id === carId);
    
    if (carIndex === -1) {
      return res.status(404).json({ error: 'Car not found' });
    }

    cars.splice(carIndex, 1);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Delete car error:', error);
    res.status(500).json({ error: 'Failed to delete car' });
  }
});

// ✅ ИЗБРАННОЕ
app.get('/api/favorites', (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userFavorites = favorites.filter(f => f.userId === req.session.userId);
    const favoriteCars = userFavorites.map(f => cars.find(c => c.id === f.carId)).filter(Boolean);
    res.json(favoriteCars);
  } catch (error) {
    console.error('❌ Get favorites error:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

app.post('/api/favorites/:carId', (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const carId = parseInt(req.params.carId);
    const favorite = {
      id: favorites.length + 1,
      userId: req.session.userId,
      carId: carId,
      createdAt: new Date().toISOString()
    };

    favorites.push(favorite);
    res.json(favorite);
  } catch (error) {
    console.error('❌ Add favorite error:', error);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

app.delete('/api/favorites/:carId', (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const carId = parseInt(req.params.carId);
    const favoriteIndex = favorites.findIndex(f => f.userId === req.session.userId && f.carId === carId);
    
    if (favoriteIndex !== -1) {
      favorites.splice(favoriteIndex, 1);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Remove favorite error:', error);
    res.status(500).json({ error: 'Failed to remove from favorites' });
  }
});

// ✅ СООБЩЕНИЯ
app.post('/api/messages', (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { carId, sellerId, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const newMessage = {
      id: messages.length + 1,
      senderId: req.session.userId,
      receiverId: sellerId,
      carId: carId,
      content: message,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    messages.push(newMessage);
    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 Try: http://localhost:${PORT}/api/status`);
  console.log(`👤 Login: admin/admin123 или testuser/test123`);
});

module.exports = app;
