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

// ИСПРАВЛЕННАЯ ВЕРСИЯ С ПРАВИЛЬНЫМИ КОЛОНКАМИ
async function createApplication(applicationData) {
  try {
    const client = getClient();
    const { brand, model, year, price, description, createdBy } = applicationData;
    
    console.log('📝 Creating application with data:', {
      brand, model, year, price, description, createdBy
    });
    
    // СНАЧАЛА ПРОВЕРИМ СХЕМУ ТАБЛИЦЫ
    try {
      const tableInfo = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'car_applications'
        ORDER BY column_name
      `);
      console.log('📋 car_applications columns:', tableInfo.rows.map(r => r.column_name));
    } catch (schemaErr) {
      console.log('❌ Could not get schema info');
    }
    
    // ПОПРОБУЕМ РАЗНЫЕ ВАРИАНТЫ СОЗДАНИЯ
    const creationVariants = [
      {
        name: 'camelCase with quotes',
        query: `INSERT INTO car_applications (brand, model, year, price, description, "createdBy") 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`
      },
      {
        name: 'snake_case',
        query: `INSERT INTO car_applications (brand, model, year, price, description, created_by) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`
      },
      {
        name: 'snake_case with quotes',
        query: `INSERT INTO car_applications (brand, model, year, price, description, "created_by") 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`
      },
      {
        name: 'lowercase',
        query: `INSERT INTO car_applications (brand, model, year, price, description, createdby) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`
      },
      {
        name: 'creator_id',
        query: `INSERT INTO car_applications (brand, model, year, price, description, creator_id) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`
      },
      {
        name: 'user_id',
        query: `INSERT INTO car_applications (brand, model, year, price, description, user_id) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`
      }
    ];
    
    for (const variant of creationVariants) {
      try {
        console.log(`📍 Trying ${variant.name} for creation...`);
        const result = await client.query(variant.query, [brand, model, year, price, description, createdBy]);
        console.log(`✅ ${variant.name} creation worked!`);
        console.log(`✅ Application created:`, result.rows[0]);
        return result.rows[0];
      } catch (err) {
        console.log(`❌ ${variant.name} failed:`, err.message);
        continue;
      }
    }
    
    throw new Error('All creation variants failed');
    
  } catch (error) {
    console.error('❌ Error creating application:', error);
    throw error;
  }
}

async function getApplications() {
  try {
    const client = getClient();
    
    // СНАЧАЛА ПРОВЕРИМ СХЕМУ ТАБЛИЦЫ
    try {
      const tableInfo = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'car_applications'
        ORDER BY column_name
      `);
      console.log('📋 car_applications columns:', tableInfo.rows.map(r => r.column_name));
    } catch (schemaErr) {
      console.log('❌ Could not get schema info');
    }
    
    // ПОПРОБУЕМ РАЗНЫЕ ВАРИАНТЫ JOIN
    const joinVariants = [
      {
        name: 'camelCase with quotes',
        query: `SELECT a.*, u.username as creator_name
                FROM car_applications a
                LEFT JOIN users u ON a."createdBy" = u.id
                ORDER BY a.created_at DESC`
      },
      {
        name: 'snake_case',
        query: `SELECT a.*, u.username as creator_name
                FROM car_applications a
                LEFT JOIN users u ON a.created_by = u.id
                ORDER BY a.created_at DESC`
      },
      {
        name: 'snake_case with quotes',
        query: `SELECT a.*, u.username as creator_name
                FROM car_applications a
                LEFT JOIN users u ON a."created_by" = u.id
                ORDER BY a.created_at DESC`
      },
      {
        name: 'lowercase',
        query: `SELECT a.*, u.username as creator_name
                FROM car_applications a
                LEFT JOIN users u ON a.createdby = u.id
                ORDER BY a.created_at DESC`
      },
      {
        name: 'creator_id',
        query: `SELECT a.*, u.username as creator_name
                FROM car_applications a
                LEFT JOIN users u ON a.creator_id = u.id
                ORDER BY a.created_at DESC`
      },
      {
        name: 'user_id',
        query: `SELECT a.*, u.username as creator_name
                FROM car_applications a
                LEFT JOIN users u ON a.user_id = u.id
                ORDER BY a.created_at DESC`
      }
    ];
    
    for (const variant of joinVariants) {
      try {
        console.log(`📍 Trying ${variant.name}...`);
        const result = await client.query(variant.query);
        console.log(`✅ ${variant.name} worked!`);
        return result.rows;
      } catch (err) {
        console.log(`❌ ${variant.name} failed:`, err.message);
        continue;
      }
    }
    
    // Если ничего не сработало - просто без JOIN
    console.log('📍 Trying without JOIN...');
    const result = await client.query(`
      SELECT * FROM car_applications
      ORDER BY created_at DESC
    `);
    console.log('✅ Without JOIN worked!');
    return result.rows;
    
  } catch (error) {
    console.error('❌ Error getting applications:', error);
    throw error;
  }
}

