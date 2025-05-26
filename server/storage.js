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
      'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting all users:', error);
    throw error;
  }
}

// Заявки на автомобили
async function createApplication(applicationData) {
  try {
    const client = getClient();
    const { brand, model, year, price, description, createdBy } = applicationData;
    
    console.log('📝 Creating application with data:', {
      brand, model, year, price, description, createdBy
    });
    
    const result = await client.query(
      `INSERT INTO car_applications (brand, model, year, price, description, created_by) 
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
      LEFT JOIN users u ON a.created_by = u.id
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
      'SELECT * FROM car_applications WHERE created_by = $1 ORDER BY created_at DESC',
      [userId]
    );
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

// Объявления автомобилей
async function createCarListing(carData) {
  try {
    const client = getClient();
    const { brand, model, year, price, description, ownerId, applicationId } = carData;
    
    const result = await client.query(
      `INSERT INTO car_listings (brand, model, year, price, description, owner_id, application_id) 
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
      LEFT JOIN users u ON c.owner_id = u.id
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
      LEFT JOIN users u ON c.owner_id = u.id
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
      `INSERT INTO messages (sender_id, receiver_id, content, car_id) 
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
      LEFT JOIN users s ON m.sender_id = s.id
      LEFT JOIN users r ON m.receiver_id = r.id
      LEFT JOIN car_listings c ON m.car_id = c.id
      WHERE m.sender_id = $1 OR m.receiver_id = $1
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
      'UPDATE messages SET is_read = true WHERE id = $1 AND receiver_id = $2',
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
      'SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND is_read = false',
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
      JOIN car_listings c ON f.car_id = c.id
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE f.user_id = $1
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
      'INSERT INTO favorites (user_id, car_id) VALUES ($1, $2) ON CONFLICT (user_id, car_id) DO NOTHING',
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
      'DELETE FROM favorites WHERE user_id = $1 AND car_id = $2',
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
