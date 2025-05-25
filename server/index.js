const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const path = require('path');

// ✅ ИСПРАВЛЕННЫЙ ИМПОРТ STORAGE
let initializeStorage, storage;

try {
  const storageModule = require('./storage');
  initializeStorage = storageModule.initializeStorage;
  storage = storageModule.storage;
  
  if (!initializeStorage || !storage) {
    throw new Error('Failed to import storage functions');
  }
  console.log('✅ Storage imported successfully');
} catch (error) {
  console.error('❌ Failed to import storage:', error);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting server...');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Попытка импорта express
console.log('📦 Trying to import express...');

// Попытка импорта других модулей
console.log('📦 Trying to import other modules...');

// Попытка импорта storage
console.log('📦 Trying to import storage...');

console.log('🔧 Setting up middleware...');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());

console.log('🔧 Setting up passport strategy...');

// Passport configuration
passport.use(new LocalStrategy(
  {
    usernameField: 'username',
    passwordField: 'password'
  },
  async (username, password, done) => {
    try {
      console.log(`🔐 Authenticating user: ${username}`);
      await initializeStorage();
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log(`❌ User not found: ${username}`);
        return done(null, false, { message: 'Неверное имя пользователя или пароль' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        console.log(`❌ Invalid password for user: ${username}`);
        return done(null, false, { message: 'Неверное имя пользователя или пароль' });
      }

      console.log(`✅ User authenticated: ${username}`);
      return done(null, user);
    } catch (error) {
      console.error('❌ Authentication error:', error);
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  console.log(`🔧 Serializing user: ${user.username} (ID: ${user.id})`);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log(`🔧 Deserializing user ID: ${id}`);
    await initializeStorage();
    const user = await storage.getUserById(id);
    console.log(`✅ User deserialized: ${user?.username || 'not found'}`);
    done(null, user);
  } catch (error) {
    console.error('❌ Deserialization error:', error);
    done(error);
  }
});

// Logging middleware
app.use((req, res, next) => {
  const sessionInfo = req.session?.id ? req.session.id.substring(0, 12) + '...' : 'undefined';
  console.log(`🌐 ${req.method} ${req.path} - Content-Type: ${req.headers['content-type']} - Session: ${sessionInfo}...`);
  next();
});

console.log('🔧 Setting up API routes...');

// Authentication routes
app.post('/api/register', async (req, res) => {
  try {
    console.log('📝 Registration attempt via /api/register');
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }

    await initializeStorage();
    
    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await storage.createUser({
      username,
      password: passwordHash
    });
    console.log(`✅ User registered via /api/register: ${username}`);

    // Log in the user
    req.login(newUser, (err) => {
      if (err) {
        console.error('❌ Login error after registration:', err);
        return res.status(500).json({ error: 'Ошибка при автоматическом входе' });
      }
      
      console.log(`🍪 Session created after registration: ${req.session.id}`);
      console.log(`🍪 User in session: ${req.user.username}`);
      
      const userResponse = {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        createdAt: newUser.createdAt
      };
      
      console.log('📤 Sending user data to frontend:', userResponse);
      res.json(userResponse);
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
});

app.post('/api/login', async (req, res, next) => {
  console.log(`📝 Login attempt via /api/login for: ${req.body.username}`);
  
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('❌ Login error:', err);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
    
    if (!user) {
      console.log(`❌ Login failed for: ${req.body.username} - ${info?.message}`);
      return res.status(401).json({ error: info?.message || 'Неверные данные' });
    }

    req.logIn(user, (err) => {
      if (err) {
        console.error('❌ Login session error:', err);
        return res.status(500).json({ error: 'Ошибка при создании сессии' });
      }
      
      console.log(`✅ Login successful via /api/login: ${user.username}`);
      console.log(`🍪 Session created: ${req.session.id}`);
      console.log(`🍪 User in session: ${req.user.username}`);
      
      const userResponse = {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt
      };
      
      console.log('📤 Sending user data to frontend:', userResponse);
      res.json(userResponse);
    });
  })(req, res, next);
});

app.post('/api/logout', (req, res) => {
  const username = req.user?.username || 'unknown';
  console.log(`📝 Logout request for: ${username}`);
  
  req.logout((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ error: 'Ошибка при выходе' });
    }
    
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Session destroy error:', err);
        return res.status(500).json({ error: 'Ошибка при завершении сессии' });
      }
      
      console.log(`✅ Logout successful for: ${username}`);
      res.json({ message: 'Выход выполнен успешно' });
    });
  });
});