async function getUserApplications(userId) {
  try {
    const client = getClient();
    
    // ПОПРОБУЕМ РАЗНЫЕ ВАРИАНТЫ
    const variants = [
      {
        name: 'camelCase with quotes',
        query: 'SELECT * FROM car_applications WHERE "createdBy" = $1 ORDER BY created_at DESC'
      },
      {
        name: 'snake_case',
        query: 'SELECT * FROM car_applications WHERE created_by = $1 ORDER BY created_at DESC'
      },
      {
        name: 'snake_case with quotes',
        query: 'SELECT * FROM car_applications WHERE "created_by" = $1 ORDER BY created_at DESC'
      },
      {
        name: 'lowercase',
        query: 'SELECT * FROM car_applications WHERE createdby = $1 ORDER BY created_at DESC'
      },
      {
        name: 'creator_id',
        query: 'SELECT * FROM car_applications WHERE creator_id = $1 ORDER BY created_at DESC'
      },
      {
        name: 'user_id',
        query: 'SELECT * FROM car_applications WHERE user_id = $1 ORDER BY created_at DESC'
      }
    ];
    
    for (const variant of variants) {
      try {
        console.log(`📍 Trying ${variant.name} for user applications...`);
        const result = await client.query(variant.query, [userId]);
        console.log(`✅ ${variant.name} worked for user apps!`);
        return result.rows;
      } catch (err) {
        console.log(`❌ ${variant.name} failed:`, err.message);
        continue;
      }
    }
    
    console.log('❌ All variants failed for user applications');
    return [];
    
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
    
    // ПРОВЕРИМ СХЕМУ car_listings
    try {
      const tableInfo = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'car_listings'
        ORDER BY column_name
      `);
      console.log('📋 car_listings columns:', tableInfo.rows.map(r => r.column_name));
    } catch (schemaErr) {
      console.log('❌ Could not get car_listings schema info');
    }
    
    // ПОПРОБУЕМ РАЗНЫЕ ВАРИАНТЫ
    const variants = [
      {
        name: 'camelCase with quotes',
        query: `INSERT INTO car_listings (brand, model, year, price, description, "ownerId", "applicationId") 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`
      },
      {
        name: 'snake_case',
        query: `INSERT INTO car_listings (brand, model, year, price, description, owner_id, application_id) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`
      },
      {
        name: 'snake_case with quotes',
        query: `INSERT INTO car_listings (brand, model, year, price, description, "owner_id", "application_id") 
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`
      }
    ];
    
    for (const variant of variants) {
      try {
        console.log(`📍 Trying ${variant.name} for car listing creation...`);
        const result = await client.query(variant.query, [brand, model, year, price, description, ownerId, applicationId]);
        console.log(`✅ ${variant.name} car listing creation worked!`);
        console.log(`✅ Car listing created: ${brand} ${model}`);
        return result.rows[0];
      } catch (err) {
        console.log(`❌ ${variant.name} failed:`, err.message);
        continue;
      }
    }
    
    throw new Error('All car listing creation variants failed');
    
  } catch (error) {
    console.error('❌ Error creating car listing:', error);
    throw error;
  }
}

async function getCarListings() {
  try {
    const client = getClient();
    
    // ПОПРОБУЕМ РАЗНЫЕ ВАРИАНТЫ
    const variants = [
      {
        name: 'camelCase with quotes',
        query: `SELECT c.*, u.username as owner_name
                FROM car_listings c
                LEFT JOIN users u ON c."ownerId" = u.id
                ORDER BY c.created_at DESC`
      },
      {
        name: 'snake_case',
        query: `SELECT c.*, u.username as owner_name
                FROM car_listings c
                LEFT JOIN users u ON c.owner_id = u.id
                ORDER BY c.created_at DESC`
      },
      {
        name: 'snake_case with quotes',
        query: `SELECT c.*, u.username as owner_name
                FROM car_listings c
                LEFT JOIN users u ON c."owner_id" = u.id
                ORDER BY c.created_at DESC`
      }
    ];
    
    for (const variant of variants) {
      try {
        console.log(`📍 Trying ${variant.name} for car listings...`);
        const result = await client.query(variant.query);
        console.log(`✅ ${variant.name} worked for car listings!`);
        return result.rows;
      } catch (err) {
        console.log(`❌ ${variant.name} failed:`, err.message);
        continue;
      }
    }
    
    // Без JOIN
    console.log('📍 Trying car listings without JOIN...');
    const result = await client.query('SELECT * FROM car_listings ORDER BY created_at DESC');
    console.log('✅ Car listings without JOIN worked!');
    return result.rows;
    
  } catch (error) {
    console.error('❌ Error getting car listings:', error);
    throw error;
  }
}

async function getCarListingById(id) {
  try {
    const client = getClient();
    
    // ПОПРОБУЕМ РАЗНЫЕ ВАРИАНТЫ
    const variants = [
      {
        name: 'camelCase with quotes',
        query: `SELECT c.*, u.username as owner_name
                FROM car_listings c
                LEFT JOIN users u ON c."ownerId" = u.id
                WHERE c.id = $1`
      },
      {
        name: 'snake_case',
        query: `SELECT c.*, u.username as owner_name
                FROM car_listings c
                LEFT JOIN users u ON c.owner_id = u.id
                WHERE c.id = $1`
      },
      {
        name: 'snake_case with quotes',
        query: `SELECT c.*, u.username as owner_name
                FROM car_listings c
                LEFT JOIN users u ON c."owner_id" = u.id
                WHERE c.id = $1`
      }
    ];
    
    for (const variant of variants) {
      try {
        console.log(`📍 Trying ${variant.name} for single car listing...`);
        const result = await client.query(variant.query, [id]);
        console.log(`✅ ${variant.name} worked for single car!`);
        return result.rows[0] || null;
      } catch (err) {
        console.log(`❌ ${variant.name} failed:`, err.message);
        continue;
      }
    }
    
    // Без JOIN
    console.log('📍 Trying single car without JOIN...');
    const result = await client.query('SELECT * FROM car_listings WHERE id = $1', [id]);
    console.log('✅ Single car without JOIN worked!');
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
    
    // ПОПРОБУЕМ РАЗНЫЕ ВАРИАНТЫ
    const variants = [
      {
        name: 'camelCase with quotes',
        query: `INSERT INTO messages ("senderId", "receiverId", content, "carId") 
                 VALUES ($1, $2, $3, $4) RETURNING *`
      },
      {
        name: 'snake_case',
        query: `INSERT INTO messages (sender_id, receiver_id, content, car_id) 
                 VALUES ($1, $2, $3, $4) RETURNING *`
      }
    ];
    
    for (const variant of variants) {
      try {
        console.log(`📍 Trying ${variant.name} for message creation...`);
        const result = await client.query(variant.query, [senderId, receiverId, content, carId]);
        console.log(`✅ ${variant.name} message creation worked!`);
        console.log(`✅ Message created from user ${senderId} to ${receiverId}`);
        return result.rows[0];
      } catch (err) {
        console.log(`❌ ${variant.name} failed:`, err.message);
        continue;
      }
    }
    
    throw new Error('All message creation variants failed');
    
  } catch (error) {
    console.error('❌ Error creating message:', error);
    throw error;
  }
}

async function getUserMessages(userId) {
  try {
    const client = getClient();
    
    // ПОПРОБУЕМ РАЗНЫЕ ВАРИАНТЫ
    const variants = [
      {
        name: 'camelCase with quotes',
        query: `SELECT m.*, s.username as sender_name, r.username as receiver_name, c.brand as car_brand, c.model as car_model
                FROM messages m
                LEFT JOIN users s ON m."senderId" = s.id
                LEFT JOIN users r ON m."receiverId" = r.id
                LEFT JOIN car_listings c ON m."carId" = c.id
                WHERE m."senderId" = $1 OR m."receiverId" = $1
                ORDER BY m.created_at DESC`
      },
      {
        name: 'snake_case',
        query: `SELECT m.*, s.username as sender_name, r.username as receiver_name, c.brand as car_brand, c.model as car_model
                FROM messages m
                LEFT JOIN users s ON m.sender_id = s.id
                LEFT JOIN users r ON m.receiver_id = r.id
                LEFT JOIN car_listings c ON m.car_id = c.id
                WHERE m.sender_id = $1 OR m.receiver_id = $1
                ORDER BY m.created_at DESC`
      }
    ];
    
    for (const variant of variants) {
      try {
        console.log(`📍 Trying ${variant.name} for user messages...`);
        const result = await client.query(variant.query, [userId]);
        console.log(`✅ ${variant.name} worked for user messages!`);
        return result.rows;
      } catch (err) {
        console.log(`❌ ${variant.name} failed:`, err.message);
        continue;
      }
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Error getting user messages:', error);
    throw error;
  }
}

async function markMessageAsRead(messageId, userId) {
  try {
    const client = getClient();
    
    // ПОПРОБУЕМ РАЗНЫЕ ВАРИАНТЫ
    const variants = [
      {
        name: 'camelCase with quotes',
        query: 'UPDATE messages SET "isRead" = true WHERE id = $1 AND "receiverId" = $2'
      },
      {
        name: 'snake_case',
        query: 'UPDATE messages SET is_read = true WHERE id = $1 AND receiver_id = $2'
      }
    ];
    
    for (const variant of variants) {
      try {
        console.log(`📍 Trying ${variant.name} for marking message as read...`);
        await client.query(variant.query, [messageId, userId]);
        console.log(`✅ ${variant.name} worked for marking message!`);
        console.log(`✅ Message ${messageId} marked as read`);
        return;
      } catch (err) {
        console.log(`❌ ${variant.name} failed:`, err.message);
        continue;
      }
    }
    
  } catch (error) {
    console.error('❌ Error marking message as read:', error);
    throw error;
  }
}

async function getUnreadMessageCount(userId) {
  try {
    const client = getClient();
    
    // ПОПРОБУЕМ РАЗНЫЕ ВАРИАНТЫ
    const variants = [
      {
        name: 'camelCase with quotes',
        query: 'SELECT COUNT(*) as count FROM messages WHERE "receiverId" = $1 AND "isRead" = false'
      },
      {
        name: 'snake_case',
        query: 'SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND is_read = false'
      }
    ];
    
    for (const variant of variants) {
      try {
        console.log(`📍 Trying ${variant.name} for unread count...`);
        const result = await client.query(variant.query, [userId]);
        console.log(`✅ ${variant.name} worked for unread count!`);
        return parseInt(result.rows[0].count);
      } catch (err) {
        console.log(`❌ ${variant.name} failed:`, err.message);
        continue;
      }
    }
    
    return 0;
    
  } catch (error) {
    console.error('❌ Error getting unread message count:', error);
    return 0;
  }
}

// Избранное
async function getUserFavorites(userId) {
  try {
    const client = getClient();
    
    // ПОПРОБУЕМ РАЗНЫЕ ВАРИАНТЫ
    const variants = [
      {
        name: 'camelCase with quotes',
        query: `SELECT c.*, u.username as owner_name
                FROM favorites f
                JOIN car_listings c ON f."carId" = c.id
                LEFT JOIN users u ON c."ownerId" = u.id
                WHERE f."userId" = $1
                ORDER BY f.created_at DESC`
      },
      {
        name: 'snake_case',
        query: `SELECT c.*, u.username as owner_name
                FROM favorites f
                JOIN car_listings c ON f.car_id = c.id
                LEFT JOIN users u ON c.owner_id = u.id
                WHERE f.user_id = $1
                ORDER BY f.created_at DESC`
      }
    ];
    
    for (const variant of variants) {
      try {
        console.log(`📍 Trying ${variant.name} for user favorites...`);
        const result = await client.query(variant.query, [userId]);
        console.log(`✅ ${variant.name} worked for user favorites!`);
        return result.rows;
      } catch (err) {
        console.log(`❌ ${variant.name} failed:`, err.message);
        continue;
      }
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Error getting user favorites:', error);
    throw error;
  }
}

async function addToFavorites(userId, carId) {
  try {
    const client = getClient();
    
    // ПОПРОБУЕМ РАЗНЫЕ ВАРИАНТЫ
    const variants = [
      {
        name: 'camelCase with quotes',
        query: 'INSERT INTO favorites ("userId", "carId") VALUES ($1, $2) ON CONFLICT ("userId", "carId") DO NOTHING'
      },
      {
        name: 'snake_case',
        query: 'INSERT INTO favorites (user_id, car_id) VALUES ($1, $2) ON CONFLICT (user_id, car_id) DO NOTHING'
      }
    ];
    
    for (const variant of variants) {
      try {
        console.log(`📍 Trying ${variant.name} for adding to favorites...`);
        await client.query(variant.query, [userId, carId]);
        console.log(`✅ ${variant.name} worked for adding to favorites!`);
        console.log(`✅ Car ${carId} added to favorites for user ${userId}`);
        return;
      } catch (err) {
        console.log(`❌ ${variant.name} failed:`, err.message);
        continue;
      }
    }
    
  } catch (error) {
    console.error('❌ Error adding to favorites:', error);
    throw error;
  }
}

async function removeFromFavorites(userId, carId) {
  try {
    const client = getClient();
    
    // ПОПРОБУЕМ РАЗНЫЕ ВАРИАНТЫ
    const variants = [
      {
        name: 'camelCase with quotes',
        query: 'DELETE FROM favorites WHERE "userId" = $1 AND "carId" = $2'
      },
      {
        name: 'snake_case',
        query: 'DELETE FROM favorites WHERE user_id = $1 AND car_id = $2'
      }
    ];
    
    for (const variant of variants) {
      try {
        console.log(`📍 Trying ${variant.name} for removing from favorites...`);
        await client.query(variant.query, [userId, carId]);
        console.log(`✅ ${variant.name} worked for removing from favorites!`);
        console.log(`✅ Car ${carId} removed from favorites for user ${userId}`);
        return;
      } catch (err) {
        console.log(`❌ ${variant.name} failed:`, err.message);
        continue;
      }
    }
    
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
