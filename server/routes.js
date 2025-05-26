const express = require('express');
const bcrypt = require('bcrypt');
const storage = require('./storage-fixed'); // ИСПОЛЬЗУЕМ ИСПРАВЛЕННЫЙ STORAGE

const router = express.Router();

// Middleware для проверки аутентификации БЕЗ PASSPORT
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    req.user = req.session.user;
    console.log('🔐 Auth check: User:', req.user.username);
    return next();
  }
  console.log('❌ Auth required but user not authenticated');
  res.status(401).json({ error: 'Authentication required' });
}

// Middleware для проверки роли
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userRole = req.session.user.role;
    console.log('🛡️ Role check:', userRole);
    
    if (roles.includes(userRole)) {
      return next();
    }
    
    console.log('❌ Access denied. Required roles:', roles, 'User role:', userRole);
    res.status(403).json({ error: 'Insufficient permissions' });
  };
}

// ИСПРАВЛЕННАЯ АУТЕНТИФИКАЦИЯ БЕЗ PASSPORT
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('🔑 Login attempt for:', username);
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Получаем пользователя из базы
    const user = await storage.getUserByUsername(username);
    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // ПРОВЕРКА ПАРОЛЯ
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      console.log('❌ Invalid password for:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // СОЗДАЕМ СЕССИЮ ВРУЧНУЮ
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };
    
    // ПРИНУДИТЕЛЬНО СОХРАНЯЕМ СЕССИЮ
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({ error: 'Session save failed' });
      }
      
      const responseData = {
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      };
      
      console.log('✅ Login successful for:', user.username);
      console.log('📤 Sending response:', responseData);
      console.log('🔍 Session after login:', req.session);
      res.json(responseData);
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('📝 Registration attempt for:', username);
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    // Проверка существования пользователя
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      console.log('❌ User already exists:', username);
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Создание пользователя
    const user = await storage.createUser({
      username,
      password: hashedPassword,
      role: 'user'
    });
    
    console.log('✅ User registered:', username);
    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/logout', (req, res) => {
  const username = req.session?.user?.username || 'Unknown';
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    console.log('✅ User logged out:', username);
    res.json({ message: 'Logged out successfully' });
  });
});