// Get current user
app.get('/api/user', (req, res) => {
  const sessionInfo = req.session?.id ? req.session.id.substring(0, 12) + '...' : 'undefined';
  console.log(`📝 GET /api/user - Session: ${sessionInfo}`);
  console.log(`📝 User in request: ${req.user ? req.user.username : 'not authenticated'}`);
  console.log(`📝 Session user ID: ${req.session?.passport?.user || 'none'}`);
  
  if (!req.user) {
    console.log('❌ User not authenticated');
    return res.status(401).json({ error: 'Не авторизован' });
  }
  
  const userResponse = {
    id: req.user.id,
    username: req.user.username,
    role: req.user.role,
    createdAt: req.user.createdAt
  };
  
  console.log('📤 Sending current user data:', userResponse);
  res.json(userResponse);
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Необходимо войти в систему' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Недостаточно прав доступа' });
  }
  next();
};

const requireModeratorOrAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'moderator')) {
    return res.status(403).json({ error: 'Недостаточно прав доступа' });
  }
  next();
};

// User management routes
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    console.log(`📝 GET /api/users - User: ${req.user.username}`);
    
    if (req.user.role !== 'admin') {
      console.log(`❌ User ${req.user.username} not authorized for users list`);
      return res.status(403).json({ error: 'Недостаточно прав доступа' });
    }

    await initializeStorage();
    const users = await storage.getAllUsers();
    console.log(`📋 Admin ${req.user.username} requested ${users.length} users`);
    res.json(users);
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ error: 'Ошибка при получении списка пользователей' });
  }
});

// 🚨 ИСПРАВЛЕНО: Добавлена поддержка роли "moderator"
app.patch('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, role } = req.body;
    
    console.log(`📝 PATCH /api/users/${userId} - User: ${req.user.username}`);
    console.log(`📋 Update data:`, { username, role });

    // Validate role - ✅ ДОБАВЛЕН "moderator"
    if (!role || !['user', 'moderator', 'admin'].includes(role)) {
      console.log(`❌ Invalid role provided: ${role}`);
      return res.status(400).json({ error: 'Недопустимая роль пользователя' });
    }

    // Validate username if provided
    if (username && username.length < 3) {
      return res.status(400).json({ error: 'Имя пользователя должно содержать минимум 3 символа' });
    }

    await initializeStorage();
    
    // Check if user exists
    const existingUser = await storage.getUserById(userId);
    if (!existingUser) {
      console.log(`❌ User not found: ${userId}`);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Check if username is already taken (if changing username)
    if (username && username !== existingUser.username) {
      const userWithSameName = await storage.getUserByUsername(username);
      if (userWithSameName) {
        return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
      }
    }

    // Prevent admin from changing their own role
    if (userId === req.user.id && role !== req.user.role) {
      return res.status(400).json({ error: 'Нельзя изменить собственную роль' });
    }

    // Update user
    const updateData = {};
    if (username) updateData.username = username;
    if (role) updateData.role = role;

    const updatedUser = await storage.updateUser(userId, updateData);
    
    console.log(`✅ User updated by ${req.user.username}:`, updatedUser);
    res.json(updatedUser);
  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({ error: 'Ошибка при обновлении пользователя' });
  }
});

