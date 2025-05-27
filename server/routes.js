const express = require('express');
const bcrypt = require('bcrypt');
const storage = require('./storage-fixed');

const router = express.Router();

// Middleware для проверки аутентификации
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

// Аутентификация
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('🔑 Login attempt for:', username);
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const user = await storage.getUserByUsername(username);
    if (!user) {
      console.log('❌ User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      console.log('❌ Invalid password for:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };
    
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
    
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      console.log('❌ User already exists:', username);
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
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

router.get('/user', (req, res) => {
  console.log('👤 User info requested');
  
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

// === ЗАЯВКИ ===
router.post('/applications', requireAuth, async (req, res) => {
  try {
    console.log('📝 Creating application for user:', req.user.username);
    console.log('📋 RAW request body:', req.body);
    
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

router.patch('/applications/:id/status', requireAuth, requireRole(['moderator', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log('🔄 Updating application status:', id, 'to:', status, 'by:', req.user.username);
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const application = await storage.updateApplicationStatus(id, status);
    
    // Создание объявления при одобрении
    if (status === 'approved') {
      console.log('✅ Creating car listing from approved application');
      console.log('📋 Application data for car listing:', application);
      
      try {
        await storage.createCarListing({
          name: application.name,
          price: application.price,
          description: application.description,
          category: application.category,
          server: application.server,
          maxSpeed: application.maxSpeed,
          acceleration: application.acceleration,
          drive: application.drive,
          isPremium: application.isPremium || false,
          phone: application.phone,
          telegram: application.telegram,
          discord: application.discord,
          imageUrl: application.imageUrl,
          owner_id: application.createdBy,
          application_id: application.id
        });
        
        console.log('✅ Car listing created successfully from application');
        
      } catch (carError) {
        console.error('❌ Error creating car listing:', carError);
      }
    }
    
    console.log('✅ Application status updated successfully');
    res.json(application);
    
  } catch (error) {
    console.error('❌ Error updating application status:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// === АВТОМОБИЛИ ===
router.get('/cars', async (req, res) => {
  try {
    console.log('🚗 Fetching all cars');
    const cars = await storage.getCarListings();
    
    console.log(`✅ Found ${cars.length} cars`);
    res.json(cars);
  } catch (error) {
    console.error('❌ Error fetching cars:', error);
    res.status(500).json({ error: 'Failed to fetch cars' });
  }
});

router.get('/my-cars', requireAuth, async (req, res) => {
  try {
    console.log('🚗 Fetching cars for user:', req.user.username);
    
    const cars = await storage.getUserCarListings(req.user.id);
    
    console.log(`✅ Found ${cars.length} cars for user ${req.user.id}`);
    res.json(cars);
    
  } catch (error) {
    console.error('❌ Error fetching user cars:', error);
    res.status(500).json({ error: 'Failed to fetch user cars' });
  }
});

// Обновление автомобиля
router.put('/cars/:id', requireAuth, async (req, res) => {
  try {
    const carId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`✏️ Update car request: ID ${carId} by user ${req.user.username}`);

    if (!carId || isNaN(carId)) {
      return res.status(400).json({ error: 'Неверный ID автомобиля' });
    }

    // Получить информацию об автомобиле
    const car = await storage.getCarListingById(carId);
    
    if (!car) {
      console.log('❌ Car not found:', carId);
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }

    // Проверка прав: владелец или админ
    const isOwner = car.owner_id === userId;
    const canEdit = isOwner || userRole === 'admin';

    if (!canEdit) {
      console.log('❌ Insufficient permissions to edit car:', carId, 'User:', req.user.username);
      return res.status(403).json({ error: 'Недостаточно прав для редактирования этого автомобиля' });
    }

    // Обновить автомобиль
    const updatedCar = await storage.updateCarListing(carId, req.body);

    console.log(`✅ Car ${carId} updated successfully by ${req.user.username}`);
    res.json(updatedCar);

  } catch (error) {
    console.error('❌ Error updating car:', error);
    res.status(500).json({ 
      error: 'Ошибка при обновлении автомобиля',
      details: error.message 
    });
  }
});

// Удаление автомобиля
router.delete('/cars/:id', requireAuth, async (req, res) => {
  try {
    const carId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`🗑️ Delete car request: ID ${carId} by user ${req.user.username} (${userRole})`);

    if (!carId || isNaN(carId)) {
      return res.status(400).json({ error: 'Неверный ID автомобиля' });
    }

    // Получить информацию об автомобиле
    const car = await storage.getCarListingById(carId);
    
    if (!car) {
      console.log('❌ Car not found:', carId);
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }

    // Проверка прав: владелец, админ или модератор
    const isOwner = car.owner_id === userId;
    const canDelete = isOwner || userRole === 'admin' || userRole === 'moderator';

    if (!canDelete) {
      console.log('❌ Insufficient permissions to delete car:', carId, 'User:', req.user.username, 'Role:', userRole);
      return res.status(403).json({ error: 'Недостаточно прав для удаления этого автомобиля' });
    }

    // Удалить автомобиль
    await storage.deleteCarListing(carId);

    console.log(`✅ Car ${carId} deleted successfully by ${req.user.username}`);
    res.json({ message: 'Автомобиль успешно удален' });

  } catch (error) {
    console.error('❌ Error deleting car:', error);
    res.status(500).json({ 
      error: 'Ошибка при удалении автомобиля',
      details: error.message 
    });
  }
});

// === СООБЩЕНИЯ ===
router.get('/messages', requireAuth, async (req, res) => {
  try {
    console.log('📨 Fetching messages for user:', req.user.id);
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    const query = `
      SELECT 
        m.id,
        m."carId",
        m."senderId",
        m."receiverId",
        m.content,
        m."isRead",
        m."createdAt",
        cl.name as "carName",
        cl.owner_id as "sellerId",
        sender.username as "senderName",
        receiver.username as "receiverName",
        CASE 
          WHEN m."senderId" = $1 THEN m."receiverId"
          ELSE m."senderId"
        END as "otherUserId"
      FROM messages m
      LEFT JOIN car_listings cl ON m."carId" = cl.id
      LEFT JOIN users sender ON m."senderId" = sender.id
      LEFT JOIN users receiver ON m."receiverId" = receiver.id
      WHERE m."senderId" = $1 OR m."receiverId" = $1
      ORDER BY m."createdAt" DESC
    `;
    
    const result = await client.query(query, [req.user.id]);
    
    const messages = result.rows.map(row => ({
      id: row.id,
      carId: row.carId,
      buyerId: row.senderId === row.sellerId ? row.receiverId : row.senderId,
      sellerId: row.sellerId,
      senderId: row.senderId,
      recipientId: row.receiverId,
      content: row.content,
      isRead: row.isRead,
      createdAt: row.createdAt,
      carName: row.carName,
      buyerName: row.senderId === row.sellerId ? row.receiverName : row.senderName,
      sellerName: row.senderName
    }));
    
    await client.end();
    
    console.log(`✅ Found ${messages.length} messages for user ${req.user.id}`);
    res.json(messages);
    
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/messages', requireAuth, async (req, res) => {
  try {
    const { carId, sellerId, message } = req.body;
    console.log('📤 Sending message:', { carId, sellerId, message, fromUser: req.user.id });
    
    if (!carId || !sellerId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (message.length > 500) {
      return res.status(400).json({ error: 'Message too long' });
    }
    
    // Простая фильтрация запрещенных слов
    const bannedWords = ['spam', 'реклама', 'развод', 'мошенник'];
    const messageText = message.toLowerCase();
    const containsBannedWord = bannedWords.some(word => messageText.includes(word));
    
    if (containsBannedWord) {
      return res.status(400).json({ error: 'Message contains prohibited content' });
    }
    
    const messageData = {
      senderId: req.user.id,
      receiverId: sellerId,
      content: message,
      carId: carId
    };
    
    const createdMessage = await storage.createMessage(messageData);
    
    console.log('✅ Message sent successfully');
    res.status(201).json(createdMessage);
    
  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.patch('/messages/:id/read', requireAuth, async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    
    await storage.markMessageAsRead(messageId, req.user.id);
    
    console.log(`✅ Message ${messageId} marked as read`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// === ИЗБРАННОЕ ===
router.get('/favorites', requireAuth, async (req, res) => {
  try {
    console.log('❤️ Fetching favorites for user:', req.user.id);
    
    const favorites = await storage.getUserFavorites(req.user.id);
    
    console.log(`✅ Found ${favorites.length} favorites`);
    res.json(favorites);
  } catch (error) {
    console.error('❌ Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

router.post('/favorites/:carId', requireAuth, async (req, res) => {
  try {
    const carId = parseInt(req.params.carId);
    
    console.log('❤️ Adding to favorites:', carId, 'for user:', req.user.id);
    
    await storage.addToFavorites(req.user.id, carId);
    
    console.log('✅ Added to favorites successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error adding to favorites:', error);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

router.delete('/favorites/:carId', requireAuth, async (req, res) => {
  try {
    const carId = parseInt(req.params.carId);
    
    console.log('💔 Removing from favorites:', carId, 'for user:', req.user.id);
    
    await storage.removeFromFavorites(req.user.id, carId);
    
    console.log('✅ Removed from favorites successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error removing from favorites:', error);
    res.status(500).json({ error: 'Failed to remove from favorites' });
  }
});

// === АДМИН/МОДЕРАТОР ===
router.get('/admin/stats', requireAuth, requireRole(['moderator', 'admin']), async (req, res) => {
  try {
    console.log('📊 Fetching stats for:', req.user.username);
    
    const pendingApplications = await storage.getPendingApplicationsCount();
    const unmoderatedMessages = await storage.getUnmoderatedMessagesCount();
    
    const stats = {
      pendingApplications,
      unmoderatedMessages
    };
    
    console.log('✅ Stats fetched:', stats);
    res.json(stats);
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/admin/users', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    console.log('👥 Fetching all users for admin:', req.user.username);
    
    const users = await storage.getAllUsers();
    
    console.log(`✅ Found ${users.length} users`);
    res.json(users);
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/admin/messages', requireAuth, requireRole(['moderator', 'admin']), async (req, res) => {
  try {
    console.log('💬 Fetching all messages for moderation');
    
    const messages = await storage.getAllMessages();
    
    console.log(`✅ Found ${messages.length} messages`);
    res.json(messages);
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.delete('/admin/messages/:id', requireAuth, requireRole(['moderator', 'admin']), async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    
    console.log('🗑️ Deleting message:', messageId, 'by moderator:', req.user.username);
    
    await storage.deleteMessage(messageId);
    
    console.log('✅ Message deleted successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
