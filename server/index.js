const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 10000;

// ПРОСТОЕ ХРАНИЛИЩЕ В ПАМЯТИ
let users = [];
let cars = [];
let favorites = [];
let messages = [];
let applications = [];

// ✅ ИНИЦИАЛИЗАЦИЯ ПОЛЬЗОВАТЕЛЕЙ ПОСЛЕ ЗАПУСКА СЕРВЕРА
async function initializeUsers() {
  try {
    console.log('👤 Создание пользователей...');
    
    // Создаем вашего пользователя
    const yourPassword = await bcrypt.hash('Lqlcpyvb555!999#81', 10);
    users.push({
      id: 1,
      username: 'Баунти Миллер',
      password: yourPassword,
      role: 'admin',
      email: 'bounty@rmrp.com'
    });
    
    // Создаем админа (запасной)
    const adminPassword = await bcrypt.hash('admin123', 10);
    users.push({
      id: 2,
      username: 'admin',
      password: adminPassword,
      role: 'admin',
      email: 'admin@rmrp.com'
    });
    
    // Создаем тестового пользователя
    const testPassword = await bcrypt.hash('test123', 10);
    users.push({
      id: 3,
      username: 'testuser',
      password: testPassword,
      role: 'user',
      email: 'test@rmrp.com'
    });
    
    console.log('✅ Пользователи созданы:', users.map(u => u.username));
    
  } catch (error) {
    console.error('❌ Ошибка создания пользователей:', error);
  }
}

// ✅ ИНИЦИАЛИЗАЦИЯ ТЕСТОВЫХ АВТОМОБИЛЕЙ
async function initializeCars() {
  const testCars = [
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
    },
    {
      id: 2,
      name: 'Mercedes-AMG GT 63S',
      category: 'Купе',
      server: 'Рублевка',
      price: 18000000,
      maxSpeed: 315,
      acceleration: '3.2 сек',
      drive: 'AWD',
      phone: '+7 (999) 765-43-21',
      telegram: '@merc_dealer',
      discord: 'merc_fan#5678',
      imageUrl: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=600&fit=crop',
      description: 'Эксклюзивная версия с карбоновым пакетом',
      isPremium: true,
      status: 'approved',
      createdBy: 1,
      owner_id: 1,
      createdAt: new Date().toISOString()
    },
    {
      id: 3,
      name: 'Audi RS6 Avant',
      category: 'Универсал',
      server: 'Тверской',
      price: 12000000,
      maxSpeed: 280,
      acceleration: '3.6 сек',
      drive: 'AWD',
      phone: '+7 (999) 111-22-33',
      telegram: '@audi_rs',
      discord: 'quattro_lover#9999',
      imageUrl: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=600&fit=crop',
      description: 'Семейный спорткар с невероятной практичностью',
      isPremium: false,
      status: 'approved',
      createdBy: 1,
      owner_id: 1,
      createdAt: new Date().toISOString()
    },
    {
      id: 4,
      name: 'Porsche 911 Turbo S',
      category: 'Спорт',
      server: 'Патрики',
      price: 22000000,
      maxSpeed: 330,
      acceleration: '2.7 сек',
      drive: 'AWD',
      phone: '+7 (999) 888-77-66',
      telegram: '@porsche_pro',
      discord: 'turbo_master#1111',
      imageUrl: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=600&fit=crop',
      description: 'Легенда автоспорта в идеальном состоянии',
      isPremium: true,
      status: 'approved',
      createdBy: 1,
      owner_id: 1,
      createdAt: new Date().toISOString()
    },
    {
      id: 5,
      name: 'Lamborghini Huracán EVO',
      category: 'Суперкар',
      server: 'Арбат',
      price: 25000000,
      maxSpeed: 325,
      acceleration: '2.9 сек',
      drive: 'AWD',
      phone: '+7 (999) 222-33-44',
      telegram: '@lambo_king',
      discord: 'bull_rider#2222',
      imageUrl: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=600&fit=crop',
      description: 'Итальянская страсть в каждой детали',
      isPremium: true,
      status: 'approved',
      createdBy: 1,
      owner_id: 1,
      createdAt: new Date().toISOString()
    }
  ];
  
  cars.push(...testCars);
  console.log(`🚗 Создано ${testCars.length} тестовых автомобилей`);
}