// Cars routes
app.get('/api/cars', requireAuth, async (req, res) => {
  try {
    console.log(`📝 GET /api/cars - User: ${req.user.username} - Fetching all cars`);
    await initializeStorage();
    const cars = await storage.getAllCars();
    console.log(`📋 Found ${cars.length} cars`);
    console.log('📤 Cars data:', cars);
    res.json(cars);
  } catch (error) {
    console.error('❌ Error fetching cars:', error);
    res.status(500).json({ error: 'Ошибка при получении списка автомобилей' });
  }
});

app.post('/api/cars', requireAuth, async (req, res) => {
  try {
    console.log(`📝 POST /api/cars - User: ${req.user.username}`);
    const carData = req.body;
    
    await initializeStorage();
    const newCar = await storage.createCar({
      ...carData,
      createdBy: req.user.id
    });
    
    console.log(`✅ Car created by ${req.user.username}:`, newCar);
    res.status(201).json(newCar);
  } catch (error) {
    console.error('❌ Error creating car:', error);
    res.status(500).json({ error: 'Ошибка при создании объявления' });
  }
});

// Applications routes
app.get('/api/applications/pending', requireAuth, async (req, res) => {
  try {
    console.log(`📝 GET /api/applications/pending - User: ${req.user.username}`);
    
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      console.log(`❌ User not authenticated for pending applications`);
      return res.status(403).json({ error: 'Недостаточно прав доступа' });
    }

    await initializeStorage();
    const applications = await storage.getPendingApplications();
    console.log(`📋 ${req.user.role} ${req.user.username} requested ${applications.length} pending applications`);
    res.json(applications);
  } catch (error) {
    console.error('❌ Error fetching pending applications:', error);
    res.status(500).json({ error: 'Ошибка при получении заявок' });
  }
});

app.get('/api/my-applications', requireAuth, async (req, res) => {
  try {
    console.log(`📝 GET /api/my-applications - User: ${req.user.username}`);
    await initializeStorage();
    const applications = await storage.getUserApplications(req.user.id);
    console.log(`📋 User ${req.user.username} has ${applications.length} applications`);
    res.json(applications);
  } catch (error) {
    console.error('❌ Error fetching user applications:', error);
    res.status(500).json({ error: 'Ошибка при получении ваших заявок' });
  }
});

app.post('/api/applications', requireAuth, async (req, res) => {
  try {
    console.log(`📝 POST /api/applications - User: ${req.user.username}`);
    const applicationData = req.body;
    
    await initializeStorage();
    const newApplication = await storage.createApplication({
      ...applicationData,
      userId: req.user.id
    });
    
    console.log(`✅ Application created by ${req.user.username}:`, newApplication);
    res.status(201).json(newApplication);
  } catch (error) {
    console.error('❌ Error creating application:', error);
    res.status(500).json({ error: 'Ошибка при создании заявки' });
  }
});

app.post('/api/applications/:id/approve', requireModeratorOrAdmin, async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    console.log(`📝 POST /api/applications/${applicationId}/approve - User: ${req.user.username}`);
    
    await initializeStorage();
    const result = await storage.approveApplication(applicationId);
    
    console.log(`✅ Application ${applicationId} approved by ${req.user.username}:`, result);
    res.json(result);
  } catch (error) {
    console.error('❌ Error approving application:', error);
    res.status(500).json({ error: 'Ошибка при одобрении заявки' });
  }
});

app.post('/api/applications/:id/reject', requireModeratorOrAdmin, async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    const { reason } = req.body;
    console.log(`📝 POST /api/applications/${applicationId}/reject - User: ${req.user.username}`);
    
    await initializeStorage();
    const result = await storage.rejectApplication(applicationId, reason);
    
    console.log(`❌ Application ${applicationId} rejected by ${req.user.username}:`, result);
    res.json(result);
  } catch (error) {
    console.error('❌ Error rejecting application:', error);
    res.status(500).json({ error: 'Ошибка при отклонении заявки' });
  }
});

