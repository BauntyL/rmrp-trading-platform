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

// === ИЗБРАННОЕ (FAVORITES) ===

// Получение избранного пользователя
router.get('/favorites', requireAuth, async (req, res) => {
  try {
    console.log('❤️ Fetching favorites for user:', req.user.username);
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    // Создаем таблицу избранного если её нет
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, car_id)
      )
    `);
    
    // Получаем избранные автомобили с полной информацией
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
        f.created_at as "favoriteAddedAt"
      FROM favorites f
      JOIN cars c ON f.car_id = c.id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `;
    
    const result = await client.query(query, [req.user.id]);
    await client.end();
    
    console.log(`✅ Found ${result.rows.length} favorites for user`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Добавление в избранное
router.post('/favorites/:carId', requireAuth, async (req, res) => {
  try {
    const { carId } = req.params;
    console.log('❤️ Adding car to favorites:', carId, 'for user:', req.user.username);
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    // Создаем таблицу избранного если её нет
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, car_id)
      )
    `);
    
    // Проверяем, существует ли автомобиль
    const carCheck = await client.query('SELECT id FROM cars WHERE id = $1', [parseInt(carId)]);
    if (carCheck.rows.length === 0) {
      await client.end();
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }
    
    // Добавляем в избранное (ON CONFLICT DO NOTHING для избежания дублей)
    const insertQuery = `
      INSERT INTO favorites (user_id, car_id, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id, car_id) DO NOTHING
      RETURNING *
    `;
    
    const result = await client.query(insertQuery, [req.user.id, parseInt(carId)]);
    await client.end();
    
    if (result.rows.length > 0) {
      console.log('✅ Car added to favorites successfully');
      res.json({ message: 'Добавлено в избранное', favorite: result.rows[0] });
    } else {
      console.log('ℹ️ Car already in favorites');
      res.json({ message: 'Уже в избранном' });
    }
    
  } catch (error) {
    console.error('❌ Error adding to favorites:', error);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

// Удаление из избранного
router.delete('/favorites/:carId', requireAuth, async (req, res) => {
  try {
    const { carId } = req.params;
    console.log('💔 Removing car from favorites:', carId, 'for user:', req.user.username);
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    const deleteQuery = `
      DELETE FROM favorites 
      WHERE user_id = $1 AND car_id = $2
      RETURNING *
    `;
    
    const result = await client.query(deleteQuery, [req.user.id, parseInt(carId)]);
    await client.end();
    
    if (result.rows.length > 0) {
      console.log('✅ Car removed from favorites successfully');
      res.json({ message: 'Удалено из избранного' });
    } else {
      console.log('ℹ️ Car was not in favorites');
      res.status(404).json({ error: 'Автомобиль не был в избранном' });
    }
    
  } catch (error) {
    console.error('❌ Error removing from favorites:', error);
    res.status(500).json({ error: 'Failed to remove from favorites' });
  }
});

// Проверка, находится ли автомобиль в избранном
router.get('/favorites/:carId/check', requireAuth, async (req, res) => {
  try {
    const { carId } = req.params;
    
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    const query = `
      SELECT id FROM favorites 
      WHERE user_id = $1 AND car_id = $2
    `;
    
    const result = await client.query(query, [req.user.id, parseInt(carId)]);
    await client.end();
    
    res.json({ isFavorite: result.rows.length > 0 });
    
  } catch (error) {
    console.error('❌ Error checking favorite status:', error);
    res.json({ isFavorite: false });
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

module.exports = router;