// ✅ ИНИЦИАЛИЗАЦИЯ ТЕСТОВЫХ ЗАЯВОК
async function initializeApplications() {
  const testApplications = [
    {
      id: 1,
      name: 'Ferrari F8 Tributo',
      category: 'Суперкар',
      server: 'Рублевка',
      price: 28000000,
      maxSpeed: 340,
      acceleration: '2.9 сек',
      drive: 'RWD',
      phone: '+7 (999) 555-77-88',
      telegram: '@ferrari_master',
      discord: 'prancing_horse#4444',
      imageUrl: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&h=600&fit=crop',
      description: 'Невероятный итальянский суперкар с атмосферным V8',
      isPremium: true,
      status: 'pending',
      createdBy: 3,
      owner_id: 3,
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      name: 'McLaren 720S',
      category: 'Суперкар',
      server: 'Арбат',
      price: 30000000,
      maxSpeed: 341,
      acceleration: '2.8 сек',
      drive: 'RWD',
      phone: '+7 (999) 666-88-99',
      telegram: '@mclaren_speed',
      discord: 'papaya_orange#7777',
      imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
      description: 'Британская инженерия на пике совершенства',
      isPremium: true,
      status: 'pending',
      createdBy: 3,
      owner_id: 3,
      createdAt: new Date().toISOString()
    }
  ];
  
  applications.push(...testApplications);
  console.log(`📋 Создано ${testApplications.length} тестовых заявок`);
}

// ✅ ИНИЦИАЛИЗАЦИЯ ТЕСТОВЫХ СООБЩЕНИЙ
async function initializeMessages() {
  const testMessages = [
    {
      id: 1,
      senderId: 3, // testuser
      receiverId: 1, // admin (Баунти Миллер)
      carId: 1,
      content: 'Здравствуйте! Интересует ваш BMW M5. Возможен торг?',
      isRead: false,
      createdAt: new Date(Date.now() - 60000).toISOString() // 1 минуту назад
    },
    {
      id: 2,
      senderId: 1, // admin (Баунти Миллер)
      receiverId: 3, // testuser
      carId: 1,
      content: 'Добро пожаловать! Да, небольшой торг возможен. Когда удобно посмотреть?',
      isRead: false,
      createdAt: new Date(Date.now() - 30000).toISOString() // 30 секунд назад
    },
    {
      id: 3,
      senderId: 3, // testuser
      receiverId: 1, // admin
      carId: 4,
      content: 'Porsche тоже заинтересовал. Можно узнать состояние двигателя?',
      isRead: true,
      createdAt: new Date(Date.now() - 120000).toISOString() // 2 минуты назад
    }
  ];
  
  messages.push(...testMessages);
  console.log(`💬 Создано ${testMessages.length} тестовых сообщений`);
}

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
    carsCount: cars.length,
    applicationsCount: applications.length,
    messagesCount: messages.length
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