// Favorites routes
app.get('/api/favorites', requireAuth, async (req, res) => {
  try {
    console.log(`📝 GET /api/favorites - User: ${req.user.username}`);
    await initializeStorage();
    const favorites = await storage.getUserFavorites(req.user.id);
    console.log(`📋 User ${req.user.username} has ${favorites.length} favorites`);
    res.json(favorites);
  } catch (error) {
    console.error('❌ Error fetching favorites:', error);
    res.status(500).json({ error: 'Ошибка при получении избранного' });
  }
});

app.post('/api/favorites/:carId', requireAuth, async (req, res) => {
  try {
    const carId = parseInt(req.params.carId);
    console.log(`📝 POST /api/favorites/${carId} - User: ${req.user.username}`);
    
    await initializeStorage();
    await storage.addToFavorites(req.user.id, carId);
    
    console.log(`⭐ Car ${carId} added to favorites by ${req.user.username}`);
    res.json({ message: 'Добавлено в избранное' });
  } catch (error) {
    console.error('❌ Error adding to favorites:', error);
    res.status(500).json({ error: 'Ошибка при добавлении в избранное' });
  }
});

app.delete('/api/favorites/:carId', requireAuth, async (req, res) => {
  try {
    const carId = parseInt(req.params.carId);
    console.log(`📝 DELETE /api/favorites/${carId} - User: ${req.user.username}`);
    
    await initializeStorage();
    await storage.removeFromFavorites(req.user.id, carId);
    
    console.log(`💔 Car ${carId} removed from favorites by ${req.user.username}`);
    res.json({ message: 'Удалено из избранного' });
  } catch (error) {
    console.error('❌ Error removing from favorites:', error);
    res.status(500).json({ error: 'Ошибка при удалении из избранного' });
  }
});

// Messages routes
app.get('/api/messages/unread-count', requireAuth, async (req, res) => {
  try {
    console.log(`📝 GET /api/messages/unread-count - User: ${req.user.username}`);
    await initializeStorage();
    const count = await storage.getUnreadMessagesCount(req.user.id);
    console.log(`📋 User ${req.user.username} has ${count} unread messages`);
    res.json({ count });
  } catch (error) {
    console.error('❌ Error fetching unread messages count:', error);
    res.status(500).json({ error: 'Ошибка при получении количества непрочитанных сообщений' });
  }
});

app.get('/api/messages', requireAuth, async (req, res) => {
  try {
    console.log(`📝 GET /api/messages - User: ${req.user.username}`);
    await initializeStorage();
    const messages = await storage.getUserMessages(req.user.id);
    console.log(`📋 User ${req.user.username} has ${messages.length} messages`);
    res.json(messages);
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ error: 'Ошибка при получении сообщений' });
  }
});

app.post('/api/messages', requireAuth, async (req, res) => {
  try {
    console.log(`📝 POST /api/messages - User: ${req.user.username}`);
    const { recipientId, content, carId } = req.body;
    
    await initializeStorage();
    const newMessage = await storage.createMessage({
      senderId: req.user.id,
      recipientId,
      content,
      carId
    });
    
    console.log(`💬 Message sent by ${req.user.username}:`, newMessage);
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({ error: 'Ошибка при отправке сообщения' });
  }
});

console.log('🔧 Setting up static files...');

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
  
  // Handle React Router
  app.get('*', (req, res) => {
    console.log(`📝 Serving SPA for route: ${req.path}`);
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
} else {
  console.log('🎯 Setting up static files...');
  app.use(express.static(path.join(__dirname, '../public')));
  
  app.get('*', (req, res) => {
    console.log(`📝 Serving SPA for route: ${req.path}`);
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

console.log('🔧 About to start listening on port:', PORT);
console.log('🎯 Server setup complete, waiting for connections...');

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server successfully running on port ${PORT}`);
  console.log(`🌐 Server listening on 0.0.0.0:${PORT}`);
});

module.exports = app;
