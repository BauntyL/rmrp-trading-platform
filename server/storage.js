const { getClient } = require('./db');

// Заявки на автомобили
async function createApplication(applicationData) {
  try {
    const client = getClient();
    const { brand, model, year, price, description, createdBy } = applicationData;
    
    console.log('📝 Creating application with data:', {
      brand, model, year, price, description, createdBy
    });
    
    const result = await client.query(
      `INSERT INTO car_applications (brand, model, year, price, description, "createdBy") 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [brand, model, year, price, description, createdBy]
    );
    
    console.log(`✅ Application created:`, result.rows[0]);
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
      ORDER BY a.created_at DESC
    `);
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
      'SELECT * FROM car_applications WHERE "createdBy" = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting user applications:', error);
    throw error;
  }
}

// Объявления автомобилей
async function createCarListing(carData) {
  try {
    const client = getClient();
    const { brand, model, year, price, description, ownerId, applicationId } = carData;
    
    const result = await client.query(
      `INSERT INTO car_listings (brand, model, year, price, description, "ownerId", "applicationId") 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [brand, model, year, price, description, ownerId, applicationId]
    );
    
    console.log(`✅ Car listing created: ${brand} ${model}`);
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
      LEFT JOIN users u ON c."ownerId" = u.id
      ORDER BY c.created_at DESC
    `);
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
      LEFT JOIN users u ON c."ownerId" = u.id
      WHERE c.id = $1
    `, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error getting car listing by ID:', error);
    throw error;
  }
}

// Сообщения
async function createMessage(messageData) {
  try {
    const client = getClient();
    const { senderId, receiverId, content, carId } = messageData;
    
    const result = await client.query(
      `INSERT INTO messages ("senderId", "receiverId", content, "carId") 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [senderId, receiverId, content, carId]
    );
    
    console.log(`✅ Message created from user ${senderId} to ${receiverId}`);
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
        c.brand as car_brand,
        c.model as car_model
      FROM messages m
      LEFT JOIN users s ON m."senderId" = s.id
      LEFT JOIN users r ON m."receiverId" = r.id
      LEFT JOIN car_listings c ON m."carId" = c.id
      WHERE m."senderId" = $1 OR m."receiverId" = $1
      ORDER BY m.created_at DESC
    `, [userId]);
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
      'SELECT COUNT(*) as count FROM messages WHERE "receiverId" = $1 AND "isRead" = false',
      [userId]
    );
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('❌ Error getting unread message count:', error);
    return 0;
  }
}

// Избранное
async function getUserFavorites(userId) {
  try {
    const client = getClient();
    const result = await client.query(`
      SELECT 
        c.*,
        u.username as owner_name
      FROM favorites f
      JOIN car_listings c ON f."carId" = c.id
      LEFT JOIN users u ON c."ownerId" = u.id
      WHERE f."userId" = $1
      ORDER BY f.created_at DESC
    `, [userId]);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting user favorites:', error);
    throw error;
  }
}

async function addToFavorites(userId, carId) {
  try {
    const client = getClient();
    await client.query(
      'INSERT INTO favorites ("userId", "carId") VALUES ($1, $2) ON CONFLICT ("userId", "carId") DO NOTHING',
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

// Остальные функции без изменений...
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
      'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting all users:', error);
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

async function getPendingApplicationsCount() {
  try {
    const client = getClient();
    const result = await client.query(
      "SELECT COUNT(*) as count FROM car_applications WHERE status = 'pending'"
    );
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('❌ Error getting pending applications count:', error);
    return 0;
  }
}

async function updateUserRole(userId, role) {
  try {
    const client = getClient();
    const result = await client.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING *',
      [role, userId]
    );
    
    console.log(`✅ User ${userId} role updated to: ${role}`);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    throw error;
  }
}

module.exports = {
  // Users
  getUserByUsername,
  getUserById,
  createUser,
  getAllUsers,
  updateUserRole,
  
  // Applications
  createApplication,
  getApplications,
  getUserApplications,
  updateApplicationStatus,
  
  // Car listings
  createCarListing,
  getCarListings,
  getCarListingById,
  
  // Messages
  createMessage,
  getUserMessages,
  markMessageAsRead,
  getUnreadMessageCount,
  
  // Favorites
  getUserFavorites,
  addToFavorites,
  removeFromFavorites,
  
  // Stats
  getPendingApplicationsCount
};
