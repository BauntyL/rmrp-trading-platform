const { getClient } = require('./db');

// Вспомогательные функции для пользователей
async function getUserByUsername(username) {
  try {
    const client = getClient();
    const result = await client.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error getting user by username:', error);
    throw error;
  }
}

async function getUserById(id) {
  try {
    const client = getClient();
    const result = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error getting user by ID:', error);
    throw error;
  }
}

async function createUser(userData) {
  try {
    const client = getClient();
    const { username, password, role = 'user' } = userData;
    
    const result = await client.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *',
      [username, password, role]
    );
    
    console.log(`✅ User created: ${username}`);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw error;
  }
}

async function getAllUsers() {
  try {
    const client = getClient();
    const result = await client.query(
      'SELECT id, username, role, "createdAt" FROM users ORDER BY "createdAt" DESC'
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting all users:', error);
    throw error;
  }
}

// ПОЛНАЯ ФУНКЦИЯ СОЗДАНИЯ ЗАЯВКИ
async function createApplication(applicationData) {
  try {
    const client = getClient();
    const { 
      name, 
      price, 
      description, 
      createdBy, 
      status = 'pending',
      category,
      server,
      maxSpeed,
      acceleration,
      drive,
      serverId,
      phone,
      telegram,
      discord,
      imageUrl,
      isPremium = false
    } = applicationData;
    
    console.log('📝 Creating application with ALL data:', applicationData);
    
    const result = await client.query(
      `INSERT INTO car_applications (
        name, price, description, "createdBy", status, "createdAt",
        category, server, "maxSpeed", acceleration, drive, 
        "serverId", phone, telegram, discord, "imageUrl", "isPremium"
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
      RETURNING *`,
      [
        name, price, description, createdBy, status,
        category, server, maxSpeed, acceleration, drive,
        serverId, phone, telegram, discord, imageUrl, isPremium
      ]
    );
    
    console.log(`✅ Application created with all fields:`, result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating application:', error);
    throw error;
  }
}

async function getApplications() {
  try {
    const client = getClient();
    
    const result = await client.query(`
      SELECT 
        a.*,
        u.username as creator_name
      FROM car_applications a
      LEFT JOIN users u ON a."createdBy" = u.id
      ORDER BY a."createdAt" DESC
    `);
    
    console.log(`✅ Found applications: ${result.rows.length}`);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting applications:', error);
    throw error;
  }
}

async function getUserApplications(userId) {
  try {
    const client = getClient();
    
    const result = await client.query(
      'SELECT * FROM car_applications WHERE "createdBy" = $1 ORDER BY "createdAt" DESC',
      [userId]
    );
    
    console.log(`✅ Found user applications: ${result.rows.length}`);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting user applications:', error);
    throw error;
  }
}

async function updateApplicationStatus(id, status) {
  try {
    const client = getClient();
    const result = await client.query(
      `UPDATE car_applications 
       SET status = $1 
       WHERE id = $2 RETURNING *`,
      [status, id]
    );
    
    console.log(`✅ Application ${id} status updated to: ${status}`);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error updating application status:', error);
    throw error;
  }
}

// ПОЛНАЯ ФУНКЦИЯ СОЗДАНИЯ ОБЪЯВЛЕНИЯ
async function createCarListing(carData) {
  try {
    const client = getClient();
    const { 
      name, 
      price, 
      description, 
      owner_id, 
      application_id,
      category,
      server,
      maxSpeed,
      acceleration,
      drive,
      isPremium = false,
      phone,
      telegram,
      discord,
      imageUrl
    } = carData;
    
    console.log('🚗 Creating car listing with ALL fields:', carData);
    
    const result = await client.query(
      `INSERT INTO car_listings (
        name, price, description, owner_id, application_id, created_at,
        category, server, "maxSpeed", acceleration, drive, "isPremium",
        phone, telegram, discord, "imageUrl"
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
      RETURNING *`,
      [name, price, description, owner_id, application_id, category, server, maxSpeed, acceleration, drive, isPremium, phone, telegram, discord, imageUrl]
    );
    
    console.log(`✅ Car listing created with all fields:`, result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating car listing:', error);
    throw error;
  }
}

async function getCarListings() {
  try {
    const client = getClient();
    
    const result = await client.query(`
      SELECT 
        c.*,
        u.username as owner_name
      FROM car_listings c
      LEFT JOIN users u ON c.owner_id = u.id
      ORDER BY c.created_at DESC
    `);
    
    console.log(`✅ Found car listings: ${result.rows.length}`);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting car listings:', error);
    throw error;
  }
}

async function getCarListingById(id) {
  try {
    const client = getClient();
    
    const result = await client.query(`
      SELECT 
        c.*,
        u.username as owner_name
      FROM car_listings c
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.id = $1
    `, [id]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error getting car listing by ID:', error);
    throw error;
  }
}

async function updateCarListing(carId, updateData) {
  try {
    const client = getClient();
    console.log('✏️ Storage: Updating car listing:', carId, 'with data:', updateData);
    
    // Преобразуем входные данные к нужным названиям полей
    const { 
      name, 
      price, 
      description, 
      category,
      server,
      maxSpeed,
      acceleration,
      drive,
      isPremium,
      phone,
      telegram,
      discord,
      imageUrl
    } = updateData;
    
    const result = await client.query(
      `UPDATE car_listings 
       SET name = $1, price = $2, description = $3, category = $4, 
           server = $5, "maxSpeed" = $6, acceleration = $7, drive = $8, "isPremium" = $9,
           phone = $10, telegram = $11, discord = $12, "imageUrl" = $13
       WHERE id = $14 
       RETURNING *`,
      [name, price, description, category, server, maxSpeed, acceleration, drive, isPremium, 
       phone, telegram, discord, imageUrl, carId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Car listing not found');
    }
    
    console.log('✅ Storage: Car listing updated successfully:', carId);
    return result.rows[0];
    
  } catch (error) {
    console.error('❌ Storage: Error updating car listing:', error);
    throw error;
  }
}

async function deleteCarListing(carId) {
  try {
    const client = getClient();
    console.log('🗑️ Storage: Deleting car listing:', carId);
    
    // Сначала удаляем связанные сообщения
    await client.query('DELETE FROM messages WHERE "carId" = $1', [carId]);
    
    // Удаляем из избранного
    await client.query('DELETE FROM favorites WHERE "carId" = $1', [carId]);
    
    // Удаляем само объявление
    const result = await client.query(
      'DELETE FROM car_listings WHERE id = $1 RETURNING *', 
      [carId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Car listing not found');
    }
    
    console.log('✅ Storage: Car listing deleted successfully:', carId);
    return result.rows[0];
    
  } catch (error) {
    console.error('❌ Storage: Error deleting car listing:', error);
    throw error;
  }
}

async function getUserCarListings(userId) {
  try {
    const client = getClient();
    
    const result = await client.query(`
      SELECT 
        c.*,
        u.username as owner_name
      FROM car_listings c
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.owner_id = $1
      ORDER BY c.created_at DESC
    `, [userId]);
    
    console.log(`✅ Found user car listings: ${result.rows.length} for user ${userId}`);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting user car listings:', error);
    throw error;
  }
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ СООБЩЕНИЙ
async function createMessage(messageData) {
  try {
    const client = getClient();
    const { senderId, receiverId, content, carId } = messageData;
    
    console.log('💬 Creating message:', { senderId, receiverId, content, carId });
    
    // СОЗДАЕМ СООБЩЕНИЕ С ПОЛНОЙ ИНФОРМАЦИЕЙ
    const result = await client.query(
      `INSERT INTO messages ("senderId", "receiverId", content, "carId", "createdAt", "isRead") 
       VALUES ($1, $2, $3, $4, NOW(), FALSE) RETURNING *`,
      [senderId, receiverId, content, carId]
    );
    
    console.log(`✅ Message created successfully:`, result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating message:', error);
    throw error;
  }
}

async function getUserMessages(userId) {
  try {
    const client = getClient();
    
    const result = await client.query(`
      SELECT 
        m.*,
        s.username as sender_name,
        r.username as receiver_name,
        c.name as car_name
      FROM messages m
      LEFT JOIN users s ON m."senderId" = s.id
      LEFT JOIN users r ON m."receiverId" = r.id
      LEFT JOIN car_listings c ON m."carId" = c.id
      WHERE m."senderId" = $1 OR m."receiverId" = $1
      ORDER BY m."createdAt" DESC
    `, [userId]);
    
    console.log(`✅ Found user messages: ${result.rows.length}`);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting user messages:', error);
    throw error;
  }
}

async function markMessageAsRead(messageId, userId) {
  try {
    const client = getClient();
    
    await client.query(
      'UPDATE messages SET "isRead" = true WHERE id = $1 AND "receiverId" = $2',
      [messageId, userId]
    );
    
    console.log(`✅ Message ${messageId} marked as read`);
  } catch (error) {
    console.error('❌ Error marking message as read:', error);
    throw error;
  }
}

async function getUnreadMessageCount(userId) {
  try {
    const client = getClient();
    
    const result = await client.query(
      'SELECT COUNT(*) as count FROM messages WHERE "receiverId" = $1 AND ("isRead" = false OR "isRead" IS NULL)',
      [userId]
    );
    
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('❌ Error getting unread message count:', error);
    return 0;
  }
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ ИЗБРАННОГО
async function getUserFavorites(userId) {
  try {
    const client = getClient();
    
    const result = await client.query(`
      SELECT 
        c.*,
        u.username as owner_name
      FROM favorites f
      JOIN car_listings c ON f."carId" = c.id
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE f."userId" = $1
      ORDER BY f."createdAt" DESC
    `, [userId]);
    
    console.log(`✅ Found user favorites: ${result.rows.length}`);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting user favorites:', error);
    return [];
  }
}

async function addToFavorites(userId, carId) {
  try {
    const client = getClient();
    
    // ПРОВЕРЯЕМ ЧТО АВТОМОБИЛЬ СУЩЕСТВУЕТ
    const carExists = await client.query('SELECT id FROM car_listings WHERE id = $1', [carId]);
    if (carExists.rows.length === 0) {
      throw new Error('Car not found');
    }
    
    // ДОБАВЛЯЕМ В ИЗБРАННОЕ
    await client.query(
      'INSERT INTO favorites ("userId", "carId", "createdAt") VALUES ($1, $2, NOW()) ON CONFLICT ("userId", "carId") DO NOTHING',
      [userId, carId]
    );
    
    console.log(`✅ Car ${carId} added to favorites for user ${userId}`);
  } catch (error) {
    console.error('❌ Error adding to favorites:', error);
    throw error;
  }
}

async function removeFromFavorites(userId, carId) {
  try {
    const client = getClient();
    
    await client.query(
      'DELETE FROM favorites WHERE "userId" = $1 AND "carId" = $2',
      [userId, carId]
    );
    
    console.log(`✅ Car ${carId} removed from favorites for user ${userId}`);
  } catch (error) {
    console.error('❌ Error removing from favorites:', error);
    throw error;
  }
}

// Статистика
async function getPendingApplicationsCount() {
  try {
    const client = getClient();
    const result = await client.query(
      'SELECT COUNT(*) as count FROM car_applications WHERE status = $1',
      ['pending']
    );
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('❌ Error getting pending applications count:', error);
    return 0;
  }
}

async function getUnmoderatedMessagesCount() {
  try {
    const client = getClient();
    const result = await client.query(
      'SELECT COUNT(*) as count FROM messages WHERE "isModerated" = false OR "isModerated" IS NULL'
    );
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('❌ Error getting unmoderated messages count:', error);
    return 0;
  }
}

async function getAllMessages() {
  try {
    const client = getClient();
    
    const result = await client.query(`
      SELECT 
        m.*,
        s.username as sender_name,
        r.username as receiver_name,
        c.name as car_name
      FROM messages m
      LEFT JOIN users s ON m."senderId" = s.id
      LEFT JOIN users r ON m."receiverId" = r.id
      LEFT JOIN car_listings c ON m."carId" = c.id
      ORDER BY m."createdAt" DESC
    `);
    
    console.log(`✅ Found all messages: ${result.rows.length}`);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting all messages:', error);
    throw error;
  }
}

async function deleteMessage(messageId) {
  try {
    const client = getClient();
    
    const result = await client.query(
      'DELETE FROM messages WHERE id = $1 RETURNING *',
      [messageId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Message not found');
    }
    
    console.log(`✅ Message ${messageId} deleted successfully`);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error deleting message:', error);
    throw error;
  }
}

module.exports = {
  getUserByUsername,
  getUserById,
  createUser,
  getAllUsers,
  createApplication,
  getApplications,
  getUserApplications,
  updateApplicationStatus,
  createCarListing,
  getCarListings,
  getCarListingById,
  updateCarListing,
  deleteCarListing,
  getUserCarListings,
  createMessage,
  getUserMessages,
  markMessageAsRead,
  getUnreadMessageCount,
  getUserFavorites,
  addToFavorites,
  removeFromFavorites,
  getPendingApplicationsCount,
  getUnmoderatedMessagesCount,
  getAllMessages,
  deleteMessage
};
