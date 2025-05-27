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
      return res.status(400).json({ error: 'Сообщение слишком длинное (максимум 500 символов)' });
    }
    
    // Проверка на запрещенные слова
    const bannedWords = ['мат', 'политика', 'http', 'www'];
    const containsBanned = bannedWords.some(word => 
      message.toLowerCase().includes(word.toLowerCase())
    );
    
    if (containsBanned) {
      return res.status(400).json({ 
        error: 'Сообщение содержит запрещенные слова или ссылки' 
      });
    }
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    const insertQuery = `
      INSERT INTO messages ("senderId", "receiverId", "carId", content, "isRead", "createdAt")
      VALUES ($1, $2, $3, $4, false, NOW())
      RETURNING *
    `;
    
    const result = await client.query(insertQuery, [
      req.user.id,
      sellerId,     
      carId,
      message
    ]);
    
    await client.end();
    
    console.log('✅ Message sent successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.post('/messages/mark-read', requireAuth, async (req, res) => {
  try {
    const { carId } = req.body;
    console.log('📖 Marking messages as read:', { carId, userId: req.user.id });
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    const updateQuery = `
      UPDATE messages 
      SET "isRead" = true 
      WHERE "carId" = $1 
        AND "receiverId" = $2
        AND "isRead" = false
    `;
    
    const result = await client.query(updateQuery, [carId, req.user.id]);
    
    await client.end();
    
    console.log(`✅ Marked ${result.rowCount} messages as read`);
    res.json({ 
      success: true, 
      messagesMarked: result.rowCount 
    });
    
  } catch (error) {
    console.error('❌ Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

router.get('/messages/unread-count', requireAuth, async (req, res) => {
  try {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    const countQuery = `
      SELECT COUNT(*) as count
      FROM messages 
      WHERE "receiverId" = $1 AND "isRead" = false
    `;
    
    const result = await client.query(countQuery, [req.user.id]);
    await client.end();
    
    const count = parseInt(result.rows[0].count) || 0;
    console.log(`📬 Unread messages count for user ${req.user.id}: ${count}`);
    
    res.json({ count });
    
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// === ИЗБРАННОЕ ===
router.post('/favorites/:carId', requireAuth, async (req, res) => {
  try {
    const carId = parseInt(req.params.carId);
    const userId = req.user.id;
    
    console.log('❤️ Adding to favorites:', { carId, userId });
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    // Проверяем, есть ли уже в избранном
    const checkQuery = `
      SELECT id FROM favorites 
      WHERE "userId" = $1 AND "carId" = $2
    `;
    const checkResult = await client.query(checkQuery, [userId, carId]);
    
    if (checkResult.rows.length > 0) {
      await client.end();
      return res.status(400).json({ error: 'Already in favorites' });
    }
    
    // Добавляем в избранное
    const insertQuery = `
      INSERT INTO favorites ("userId", "carId", "createdAt")
      VALUES ($1, $2, NOW())
      RETURNING *
    `;
    const result = await client.query(insertQuery, [userId, carId]);
    
    await client.end();
    
    console.log('✅ Added to favorites successfully');
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error adding to favorites:', error);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

router.delete('/favorites/:carId', requireAuth, async (req, res) => {
  try {
    const carId = parseInt(req.params.carId);
    const userId = req.user.id;
    
    console.log('💔 Removing from favorites:', { carId, userId });
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    const deleteQuery = `
      DELETE FROM favorites 
      WHERE "userId" = $1 AND "carId" = $2
      RETURNING *
    `;
    const result = await client.query(deleteQuery, [userId, carId]);
    
    await client.end();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not in favorites' });
    }
    
    console.log('✅ Removed from favorites successfully');
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ Error removing from favorites:', error);
    res.status(500).json({ error: 'Failed to remove from favorites' });
  }
});

router.get('/favorites', requireAuth, async (req, res) => {
  try {
    console.log('❤️ Fetching favorites for user:', req.user.id);
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    const query = `
      SELECT cl.*, u.username as "createdByUsername"
      FROM favorites f
      JOIN car_listings cl ON f."carId" = cl.id
      LEFT JOIN users u ON cl.owner_id = u.id
      WHERE f."userId" = $1
      ORDER BY f."createdAt" DESC
    `;
    
    const result = await client.query(query, [req.user.id]);
    
    const favorites = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      price: row.price,
      description: row.description,
      category: row.category,
      server: row.server,
      maxSpeed: row.maxSpeed,
      acceleration: row.acceleration,
      drive: row.drive,
      isPremium: row.isPremium,
      phone: row.phone,
      telegram: row.telegram,
      discord: row.discord,
      imageUrl: row.imageUrl,
      createdBy: row.owner_id,
      createdByUsername: row.createdByUsername,
      createdAt: row.created_at,
      status: 'approved' // Только одобренные автомобили в избранном
    }));
    
    await client.end();
    
    console.log(`✅ Found ${favorites.length} favorites`);
    res.json(favorites);
    
  } catch (error) {
    console.error('❌ Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// === АВТОМОБИЛИ ===
router.get('/cars', async (req, res) => {
  try {
    const { search, category, server } = req.query;
    console.log('🚗 Fetching cars with filters:', { search, category, server });
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    let query = `
      SELECT cl.*, u.username as "createdByUsername"
      FROM car_listings cl
      LEFT JOIN users u ON cl.owner_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (cl.name ILIKE $${params.length} OR cl.description ILIKE $${params.length})`;
    }
    
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND cl.category = $${params.length}`;
    }
    
    if (server && server !== 'all') {
      params.push(server);
      query += ` AND cl.server = $${params.length}`;
    }
    
    query += ` ORDER BY cl.created_at DESC`;
    
    const result = await client.query(query, params);
    
    const cars = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      price: row.price,
      description: row.description,
      category: row.category,
      server: row.server,
      maxSpeed: row.maxSpeed,
      acceleration: row.acceleration,
      drive: row.drive,
      isPremium: row.isPremium,
      phone: row.phone,
      telegram: row.telegram,
      discord: row.discord,
      imageUrl: row.imageUrl,
      createdBy: row.owner_id,
      owner_id: row.owner_id,
      createdByUsername: row.createdByUsername,
      createdAt: row.created_at,
      status: 'approved' // Все автомобили в каталоге одобрены
    }));
    
    await client.end();
    
    console.log(`✅ Found ${cars.length} cars`);
    res.json(cars);
    
  } catch (error) {
    console.error('❌ Error fetching cars:', error);
    res.status(500).json({ error: 'Failed to fetch cars' });
  }
});

router.get('/my-cars', requireAuth, async (req, res) => {
  try {
    console.log('🚗 Fetching my cars for user:', req.user.id);
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    const query = `
      SELECT cl.*, u.username as "createdByUsername"
      FROM car_listings cl
      LEFT JOIN users u ON cl.owner_id = u.id
      WHERE cl.owner_id = $1
      ORDER BY cl.created_at DESC
    `;
    
    const result = await client.query(query, [req.user.id]);
    
    const cars = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      price: row.price,
      description: row.description,
      category: row.category,
      server: row.server,
      maxSpeed: row.maxSpeed,
      acceleration: row.acceleration,
      drive: row.drive,
      isPremium: row.isPremium,
      phone: row.phone,
      telegram: row.telegram,
      discord: row.discord,
      imageUrl: row.imageUrl,
      createdBy: row.owner_id,
      owner_id: row.owner_id,
      createdByUsername: row.createdByUsername,
      createdAt: row.created_at,
      status: 'approved'
    }));
    
    await client.end();
    
    console.log(`✅ Found ${cars.length} cars for user`);
    res.json(cars);
    
  } catch (error) {
    console.error('❌ Error fetching my cars:', error);
    res.status(500).json({ error: 'Failed to fetch my cars' });
  }
});

router.put('/cars/:id', requireAuth, async (req, res) => {
  try {
    const carId = parseInt(req.params.id);
    const userId = req.user.id;
    
    console.log('✏️ Editing car:', { carId, userId });
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    // Проверяем права доступа
    const checkQuery = `
      SELECT owner_id FROM car_listings WHERE id = $1
    `;
    const checkResult = await client.query(checkQuery, [carId]);
    
    if (checkResult.rows.length === 0) {
      await client.end();
      return res.status(404).json({ error: 'Car not found' });
    }
    
    const carOwnerId = checkResult.rows[0].owner_id;
    const isOwner = carOwnerId === userId;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'moderator';
    
    if (!isOwner && !isAdmin) {
      await client.end();
      return res.status(403).json({ error: 'You can only edit your own cars' });
    }
    
    const {
      name, price, description, category, server, maxSpeed,
      acceleration, drive, isPremium, phone, telegram, discord, imageUrl
    } = req.body;
    
    const updateQuery = `
      UPDATE car_listings SET 
        name = $1,
        price = $2,
        description = $3,
        category = $4,
        server = $5,
        "maxSpeed" = $6,
        acceleration = $7,
        drive = $8,
        "isPremium" = $9,
        phone = $10,
        telegram = $11,
        discord = $12,
        "imageUrl" = $13
      WHERE id = $14
      RETURNING *
    `;
    
    const result = await client.query(updateQuery, [
      name, price, description, category, server, maxSpeed,
      acceleration, drive, isPremium, phone, telegram, discord, imageUrl, carId
    ]);
    
    await client.end();
    
    console.log('✅ Car updated successfully');
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error updating car:', error);
    res.status(500).json({ error: 'Failed to update car' });
  }
});

router.delete('/cars/:id', requireAuth, async (req, res) => {
  try {
    const carId = parseInt(req.params.id);
    const userId = req.user.id;
    
    console.log('🗑️ Deleting car:', { carId, userId });
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    // Проверяем права доступа
    const checkQuery = `
      SELECT owner_id FROM car_listings WHERE id = $1
    `;
    const checkResult = await client.query(checkQuery, [carId]);
    
    if (checkResult.rows.length === 0) {
      await client.end();
      return res.status(404).json({ error: 'Car not found' });
    }
    
    const carOwnerId = checkResult.rows[0].owner_id;
    const isOwner = carOwnerId === userId;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'moderator';
    
    if (!isOwner && !isAdmin) {
      await client.end();
      return res.status(403).json({ error: 'You can only delete your own cars' });
    }
    
    // Удаляем автомобиль
    const deleteQuery = `
      DELETE FROM car_listings WHERE id = $1
    `;
    await client.query(deleteQuery, [carId]);
    
    await client.end();
    
    console.log('✅ Car deleted successfully');
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ Error deleting car:', error);
    res.status(500).json({ error: 'Failed to delete car' });
  }
});

// === УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ (только для админов) ===
router.get('/users', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    console.log('👥 Fetching users for admin:', req.user.username);
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    const query = `
      SELECT id, username, role, created_at
      FROM users 
      ORDER BY created_at DESC
    `;
    
    const result = await client.query(query);
    await client.end();
    
    console.log(`✅ Found ${result.rows.length} users`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.patch('/users/:id/role', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    
    console.log('🔄 Updating user role:', { userId, role, by: req.user.username });
    
    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Не позволяем изменить роль самому себе
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    const updateQuery = `
      UPDATE users 
      SET role = $1 
      WHERE id = $2 
      RETURNING id, username, role
    `;
    
    const result = await client.query(updateQuery, [role, userId]);
    await client.end();
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ User role updated successfully');
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

router.delete('/users/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    console.log('🗑️ Deleting user:', { userId, by: req.user.username });
    
    // Не позволяем удалить самого себя
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    // Удаляем пользователя (связанные данные удалятся автоматически через CASCADE)
    const deleteQuery = `
      DELETE FROM users WHERE id = $1
    `;
    const result = await client.query(deleteQuery, [userId]);
    
    await client.end();
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ User deleted successfully');
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
