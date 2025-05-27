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

// === АВТОМОБИЛИ (CARS) ===

// Получение всех автомобилей
router.get('/cars', async (req, res) => {
  try {
    console.log('🚗 Fetching all cars');
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    // Создаем таблицу cars если её нет
    await client.query(`
      CREATE TABLE IF NOT EXISTS cars (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        server TEXT NOT NULL,
        category TEXT NOT NULL,
        drive_type TEXT,
        server_id TEXT NOT NULL,
        price INTEGER NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT,
        contact_info TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    const query = `
      SELECT 
        c.id,
        c.name,
        c.server,
        c.category,
        c.drive_type as "driveType",
        c.server_id as "serverId",
        c.price,
        c.description,
        c.image_url as "imageUrl",
        c.contact_info as "contactInfo",
        c.user_id as "userId",
        c.status,
        c.created_at as "createdAt",
        u.username
      FROM cars c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC
    `;
    
    const result = await client.query(query);
    await client.end();
    
    console.log(`✅ Found ${result.rows.length} cars`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Error fetching cars:', error);
    res.status(500).json({ error: 'Failed to fetch cars', details: error.message });
  }
});

// Добавление автомобиля
router.post('/cars', requireAuth, async (req, res) => {
  try {
    const { 
      name, 
      server, 
      category, 
      driveType, 
      serverId, 
      price, 
      description, 
      imageUrl, 
      contactInfo 
    } = req.body;

    console.log('🚗 Adding car for user:', req.user.username);
    console.log('📋 Car data:', req.body);

    // Валидация обязательных полей
    if (!name || !server || !category || !serverId || !price || !description || !contactInfo) {
      return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
    }

    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    // ТОЛЬКО создаем таблицу если её нет - НЕ УДАЛЯЕМ существующую
    await client.query(`
      CREATE TABLE IF NOT EXISTS cars (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        server TEXT NOT NULL,
        category TEXT NOT NULL,
        drive_type TEXT,
        server_id TEXT NOT NULL,
        price INTEGER NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT,
        contact_info TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Ensured cars table exists');
    
    // ПРОСТО добавляем новую запись
    const insertQuery = `
      INSERT INTO cars (
        name, server, category, drive_type, server_id, 
        price, description, image_url, contact_info, 
        user_id, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING 
        id,
        name,
        server,
        category,
        drive_type as "driveType",
        server_id as "serverId",
        price,
        description,
        image_url as "imageUrl",
        contact_info as "contactInfo",
        user_id as "userId",
        status,
        created_at as "createdAt"
    `;
    
    const result = await client.query(insertQuery, [
      name, 
      server, 
      category, 
      driveType || null, 
      serverId,
      parseInt(price), 
      description, 
      imageUrl || null, 
      contactInfo,
      req.user.id, 
      'pending'
    ]);
    
    await client.end();
    
    console.log('✅ Car added successfully:', result.rows[0].id);
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error adding car:', error);
    res.status(500).json({ 
      error: 'Ошибка при добавлении автомобиля', 
      details: error.message 
    });
  }
});

// Получение автомобилей пользователя
router.get('/cars/my', requireAuth, async (req, res) => {
  try {
    console.log('🚗 Fetching cars for user:', req.user.username);
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    const query = `
      SELECT 
        id,
        name,
        server,
        category,
        drive_type as "driveType",
        server_id as "serverId",
        price,
        description,
        image_url as "imageUrl",
        contact_info as "contactInfo",
        user_id as "userId",
        status,
        created_at as "createdAt"
      FROM cars 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await client.query(query, [req.user.id]);
    await client.end();
    
    console.log(`✅ Found ${result.rows.length} cars for user`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Error fetching user cars:', error);
    res.status(500).json({ error: 'Failed to fetch user cars', details: error.message });
  }
});

// Модерация автомобиля
router.patch('/cars/:id/moderate', requireAuth, requireRole(['moderator', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' или 'reject'

    console.log('🔄 Moderating car:', id, 'action:', action, 'by:', req.user.username);

    const status = action === 'approve' ? 'approved' : 'rejected';
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    const updateQuery = `
      UPDATE cars 
      SET status = $1 
      WHERE id = $2 
      RETURNING 
        id,
        name,
        server,
        category,
        drive_type as "driveType",
        server_id as "serverId",
        price,
        description,
        image_url as "imageUrl",
        contact_info as "contactInfo",
        user_id as "userId",
        status,
        created_at as "createdAt"
    `;
    
    const result = await client.query(updateQuery, [status, parseInt(id)]);
    await client.end();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Автомобиль не найден" });
    }

    console.log('✅ Car moderation completed');
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error moderating car:', error);
    res.status(500).json({ error: "Ошибка при модерации автомобиля", details: error.message });
  }
});

// Получение избранного (заглушка)
router.get('/favorites', requireAuth, async (req, res) => {
  try {
    console.log('❤️ Fetching favorites for user:', req.user.username);
    // Пока возвращаем пустой массив
    res.json([]);
  } catch (error) {
    console.error('❌ Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Получение количества непрочитанных сообщений
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    const query = `
      SELECT COUNT(*) as count 
      FROM messages 
      WHERE "receiverId" = $1 AND "isRead" = false
    `;
    
    const result = await client.query(query, [req.user.id]);
    await client.end();
    
    res.json({ count: parseInt(result.rows[0].count) });
    
  } catch (error) {
    console.error('❌ Error fetching unread count:', error);
    res.json({ count: 0 }); // Возвращаем 0 при ошибке
  }
});

// Заявки
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

// СОЗДАНИЕ ОБЪЯВЛЕНИЯ СО ВСЕМИ ПОЛЯМИ И ИЗОБРАЖЕНИЕМ
router.patch('/applications/:id/status', requireAuth, requireRole(['moderator', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log('🔄 Updating application status:', id, 'to:', status, 'by:', req.user.username);
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const application = await storage.updateApplicationStatus(id, status);
    
    // СОЗДАНИЕ ОБЪЯВЛЕНИЯ СО ВСЕМИ ПОЛЯМИ
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
        // Не возвращаем ошибку, продолжаем выполнение
      }
    }
    
    console.log('✅ Application status updated successfully');
    res.json(application);
    
  } catch (error) {
    console.error('❌ Error updating application status:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// === ИСПРАВЛЕННЫЕ СООБЩЕНИЯ ===
// Получение всех сообщений пользователя
router.get('/messages', requireAuth, async (req, res) => {
  try {
    console.log('📨 Fetching messages for user:', req.user.id);
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    // Получаем все сообщения с информацией об автомобилях и пользователях
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
    
    // Форматируем ответ для фронтенда
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
    res.json([]); // Возвращаем пустой массив при ошибке
  }
});

// Отправка сообщения
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
    const bannedWords = ['мат', 'политика', 'http', 'www', 'telegram', '@'];
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
    
    // Вставляем сообщение
    const insertQuery = `
      INSERT INTO messages ("senderId", "receiverId", "carId", content, "isRead", "createdAt")
      VALUES ($1, $2, $3, $4, false, NOW())
      RETURNING *
    `;
    
    const result = await client.query(insertQuery, [req.user.id, sellerId, carId, message]);
    await client.end();
    
    console.log('✅ Message sent successfully');
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Отметка сообщения как прочитанного
router.patch('/messages/:id/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    const updateQuery = `
      UPDATE messages 
      SET "isRead" = true 
      WHERE id = $1 AND "receiverId" = $2
      RETURNING *
    `;
    
    const result = await client.query(updateQuery, [id, req.user.id]);
    await client.end();
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

module.exports = router;
