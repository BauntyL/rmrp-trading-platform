const { Client } = require('pg');

// === ИНИЦИАЛИЗАЦИЯ БД ===
async function initializeDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('🗄️ Connected to PostgreSQL database');

    // Создание таблицы пользователей
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Создание таблицы заявок
    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price INTEGER NOT NULL,
        description TEXT,
        category VARCHAR(100),
        server VARCHAR(100),
        "maxSpeed" INTEGER,
        acceleration DECIMAL(3,1),
        drive VARCHAR(50),
        "isPremium" BOOLEAN DEFAULT false,
        phone VARCHAR(50),
        telegram VARCHAR(100),
        discord VARCHAR(100),
        "imageUrl" TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        "createdBy" INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Создание таблицы автомобилей
    await client.query(`
      CREATE TABLE IF NOT EXISTS car_listings (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price INTEGER NOT NULL,
        description TEXT,
        category VARCHAR(100),
        server VARCHAR(100),
        "maxSpeed" INTEGER,
        acceleration DECIMAL(3,1),
        drive VARCHAR(50),
        "isPremium" BOOLEAN DEFAULT false,
        phone VARCHAR(50),
        telegram VARCHAR(100),
        discord VARCHAR(100),
        "imageUrl" TEXT,
        owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Создание таблицы сообщений
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        "senderId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
        "receiverId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
        "carId" INTEGER REFERENCES car_listings(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        "isRead" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Создание таблицы избранного
    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        car_id INTEGER REFERENCES car_listings(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, car_id)
      )
    `);

    // Создание индексов для оптимизации
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages("receiverId");
      CREATE INDEX IF NOT EXISTS idx_messages_car ON messages("carId");
      CREATE INDEX IF NOT EXISTS idx_messages_created ON messages("createdAt");
      CREATE INDEX IF NOT EXISTS idx_car_listings_owner ON car_listings(owner_id);
      CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// === ПОЛЬЗОВАТЕЛИ ===