// ИСПРАВЛЕННЫЙ ENDPOINT ПОЛЬЗОВАТЕЛЯ
router.get('/user', (req, res) => {
  console.log('👤 User info requested');
  console.log('🔍 Session data:', req.session);
  console.log('🔍 Session user:', req.session?.user);
  
  if (req.session && req.session.user) {
    const userData = {
      user: {
        id: req.session.user.id,
        username: req.session.user.username,
        role: req.session.user.role
      }
    };
    console.log('✅ Returning user data:', userData);
    res.json(userData);
  } else {
    console.log('❌ No user in session');
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// ИСПРАВЛЕННЫЙ ENDPOINT ДЛЯ СОЗДАНИЯ ЗАЯВОК
router.post('/applications', requireAuth, async (req, res) => {
  try {
    console.log('📝 Creating application for user:', req.user.username);
    console.log('📋 RAW request body:', req.body);
    
    // ПЕРЕДАЕМ ВСЕ ПОЛЯ НАПРЯМУЮ
    const applicationData = {
      ...req.body,
      createdBy: req.user.id,
      status: 'pending'
    };
    
    console.log('📝 Creating application with data:', applicationData);
    
    const application = await storage.createApplication(applicationData);
    
    console.log('✅ Application created successfully:', application.id);
    res.status(201).json(application);
    
  } catch (error) {
    console.error('❌ Error creating application:', error);
    res.status(500).json({ 
      error: 'Ошибка создания заявки',
      details: error.message 
    });
  }
});

// Получение заявок на модерацию (только для модераторов и админов)
router.get('/applications/pending', requireAuth, requireRole(['moderator', 'admin']), async (req, res) => {
  try {
    console.log('📋 Fetching pending applications for:', req.user.username);
    const applications = await storage.getApplications();
    const pendingApplications = applications.filter(app => app.status === 'pending');
    
    console.log('📦 Found pending applications:', pendingApplications.length);
    res.json(pendingApplications);
  } catch (error) {
    console.error('❌ Error fetching pending applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Получение заявок пользователя
router.get('/my-applications', requireAuth, async (req, res) => {
  try {
    console.log('📋 Fetching applications for user:', req.user.username);
    const applications = await storage.getUserApplications(req.user.id);
    
    console.log('📦 Found user applications:', applications.length);
    res.json(applications);
  } catch (error) {
    console.error('❌ Error fetching user applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Обновление статуса заявки (только для модераторов и админов)
router.patch('/applications/:id/status', requireAuth, requireRole(['moderator', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log('🔄 Updating application status:', id, 'to:', status, 'by:', req.user.username);
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const application = await storage.updateApplicationStatus(id, status);
    
    // Если заявка одобрена, создаем объявление
    if (status === 'approved') {
      console.log('✅ Creating car listing from approved application');
      await storage.createCarListing({
        name: application.name,
        price: application.price,
        description: application.description,
        ownerId: application.createdBy,
        applicationId: application.id
      });
    }
    
    res.json(application);
  } catch (error) {
    console.error('❌ Error updating application status:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

// Получение объявлений автомобилей
router.get('/cars', requireAuth, async (req, res) => {
  try {
    console.log('🚗 Fetching car listings...');
    const cars = await storage.getCarListings();
    
    console.log('🚗 Found cars:', cars.length);
    res.json(cars);
  } catch (error) {
    console.error('❌ Error fetching cars:', error);
    res.status(500).json({ error: 'Failed to fetch cars' });
  }
});

// Получение конкретного объявления
router.get('/cars/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🚗 Fetching car:', id);
    
    const car = await storage.getCarListingById(id);
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }
    
    res.json(car);
  } catch (error) {
    console.error('❌ Error fetching car:', error);
    res.status(500).json({ error: 'Failed to fetch car' });
  }
});

// Сообщения
router.post('/messages', requireAuth, async (req, res) => {
  try {
    const { receiverId, content, carId } = req.body;
    console.log('💬 Creating message from:', req.user.username, 'to user:', receiverId);
    
    const message = await storage.createMessage({
      senderId: req.user.id,
      receiverId,
      content,
      carId
    });
    
    res.status(201).json(message);
  } catch (error) {
    console.error('❌ Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

router.get('/messages', requireAuth, async (req, res) => {
  try {
    console.log('💬 Fetching messages for user:', req.user.username);
    const messages = await storage.getUserMessages(req.user.id);
    res.json(messages);
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.patch('/messages/:id/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📖 Marking message as read:', id);
    
    await storage.markMessageAsRead(id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

router.get('/messages/unread-count', requireAuth, async (req, res) => {
  try {
    console.log('📬 Fetching unread count for user:', req.user.username);
    const count = await storage.getUnreadMessageCount(req.user.id);
    console.log('📋 User', req.user.username, 'has', count, 'unread messages');
    res.json({ count });
  } catch (error) {
    console.error('❌ Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Избранное
router.get('/favorites', requireAuth, async (req, res) => {
  try {
    console.log('⭐ Fetching favorites for user:', req.user.username);
    const favorites = await storage.getUserFavorites(req.user.id);
    console.log('📋 User', req.user.username, 'has', favorites.length, 'favorites');
    res.json(favorites);
  } catch (error) {
    console.error('❌ Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

router.post('/favorites/:carId', requireAuth, async (req, res) => {
  try {
    const { carId } = req.params;
    console.log('⭐ Adding to favorites:', carId, 'for user:', req.user.username);
    
    await storage.addToFavorites(req.user.id, carId);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error adding to favorites:', error);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

router.delete('/favorites/:carId', requireAuth, async (req, res) => {
  try {
    const { carId } = req.params;
    console.log('💔 Removing from favorites:', carId, 'for user:', req.user.username);
    
    await storage.removeFromFavorites(req.user.id, carId);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error removing from favorites:', error);
    res.status(500).json({ error: 'Failed to remove from favorites' });
  }
});

// Админские функции
router.get('/admin/users', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    console.log('👥 Admin fetching all users');
    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.patch('/admin/users/:id/role', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    console.log('🔄 Admin updating user role:', id, 'to:', role);
    
    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const user = await storage.updateUserRole(id, role);
    res.json(user);
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Статистика
router.get('/stats/pending-applications', requireAuth, requireRole(['moderator', 'admin']), async (req, res) => {
  try {
    const count = await storage.getPendingApplicationsCount();
    res.json({ count });
  } catch (error) {
    console.error('❌ Error fetching pending applications count:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