// ✅ СООБЩЕНИЯ - ОТПРАВКА РАБОТАЕТ
app.post('/api/messages', (req, res) => {
  try {
    console.log('📤 POST /api/messages - Request body:', req.body);
    console.log('👤 User ID from session:', req.session?.userId);
    
    if (!req.session?.userId) {
      console.log('❌ No authentication');
      return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const { carId, sellerId, message } = req.body;

    // Валидация данных
    if (!message || !message.trim()) {
      console.log('❌ Empty message');
      return res.status(400).json({ error: 'Сообщение не может быть пустым' });
    }

    if (message.length > 500) {
      console.log('❌ Message too long');
      return res.status(400).json({ error: 'Сообщение слишком длинное (максимум 500 символов)' });
    }

    if (!sellerId) {
      console.log('❌ No seller ID');
      return res.status(400).json({ error: 'Не указан получатель сообщения' });
    }

    // Проверка на запрещенные слова (опционально)
    const prohibitedWords = ['telegram', 'discord', 'whatsapp', 'viber', '@', 'http', 'www'];
    const containsProhibited = prohibitedWords.some(word => 
      message.toLowerCase().includes(word.toLowerCase())
    );

    if (containsProhibited) {
      console.log('❌ Prohibited words found');
      return res.status(400).json({ error: 'Сообщение содержит запрещенные слова или ссылки' });
    }

    // Создаем сообщение
    const newMessage = {
      id: messages.length + 1,
      senderId: req.session.userId,
      receiverId: parseInt(sellerId),
      carId: carId ? parseInt(carId) : null,
      content: message.trim(),
      isRead: false,
      createdAt: new Date().toISOString()
    };

    messages.push(newMessage);
    
    console.log('✅ Message created successfully:', newMessage);
    
    res.json({ 
      success: true, 
      message: newMessage,
      msg: 'Сообщение успешно отправлено' 
    });

  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ✅ ИСПРАВЛЕННЫЙ GET /api/messages ДЛЯ КОНКРЕТНОГО ЧАТА
app.get('/api/messages', (req, res) => {
  try {
    console.log('💬 GET /api/messages - ALL MESSAGES');
    
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.session.userId;
    const { chatId } = req.query;

    console.log('📨 Chat ID requested:', chatId);
    console.log('👤 User ID:', userId);

    let userMessages = messages.filter(m => 
      m.senderId === userId || m.receiverId === userId
    );

    // Если указан chatId, фильтруем по чату
    if (chatId) {
      const [userId1, userId2] = chatId.split('-').map(Number);
      userMessages = userMessages.filter(m => 
        (m.senderId === userId1 && m.receiverId === userId2) ||
        (m.senderId === userId2 && m.receiverId === userId1)
      );
    }

    const cleanMessages = userMessages.map(msg => {
      const sender = users.find(u => u.id === msg.senderId);
      const receiver = users.find(u => u.id === msg.receiverId);
      const car = msg.carId ? cars.find(c => c.id === msg.carId) : null;

      return {
        id: Number(msg.id),
        senderId: Number(msg.senderId),
        receiverId: Number(msg.receiverId),
        carId: msg.carId ? Number(msg.carId) : null,
        content: String(msg.content || ''),
        isRead: Boolean(msg.isRead),
        createdAt: String(msg.createdAt || new Date().toISOString()),
        senderName: sender ? String(sender.username) : 'Пользователь',
        receiverName: receiver ? String(receiver.username) : 'Пользователь',
        carName: car ? String(car.name) : null
      };
    }).filter(msg => msg.content && msg.createdAt);

    console.log(`💬 Returning ${cleanMessages.length} messages for chat ${chatId}:`, cleanMessages);
    res.json(cleanMessages);

  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ✅ ИСПРАВЛЕННЫЙ GET /api/messages/chats
app.get('/api/messages/chats', (req, res) => {
  try {
    console.log('💬 GET /api/messages/chats - ДЕТАЛЬНАЯ ДИАГНОСТИКА');
    console.log('👤 User ID:', req.session?.userId);
    console.log('📊 Total messages in system:', messages.length);
    
    if (!req.session?.userId) {
      console.log('❌ No authentication - returning 401');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.session.userId;
    const userMessages = messages.filter(m => 
      m.senderId === userId || m.receiverId === userId
    );

    console.log('📨 User messages found:', userMessages.length);
    console.log('📨 User messages data:', userMessages);

    if (userMessages.length === 0) {
      console.log('📨 No messages found, returning empty array');
      return res.json([]);
    }

    const chats = {};
    
    userMessages.forEach(msg => {
      if (!msg.content || !msg.createdAt) return;
      
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const chatKey = `${Math.min(userId, otherUserId)}-${Math.max(userId, otherUserId)}`;
      
      if (!chats[chatKey]) {
        const otherUser = users.find(u => u.id === otherUserId);
        const car = msg.carId ? cars.find(c => c.id === msg.carId) : null;
        
        chats[chatKey] = {
          id: String(chatKey),
          otherUserId: Number(otherUserId),
          otherUserName: otherUser ? String(otherUser.username) : 'Пользователь',
          carName: car ? String(car.name) : 'Автомобиль',
          messages: [],
          lastMessage: null,
          unreadCount: 0
        };
      }
      
      const cleanMessage = {
        id: Number(msg.id),
        senderId: Number(msg.senderId),
        receiverId: Number(msg.receiverId),
        carId: msg.carId ? Number(msg.carId) : null,
        content: String(msg.content),
        isRead: Boolean(msg.isRead),
        createdAt: String(msg.createdAt)
      };
      
      chats[chatKey].messages.push(cleanMessage);
      
      if (!chats[chatKey].lastMessage || new Date(msg.createdAt) > new Date(chats[chatKey].lastMessage.createdAt)) {
        chats[chatKey].lastMessage = cleanMessage;
      }
      
      if (!msg.isRead && msg.receiverId === userId) {
        chats[chatKey].unreadCount++;
      }
    });

    const chatsList = Object.values(chats).sort((a, b) => 
      new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0)
    );

    console.log(`💬 Returning ${chatsList.length} chats:`, chatsList);
    res.json(chatsList);

  } catch (error) {
    console.error('❌ Get chats error:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// ✅ ВОССТАНОВЛЕННЫЙ ПОДСЧЕТ
app.get('/api/messages/unread-count', (req, res) => {
  try {
    console.log('📬 GET /api/messages/unread-count');
    
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const unreadCount = messages.filter(m => 
      m.receiverId === req.session.userId && !m.isRead && m.content
    ).length;

    console.log(`📬 User ${req.session.userId} has ${unreadCount} unread messages`);
    res.json({ count: Number(unreadCount) });

  } catch (error) {
    console.error('❌ Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// ✅ ОТМЕТКА СООБЩЕНИЙ КАК ПРОЧИТАННЫХ
app.patch('/api/messages/:id/read', (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const messageId = parseInt(req.params.id);
    const messageIndex = messages.findIndex(m => 
      m.id === messageId && m.receiverId === req.session.userId
    );

    if (messageIndex !== -1) {
      messages[messageIndex].isRead = true;
      console.log(`✅ Message ${messageId} marked as read`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Message not found' });
    }

  } catch (error) {
    console.error('❌ Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// ✅ ЗАЯВКИ НА МОДЕРАЦИЮ

// Создание заявки
app.post('/api/applications', (req, res) => {
  try {
    console.log('📝 POST /api/applications - Creating application:', req.body);
    
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const applicationData = {
      ...req.body,
      createdBy: req.session.userId,
      owner_id: req.session.userId,
      status: 'pending'
    };

    const newApplication = {
      id: applications.length + 1,
      ...applicationData,
      createdAt: new Date().toISOString()
    };

    applications.push(newApplication);
    
    console.log('✅ Application created:', newApplication);
    res.json(newApplication);

  } catch (error) {
    console.error('❌ Create application error:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

// Получение заявок на модерацию (для админов)
app.get('/api/applications/pending', (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = users.find(u => u.id === req.session.userId);
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const pendingApplications = applications.filter(app => app.status === 'pending');
    console.log(`📋 Found ${pendingApplications.length} pending applications`);
    res.json(pendingApplications);

  } catch (error) {
    console.error('❌ Get pending applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Модерация заявки (одобрение/отклонение)
app.patch('/api/applications/:id/status', (req, res) => {
  try {
    console.log('🔄 PATCH /api/applications/:id/status - Moderating application:', req.params.id, req.body);
    
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = users.find(u => u.id === req.session.userId);
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const applicationId = parseInt(req.params.id);
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const applicationIndex = applications.findIndex(app => app.id === applicationId);
     if (applicationIndex === -1) {
      return res.status(404).json({ error: 'Application not found' });
    }

    applications[applicationIndex].status = status;
    applications[applicationIndex].moderatedBy = req.session.userId;
    applications[applicationIndex].moderatedAt = new Date().toISOString();

    if (status === 'approved') {
      const approvedApp = applications[applicationIndex];
      const newCar = {
        id: cars.length + 1,
        name: approvedApp.name,
        category: approvedApp.category,
        server: approvedApp.server,
        price: approvedApp.price,
        maxSpeed: approvedApp.maxSpeed || 0,
        acceleration: approvedApp.acceleration || 'Не указано',
        drive: approvedApp.drive || 'Не указано',
        phone: approvedApp.phone || null,
        telegram: approvedApp.telegram || null,
        discord: approvedApp.discord || null,
        imageUrl: approvedApp.imageUrl || null,
        description: approvedApp.description || null,
        isPremium: approvedApp.isPremium || false,
        status: 'approved',
        createdBy: approvedApp.createdBy,
        owner_id: approvedApp.owner_id,
        createdAt: new Date().toISOString()
      };

      cars.push(newCar);
      console.log('✅ Car added to catalog:', newCar);
    }

    console.log('✅ Application moderated:', applications[applicationIndex]);
    res.json(applications[applicationIndex]);

  } catch (error) {
    console.error('❌ Moderate application error:', error);
    res.status(500).json({ error: 'Failed to moderate application' });
  }
});

// Получение всех заявок пользователя
app.get('/api/my-applications', (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userApplications = applications.filter(app => app.createdBy === req.session.userId);
    console.log(`📋 Found ${userApplications.length} applications for user ${req.session.userId}`);
    res.json(userApplications);

  } catch (error) {
    console.error('❌ Get user applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Получение всех заявок (для админской панели)
app.get('/api/applications', (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = users.find(u => u.id === req.session.userId);
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log(`📋 Found ${applications.length} total applications`);
    res.json(applications);

  } catch (error) {
    console.error('❌ Get applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Запуск сервера
app.listen(PORT, async () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 Try: http://localhost:${PORT}/api/status`);
  
  // ✅ ИНИЦИАЛИЗИРУЕМ ДАННЫЕ ПОСЛЕ ЗАПУСКА
  await initializeUsers();
  await initializeCars();
  await initializeApplications();
  await initializeMessages();
  
  console.log(`👤 Ваш логин: "Баунти Миллер" / "Lqlcpyvb555!999#81"`);
  console.log(`👤 Запасной: admin/admin123 или testuser/test123`);
  console.log(`🎉 Сервер готов к работе!`);
});

module.exports = app;