async function createUser(userData) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = `
      INSERT INTO users (username, password, role)
      VALUES ($1, $2, $3)
      RETURNING id, username, role, created_at
    `;
    
    const result = await client.query(query, [
      userData.username,
      userData.password,
      userData.role || 'user'
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function getUserByUsername(username) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await client.query(query, [username]);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error getting user by username:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function getUserById(id) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await client.query(query, [id]);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error getting user by ID:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function getAllUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = `
      SELECT id, username, role, created_at
      FROM users
      ORDER BY created_at DESC
    `;
    
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting all users:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// === ЗАЯВКИ ===
async function createApplication(applicationData) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    console.log('📝 Creating application with data:', applicationData);
    
    const query = `
      INSERT INTO applications (
        name, price, description, category, server, "maxSpeed", 
        acceleration, drive, "isPremium", phone, telegram, discord, 
        "imageUrl", "createdBy", status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    
    const values = [
      applicationData.name,
      applicationData.price,
      applicationData.description,
      applicationData.category,
      applicationData.server,
      applicationData.maxSpeed || 0,
      applicationData.acceleration || 'Не указано',
      applicationData.drive || 'Не указано',
      applicationData.isPremium || false,
      applicationData.phone || '',
      applicationData.telegram || '',
      applicationData.discord || '',
      applicationData.imageUrl || 'https://via.placeholder.com/400x300?text=Нет+фото',
      applicationData.createdBy,
      applicationData.status || 'pending'
    ];
    
    console.log('📋 Executing query with values:', values);
    
    const result = await client.query(query, values);
    
    console.log('✅ Application created successfully:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating application:', error);
    console.error('❌ Query values were:', [
      applicationData.name,
      applicationData.price,
      applicationData.description,
      applicationData.category,
      applicationData.server,
      applicationData.maxSpeed || 0,
      applicationData.acceleration || 'Не указано',
      applicationData.drive || 'Не указано',
      applicationData.isPremium || false,
      applicationData.phone || '',
      applicationData.telegram || '',
      applicationData.discord || '',
      applicationData.imageUrl || 'https://via.placeholder.com/400x300?text=Нет+фото',
      applicationData.createdBy,
      applicationData.status || 'pending'
    ]);
    throw error;
  } finally {
    await client.end();
  }
}

async function getApplications() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = `
      SELECT a.*, u.username as creator_name
      FROM applications a
      LEFT JOIN users u ON a."createdBy" = u.id
      ORDER BY a.created_at DESC
    `;
    
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting applications:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function getUserApplications(userId) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = `
      SELECT * FROM applications
      WHERE "createdBy" = $1
      ORDER BY created_at DESC
    `;
    
    const result = await client.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting user applications:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function updateApplicationStatus(id, status) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = `
      UPDATE applications
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await client.query(query, [status, id]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error updating application status:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function getPendingApplicationsCount() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = `
      SELECT COUNT(*) as count
      FROM applications
      WHERE status = 'pending'
    `;
    
    const result = await client.query(query);
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error('❌ Error getting pending applications count:', error);
    return 0;
  } finally {
    await client.end();
  }
}

// === АВТОМОБИЛИ ===
async function createCarListing(carData) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = `
      INSERT INTO car_listings (
        name, price, description, category, server, "maxSpeed", 
        acceleration, drive, "isPremium", phone, telegram, discord, 
        "imageUrl", owner_id, application_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    
    const values = [
      carData.name,
      carData.price,
      carData.description,
      carData.category,
      carData.server,
      carData.maxSpeed,
      carData.acceleration,
      carData.drive,
      carData.isPremium || false,
      carData.phone,
      carData.telegram,
      carData.discord,
      carData.imageUrl,
      carData.owner_id,
      carData.application_id || null
    ];
    
    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating car listing:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function getCarListings() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = `
      SELECT c.*, u.username as owner_name
      FROM car_listings c
      LEFT JOIN users u ON c.owner_id = u.id
      ORDER BY c.created_at DESC
    `;
    
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting car listings:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function getCarListingById(id) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = `
      SELECT c.*, u.username as owner_name
      FROM car_listings c
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.id = $1
    `;
    
    const result = await client.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error getting car listing by ID:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function getUserCarListings(userId) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = `
      SELECT c.*, u.username as owner_name
      FROM car_listings c
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.owner_id = $1
      ORDER BY c.created_at DESC
    `;
    
    const result = await client.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting user car listings:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function updateCarListing(id, carData) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = `
      UPDATE car_listings
      SET name = $1, price = $2, description = $3, category = $4, 
          server = $5, "maxSpeed" = $6, acceleration = $7, drive = $8, 
          "isPremium" = $9, phone = $10, telegram = $11, discord = $12, 
          "imageUrl" = $13
      WHERE id = $14
      RETURNING *
    `;
    
    const values = [
      carData.name,
      carData.price,
      carData.description,
      carData.category,
      carData.server,
      carData.maxSpeed,
      carData.acceleration,
      carData.drive,
      carData.isPremium,
      carData.phone,
      carData.telegram,
      carData.discord,
      carData.imageUrl,
      id
    ];
    
    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error updating car listing:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function deleteCarListing(id) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    // Начинаем транзакцию
    await client.query('BEGIN');
    
    // Удаляем связанные сообщения
    await client.query('DELETE FROM messages WHERE "carId" = $1', [id]);
    
    // Удаляем из избранного
    await client.query('DELETE FROM favorites WHERE car_id = $1', [id]);
    
    // Удаляем автомобиль
    const result = await client.query('DELETE FROM car_listings WHERE id = $1 RETURNING *', [id]);
    
    // Подтверждаем транзакцию
    await client.query('COMMIT');
    
    return result.rows[0];
  } catch (error) {
    // Откатываем транзакцию при ошибке
    await client.query('ROLLBACK');
    console.error('❌ Error deleting car listing:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// === СООБЩЕНИЯ ===
async function createMessage(messageData) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = `
      INSERT INTO messages ("senderId", "receiverId", "carId", content, "isRead")
      VALUES ($1, $2, $3, $4, false)
      RETURNING *
    `;
    
    const values = [
      messageData.senderId,
      messageData.receiverId,
      messageData.carId,
      messageData.content
    ];
    
    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating message:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function getMessages(userId) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = `
      SELECT 
        m.*,
        cl.name as car_name,
        sender.username as sender_name,
        receiver.username as receiver_name
      FROM messages m
      LEFT JOIN car_listings cl ON m."carId" = cl.id
      LEFT JOIN users sender ON m."senderId" = sender.id
      LEFT JOIN users receiver ON m."receiverId" = receiver.id
      WHERE m."senderId" = $1 OR m."receiverId" = $1
      ORDER BY m."createdAt" DESC
    `;
    
    const result = await client.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting messages:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function getAllMessages() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = `
      SELECT 
        m.*,
        cl.name as car_name,
        sender.username as sender_name,
        receiver.username as receiver_name
      FROM messages m
      LEFT JOIN car_listings cl ON m."carId" = cl.id
      LEFT JOIN users sender ON m."senderId" = sender.id
      LEFT JOIN users receiver ON m."receiverId" = receiver.id
      ORDER BY m."createdAt" DESC
    `;
    
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting all messages:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function markMessageAsRead(messageId, userId) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = `
      UPDATE messages
      SET "isRead" = true
      WHERE id = $1 AND "receiverId" = $2
      RETURNING *
    `;
    
    const result = await client.query(query, [messageId, userId]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error marking message as read:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function deleteMessage(messageId) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = 'DELETE FROM messages WHERE id = $1 RETURNING *';
    const result = await client.query(query, [messageId]);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error deleting message:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function getUnreadMessageCount(userId) {
  try {
    console.log('📊 Getting unread message count for user:', userId);
    
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();
    
    const query = `
      SELECT COUNT(*) as count
      FROM messages m
      WHERE m."receiverId" = $1 
        AND (m."isRead" = false OR m."isRead" IS NULL)
    `;
    
    const result = await client.query(query, [userId]);
    await client.end();
    
    const count = parseInt(result.rows[0].count) || 0;
    console.log(`✅ Unread message count for user ${userId}: ${count}`);
    
    return count;
  } catch (error) {
    console.error('❌ Error getting unread message count:', error);
    return 0;
  }
}

async function getUnmoderatedMessagesCount() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    // Подсчитываем сообщения с подозрительным содержимым
    const query = `
      SELECT COUNT(*) as count
      FROM messages
      WHERE content ~* 'http|www\.|\.com|\.ru|@|telegram|discord|whatsapp|\+7\d{10}|\d{3}-\d{3}-\d{4}|продам|куплю|обмен'
    `;
    
    const result = await client.query(query);
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error('❌ Error getting unmoderated messages count:', error);
    return 0;
  } finally {
    await client.end();
  }
}

// === ИЗБРАННОЕ ===
async function addToFavorites(userId, carId) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = `
      INSERT INTO favorites (user_id, car_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, car_id) DO NOTHING
      RETURNING *
    `;
    
    const result = await client.query(query, [userId, carId]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error adding to favorites:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function removeFromFavorites(userId, carId) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = `
      DELETE FROM favorites
      WHERE user_id = $1 AND car_id = $2
      RETURNING *
    `;
    
    const result = await client.query(query, [userId, carId]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error removing from favorites:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function getUserFavorites(userId) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    
    const query = `
      SELECT c.*, u.username as owner_name, f.created_at as favorited_at
      FROM favorites f
      JOIN car_listings c ON f.car_id = c.id
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `;
    
    const result = await client.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting user favorites:', error);
    throw error;
  } finally {
    await client.end();
  }
}

module.exports = {
  // Инициализация
  initializeDatabase,
  
  // Пользователи
  createUser,
  getUserByUsername,
  getUserById,
  getAllUsers,
  
  // Заявки
  createApplication,
  getApplications,
  getUserApplications,
  updateApplicationStatus,
  getPendingApplicationsCount,
  
  // Автомобили
  createCarListing,
  getCarListings,
  getCarListingById,
  getUserCarListings,
  updateCarListing,
  deleteCarListing,
  
  // Сообщения
  createMessage,
  getMessages,
  getAllMessages,
  markMessageAsRead,
  deleteMessage,
  getUnreadMessageCount,
  getUnmoderatedMessagesCount,
  
  // Избранное
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
};
