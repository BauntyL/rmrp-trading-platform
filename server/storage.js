import { pool } from "./db.js";

export class DatabaseStorage {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    console.log('🔧 Initializing PostgreSQL storage...');
    // Инициализация таблиц происходит в db.js
    this.initialized = true;
    console.log('✅ PostgreSQL storage initialized');
  }

  // ============ USER METHODS ============

  async createUser(userData) {
    await this.init();
    
    const result = await pool.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *',
      [userData.username, userData.password, userData.role || 'user']
    );

    const user = result.rows[0];
    console.log(`✅ User created: ${user.username} (ID: ${user.id})`);
    return user;
  }

  async getUser(id) {
    await this.init();
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async getUserByUsername(username) {
    await this.init();
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] || null;
  }

  async getAllUsers() {
    await this.init();
    const result = await pool.query('SELECT * FROM users ORDER BY "createdAt" DESC');
    return result.rows;
  }

  async updateUserRole(userId, role) {
    await this.init();
    
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING *',
      [role, userId]
    );

    return result.rows[0] || null;
  }

  // 🚨 НОВЫЙ МЕТОД ДЛЯ ОБНОВЛЕНИЯ ПОЛЬЗОВАТЕЛЯ
  async updateUser(id, updateData) {
    await this.init();
    
    const fields = [];
    const values = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updateData)) {
      paramCount++;
      fields.push(`"${key}" = $${paramCount}`);
      values.push(value);
    }

    if (fields.length === 0) return null;

    paramCount++;
    values.push(id);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    
    const result = await pool.query(sql, values);
    return result.rows[0] || null;
  }

  async deleteUser(userId) {
    await this.init();
    
    const result = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    return result.rowCount > 0;
  }

  // ============ CAR METHODS ============

  async createCar(carData) {
    await this.init();
    
    console.log(`📝 Creating car: ${carData.name}`);
    
    const result = await pool.query(
      `INSERT INTO cars (name, description, price, category, server, "createdBy", "imageUrl") 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        carData.name,
        carData.description || '',
        carData.price,
        carData.category,
        carData.server,
        carData.createdBy,
        carData.imageUrl || 'https://via.placeholder.com/400x300?text=Car'
      ]
    );

    const car = result.rows[0];
    console.log(`✅ Car created with ID: ${car.id} - ${car.name}`);
    return car;
  }

  async getAllCars() {
    await this.init();
    const result = await pool.query('SELECT * FROM cars ORDER BY "createdAt" DESC');
    return result.rows;
  }

  async getCar(id) {
    await this.init();
    const result = await pool.query('SELECT * FROM cars WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async getCarsByUser(userId) {
    await this.init();
    const result = await pool.query('SELECT * FROM cars WHERE "createdBy" = $1 ORDER BY "createdAt" DESC', [userId]);
    return result.rows;
  }

  async searchCars(query, category, server) {
    await this.init();
    
    let sql = 'SELECT * FROM cars WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (query) {
      paramCount++;
      sql += ` AND name ILIKE $${paramCount}`;
      params.push(`%${query}%`);
    }

    if (category && category !== 'all') {
      paramCount++;
      sql += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (server && server !== 'all') {
      paramCount++;
      sql += ` AND server = $${paramCount}`;
      params.push(server);
    }

    sql += ' ORDER BY "createdAt" DESC';

    const result = await pool.query(sql, params);
    return result.rows;
  }

  async updateCar(id, updateData) {
    await this.init();
    
    const fields = [];
    const values = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updateData)) {
      paramCount++;
      fields.push(`"${key}" = $${paramCount}`);
      values.push(value);
    }

    if (fields.length === 0) return null;

    paramCount++;
    values.push(id);

    const sql = `UPDATE cars SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    
    const result = await pool.query(sql, values);
    return result.rows[0] || null;
  }

  async deleteCar(id) {
    await this.init();
    
    const result = await pool.query('DELETE FROM cars WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  // ============ APPLICATION METHODS ============

  async createCarApplication(applicationData) {
    await this.init();
    
    const result = await pool.query(
      `INSERT INTO car_applications (name, description, price, category, server, "createdBy", "imageUrl", status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        applicationData.name,
        applicationData.description || '',
        applicationData.price,
        applicationData.category,
        applicationData.server,
        applicationData.createdBy,
        applicationData.imageUrl || 'https://via.placeholder.com/400x300?text=Car',
        'pending'
      ]
    );

    return result.rows[0];
  }

  async getAllCarApplications() {
    await this.init();
    const result = await pool.query('SELECT * FROM car_applications ORDER BY "createdAt" DESC');
    return result.rows;
  }

  async getPendingCarApplications() {
    await this.init();
    const result = await pool.query('SELECT * FROM car_applications WHERE status = $1 ORDER BY "createdAt" DESC', ['pending']);
    return result.rows;
  }

  async getCarApplicationsByUser(userId) {
    await this.init();
    const result = await pool.query('SELECT * FROM car_applications WHERE "createdBy" = $1 ORDER BY "createdAt" DESC', [userId]);
    return result.rows;
  }

  async updateCarApplicationStatus(applicationId, status, reviewedBy) {
    await this.init();
    
    console.log(`📝 Updating application ${applicationId} to status: ${status}`);
    
    const result = await pool.query(
      'UPDATE car_applications SET status = $1, "reviewedBy" = $2, "reviewedAt" = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [status, reviewedBy, applicationId]
    );

    const application = result.rows[0];
    if (!application) {
      console.log(`❌ Application not found: ${applicationId}`);
      return null;
    }

    // 🚀 АВТОМАТИЧЕСКИ СОЗДАЕМ АВТОМОБИЛЬ ПРИ ОДОБРЕНИИ
    if (status === 'approved') {
      console.log(`✅ Application approved - creating car for: ${application.name}`);
      
      const carData = {
        name: application.name,
        description: application.description,
        price: application.price,
        category: application.category,
        server: application.server,
        imageUrl: application.imageUrl,
        createdBy: application.createdBy
      };
      
      const newCar = await this.createCar(carData);
      console.log(`🚗 Car created from approved application: ${newCar.name} (ID: ${newCar.id})`);
    }

    console.log(`✅ Application status updated: ${applicationId} -> ${status}`);
    return application;
  }

  // ============ FAVORITES METHODS ============

  async addToFavorites(userId, carId) {
    await this.init();
    
    // Check if already in favorites
    const existing = await pool.query(
      'SELECT * FROM favorites WHERE "userId" = $1 AND "carId" = $2',
      [userId, carId]
    );
    
    if (existing.rows.length > 0) return existing.rows[0];

    const result = await pool.query(
      'INSERT INTO favorites ("userId", "carId") VALUES ($1, $2) RETURNING *',
      [userId, carId]
    );

    return result.rows[0];
  }

  async removeFromFavorites(userId, carId) {
    await this.init();
    
    const result = await pool.query(
      'DELETE FROM favorites WHERE "userId" = $1 AND "carId" = $2',
      [userId, carId]
    );
    
    return result.rowCount > 0;
  }

  async getUserFavorites(userId) {
    await this.init();
    
    const result = await pool.query(
      `SELECT c.* FROM favorites f 
       JOIN cars c ON f."carId" = c.id 
       WHERE f."userId" = $1 
       ORDER BY f."createdAt" DESC`,
      [userId]
    );
    
    return result.rows;
  }

  async getFavoritesByUser(userId) {
    await this.init();
    const result = await pool.query('SELECT * FROM favorites WHERE "userId" = $1', [userId]);
    return result.rows;
  }

  async checkFavorite(userId, carId) {
    await this.init();
    const result = await pool.query(
      'SELECT * FROM favorites WHERE "userId" = $1 AND "carId" = $2',
      [userId, carId]
    );
    return result.rows.length > 0;
  }

  // ============ MESSAGES METHODS ============

  async createMessage(messageData) {
    await this.init();
    
    const result = await pool.query(
      'INSERT INTO messages ("senderId", "receiverId", "carId", content, "isRead") VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [messageData.senderId, messageData.receiverId, messageData.carId, messageData.content, false]
    );

    return result.rows[0];
  }

  async getMessagesByUser(userId) {
    await this.init();
    const result = await pool.query(
      'SELECT * FROM messages WHERE "senderId" = $1 OR "receiverId" = $1 ORDER BY "createdAt" DESC',
      [userId]
    );
    return result.rows;
  }

  async getUnreadCount(userId) {
    await this.init();
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM messages WHERE "receiverId" = $1 AND "isRead" = false',
      [userId]
    );
    
    return parseInt(result.rows[0]?.count || 0);
  }

  async markMessageAsRead(messageId) {
    await this.init();
    
    const result = await pool.query(
      'UPDATE messages SET "isRead" = true WHERE id = $1 RETURNING *',
      [messageId]
    );

    return result.rows[0] || null;
  }

  async deleteMessage(messageId) {
    await this.init();
    
    const result = await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);
    return result.rowCount > 0;
  }

  async getAllMessages() {
    await this.init();
    const result = await pool.query('SELECT * FROM messages ORDER BY "createdAt" DESC');
    return result.rows;
  }
}

export const storage = new DatabaseStorage();
