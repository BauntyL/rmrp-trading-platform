const Database = require('better-sqlite3');
const path = require('path');

// Глобальные переменные для хранения данных
let db;
let users = [];
let cars = [];
let favorites = [];
let messages = [];

// Инициализация базы данных
async function initializeDatabase() {
  try {
    console.log('🔄 Инициализация базы данных...');
    
    // Создаем подключение к SQLite
    const dbPath = path.join(__dirname, 'database.sqlite');
    db = new Database(dbPath);
    
    console.log('📁 База данных создана по пути:', dbPath);
    
    // Включаем WAL режим для лучшей производительности
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    // Принудительно пересоздаем таблицы
    await recreateTables();
    
    // Создаем админа по умолчанию
    await createDefaultAdmin();
    
    // Создаем тестовые данные
    await createTestData();
    
    console.log('✅ База данных инициализирована успешно');
    
  } catch (error) {
    console.error('❌ Ошибка инициализации БД:', error);
    throw error;
  }
}

// Пересоздание таблиц
async function recreateTables() {
  try {
    console.log('🔄 Пересоздание таблиц...');
    
    // Удаляем существующие таблицы
    const tables = ['messages', 'favorites', 'cars', 'users'];
    
    for (const table of tables) {
      try {
        db.exec(`DROP TABLE IF EXISTS ${table};`);
        console.log(`🗑️ Таблица ${table} удалена`);
      } catch (error) {
        console.log(`⚠️ Не удалось удалить таблицу ${table}:`, error.message);
      }
    }

    // Создаем таблицы заново
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS cars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        server TEXT NOT NULL,
        price INTEGER NOT NULL,
        maxSpeed INTEGER DEFAULT 0,
        acceleration TEXT DEFAULT 'Не указано',
        drive TEXT DEFAULT 'Не указано',
        phone TEXT,
        telegram TEXT,
        discord TEXT,
        imageUrl TEXT,
        description TEXT,
        isPremium BOOLEAN DEFAULT FALSE,
        status TEXT DEFAULT 'approved',
        createdBy INTEGER,
        owner_id INTEGER,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (createdBy) REFERENCES users(id),
        FOREIGN KEY (owner_id) REFERENCES users(id)
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        carId INTEGER NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (carId) REFERENCES cars(id) ON DELETE CASCADE,
        UNIQUE(userId, carId)
      );
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        senderId INTEGER NOT NULL,
        receiverId INTEGER NOT NULL,
        carId INTEGER,
        content TEXT NOT NULL,
        isRead BOOLEAN DEFAULT FALSE,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiverId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (carId) REFERENCES cars(id) ON DELETE SET NULL
      );
    `);

    console.log('✅ Все таблицы созданы успешно');
    
  } catch (error) {
    console.error('❌ Ошибка создания таблиц:', error);
    throw error;
  }
}

// Создание администратора по умолчанию
async function createDefaultAdmin() {
  try {
    // Проверяем есть ли админ
    const adminExists = db.prepare(`
      SELECT id FROM users WHERE role = 'admin' LIMIT 1
    `).get();

    if (!adminExists) {
      console.log('👤 Создание администратора...');
      
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const insertUser = db.prepare(`
        INSERT INTO users (username, password, role, email, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = insertUser.run(
        'admin', 
        hashedPassword, 
        'admin', 
        'admin@rmrp.com', 
        new Date().toISOString()
      );
      
      console.log('✅ Администратор создан: admin/admin123 (ID:', result.lastInsertRowid, ')');
    } else {
      console.log('👤 Администратор уже существует');
    }

  } catch (error) {
    console.error('❌ Ошибка создания админа:', error);
  }
}

// Создание тестовых данных
async function createTestData() {
  try {
    console.log('🔄 Создание тестовых данных...');
    
    // Создаем тестового пользователя
    const bcrypt = require('bcrypt');
    const testPassword = await bcrypt.hash('test123', 10);
    
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (username, password, role, email, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const testUser = insertUser.run(
      'testuser', 
      testPassword, 
      'user', 
      'test@rmrp.com', 
      new Date().toISOString()
    );
    
    if (testUser.changes > 0) {
      console.log('👤 Тестовый пользователь создан: testuser/test123');
    }
    
    // Создаем тестовые автомобили
    const insertCar = db.prepare(`
      INSERT OR IGNORE INTO cars (
        name, category, server, price, maxSpeed, acceleration, drive, 
        phone, telegram, discord, imageUrl, description, isPremium, 
        status, createdBy, owner_id, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const testCars = [
      {
        name: 'BMW M5 Competition',
        category: 'Спорт',
        server: 'Арбат',
        price: 15000000,
        maxSpeed: 305,
        acceleration: '3.3 сек',
        drive: 'AWD',
        phone: '+7 (999) 123-45-67',
        telegram: '@bmw_seller',
        discord: 'bmw_lover#1234',
        imageUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&h=600&fit=crop',
        description: 'Идеальное состояние, полная комплектация, один владелец',
        isPremium: true,
        status: 'approved',
        createdBy: 1,
        owner_id: 1
      },
      {
        name: 'Mercedes-AMG GT 63S',
        category: 'Купе',
        server: 'Рублевка',
        price: 18000000,
        maxSpeed: 315,
        acceleration: '3.2 сек',
        drive: 'AWD',
        phone: '+7 (999) 765-43-21',
        telegram: '@merc_dealer',
        discord: 'merc_fan#5678',
        imageUrl: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=600&fit=crop',
        description: 'Эксклюзивная версия с карбоновым пакетом',
        isPremium: true,
        status: 'approved',
        createdBy: 1,
        owner_id: 1
      },
      {
        name: 'Audi RS6 Avant',
        category: 'Универсал',
        server: 'Тверской',
        price: 12000000,
        maxSpeed: 280,
        acceleration: '3.6 сек',
        drive: 'AWD',
        phone: '+7 (999) 111-22-33',
        telegram: '@audi_rs',
        discord: 'quattro_lover#9999',
        imageUrl: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=600&fit=crop',
        description: 'Семейный спорткар с невероятной практичностью',
        isPremium: false,
        status: 'approved',
        createdBy: 1,
        owner_id: 1
      },
      {
        name: 'Porsche 911 Turbo S',
        category: 'Спорт',
        server: 'Патрики',
        price: 22000000,
        maxSpeed: 330,
        acceleration: '2.7 сек',
        drive: 'AWD',
        phone: '+7 (999) 888-77-66',
        telegram: '@porsche_pro',
        discord: 'turbo_master#1111',
        imageUrl: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=600&fit=crop',
        description: 'Легенда автоспорта в идеальном состоянии',
        isPremium: true,
        status: 'approved',
        createdBy: 1,
        owner_id: 1
      },
      {
        name: 'Lamborghini Huracán EVO',
        category: 'Суперкар',
        server: 'Арбат',
        price: 25000000,
        maxSpeed: 325,
        acceleration: '2.9 сек',
        drive: 'AWD',
        phone: '+7 (999) 222-33-44',
        telegram: '@lambo_king',
        discord: 'bull_rider#2222',
        imageUrl: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&h=600&fit=crop',
        description: 'Итальянская страсть в каждой детали',
        isPremium: true,
        status: 'approved',
        createdBy: 1,
        owner_id: 1
      }
    ];
    
    let createdCars = 0;
    testCars.forEach(car => {
      const result = insertCar.run(
        car.name, car.category, car.server, car.price, car.maxSpeed,
        car.acceleration, car.drive, car.phone, car.telegram, car.discord,
        car.imageUrl, car.description, car.isPremium, car.status,
        car.createdBy, car.owner_id, new Date().toISOString()
      );
      
      if (result.changes > 0) {
        createdCars++;
      }
    });
    
    console.log(`🚗 Создано ${createdCars} тестовых автомобилей`);
    
  } catch (error) {
    console.error('❌ Ошибка создания тестовых данных:', error);
  }
}

// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ =====

function getUserById(id) {
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = stmt.get(id);
    console.log('🔍 getUserById:', id, user ? 'найден' : 'не найден');
    return user;
  } catch (error) {
    console.error('❌ Ошибка getUserById:', error);
    return null;
  }
}

function getUserByUsername(username) {
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username);
    console.log('🔍 getUserByUsername:', username, user ? 'найден' : 'не найден');
    return user;
  } catch (error) {
    console.error('❌ Ошибка getUserByUsername:', error);
    return null;
  }
}

function createUser(userData) {
  try {
    console.log('👤 Создание пользователя:', userData);
    
    const stmt = db.prepare(`
      INSERT INTO users (username, password, email, role, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      userData.username,
      userData.password,
      userData.email || null,
      userData.role || 'user',
      new Date().toISOString()
    );
    
    const newUser = getUserById(result.lastInsertRowid);
    console.log('✅ Пользователь создан:', newUser);
    return newUser;
    
  } catch (error) {
    console.error('❌ Ошибка createUser:', error);
    throw error;
  }
}

// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С АВТОМОБИЛЯМИ =====

function getAllCars() {
  try {
    const stmt = db.prepare(`
      SELECT c.*, u.username as ownerName 
      FROM cars c 
      LEFT JOIN users u ON c.createdBy = u.id 
      ORDER BY c.createdAt DESC
    `);
    const cars = stmt.all();
    console.log(`🚗 Получено ${cars.length} автомобилей`);
    return cars;
  } catch (error) {
    console.error('❌ Ошибка getAllCars:', error);
    return [];
  }
}

function getCarById(id) {
  try {
    const stmt = db.prepare(`
      SELECT c.*, u.username as ownerName 
      FROM cars c 
      LEFT JOIN users u ON c.createdBy = u.id 
      WHERE c.id = ?
    `);
    const car = stmt.get(id);
    console.log('🔍 getCarById:', id, car ? 'найден' : 'не найден');
    return car;
  } catch (error) {
    console.error('❌ Ошибка getCarById:', error);
    return null;
  }
}

function createCar(carData) {
  try {
    console.log('🚗 Создание автомобиля:', carData);
    
    const stmt = db.prepare(`
      INSERT INTO cars (
        name, category, server, price, maxSpeed, acceleration, drive,
        phone, telegram, discord, imageUrl, description, isPremium,
        status, createdBy, owner_id, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      carData.name,
      carData.category,
      carData.server,
      carData.price,
      carData.maxSpeed || 0,
      carData.acceleration || 'Не указано',
      carData.drive || 'Не указано',
      carData.phone || null,
      carData.telegram || null,
      carData.discord || null,
      carData.imageUrl || null,
      carData.description || null,
      carData.isPremium || false,
      carData.status || 'approved',
      carData.createdBy,
      carData.owner_id || carData.createdBy,
      new Date().toISOString()
    );
    
    const newCar = getCarById(result.lastInsertRowid);
    console.log('✅ Автомобиль создан:', newCar);
    return newCar;
    
  } catch (error) {
    console.error('❌ Ошибка createCar:', error);
    throw error;
  }
}

function updateCar(id, carData) {
  try {
    console.log('🔄 Обновление автомобиля:', id, carData);
    
    const stmt = db.prepare(`
      UPDATE cars SET
        name = ?, category = ?, server = ?, price = ?, maxSpeed = ?,
        acceleration = ?, drive = ?, phone = ?, telegram = ?, discord = ?,
        imageUrl = ?, description = ?, isPremium = ?, updatedAt = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(
      carData.name,
      carData.category,
      carData.server,
      carData.price,
      carData.maxSpeed || 0,
      carData.acceleration || 'Не указано',
      carData.drive || 'Не указано',
      carData.phone || null,
      carData.telegram || null,
      carData.discord || null,
      carData.imageUrl || null,
      carData.description || null,
      carData.isPremium || false,
      new Date().toISOString(),
      id
    );
    
    if (result.changes > 0) {
      const updatedCar = getCarById(id);
      console.log('✅ Автомобиль обновлен:', updatedCar);
      return updatedCar;
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ Ошибка updateCar:', error);
    throw error;
  }
}

function deleteCar(id) {
  try {
    console.log('🗑️ Удаление автомобиля:', id);
    
    const stmt = db.prepare('DELETE FROM cars WHERE id = ?');
    const result = stmt.run(id);
    
    const success = result.changes > 0;
    console.log('✅ Автомобиль удален:', success);
    return success;
    
  } catch (error) {
    console.error('❌ Ошибка deleteCar:', error);
    return false;
  }
}

// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С ИЗБРАННЫМ =====

function getUserFavorites(userId) {
  try {
    const stmt = db.prepare(`
      SELECT c.*, f.createdAt as addedToFavoritesAt
      FROM favorites f
      JOIN cars c ON f.carId = c.id
      WHERE f.userId = ?
      ORDER BY f.createdAt DESC
    `);
    const favorites = stmt.all(userId);
    console.log(`❤️ Получено ${favorites.length} избранных для пользователя ${userId}`);
    return favorites;
  } catch (error) {
    console.error('❌ Ошибка getUserFavorites:', error);
    return [];
  }
}

function addToFavorites(userId, carId) {
  try {
    console.log('❤️ Добавление в избранное:', userId, carId);
    
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO favorites (userId, carId, createdAt)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(userId, carId, new Date().toISOString());
    
    if (result.changes > 0) {
      console.log('✅ Добавлено в избранное');
      return { userId, carId, success: true };
    } else {
      console.log('⚠️ Уже в избранном');
      return { userId, carId, success: false, message: 'Already in favorites' };
    }
    
  } catch (error) {
    console.error('❌ Ошибка addToFavorites:', error);
    throw error;
  }
}

function removeFromFavorites(userId, carId) {
  try {
    console.log('💔 Удаление из избранного:', userId, carId);
    
    const stmt = db.prepare('DELETE FROM favorites WHERE userId = ? AND carId = ?');
    const result = stmt.run(userId, carId);
    
    const success = result.changes > 0;
    console.log('✅ Удалено из избранного:', success);
    return success;
    
  } catch (error) {
    console.error('❌ Ошибка removeFromFavorites:', error);
    return false;
  }
}

// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С СООБЩЕНИЯМИ =====

function createMessage(messageData) {
  try {
    console.log('💬 Создание сообщения:', messageData);
    
    const stmt = db.prepare(`
      INSERT INTO messages (senderId, receiverId, carId, content, isRead, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      messageData.senderId,
      messageData.receiverId,
      messageData.carId || null,
      messageData.content,
      false,
      new Date().toISOString()
    );
    
    const newMessage = {
      id: result.lastInsertRowid,
      senderId: messageData.senderId,
      receiverId: messageData.receiverId,
      carId: messageData.carId || null,
      content: messageData.content,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    
    console.log('✅ Сообщение создано:', newMessage);
    return newMessage;
    
  } catch (error) {
    console.error('❌ Ошибка createMessage:', error);
    throw error;
  }
}

function getUserMessages(userId) {
  try {
    const stmt = db.prepare(`
      SELECT m.*, 
             sender.username as senderName,
             receiver.username as receiverName,
             c.name as carName
      FROM messages m
      LEFT JOIN users sender ON m.senderId = sender.id
      LEFT JOIN users receiver ON m.receiverId = receiver.id
      LEFT JOIN cars c ON m.carId = c.id
      WHERE m.senderId = ? OR m.receiverId = ?
      ORDER BY m.createdAt DESC
    `);
    
    const messages = stmt.all(userId, userId);
    console.log(`💬 Получено ${messages.length} сообщений для пользователя ${userId}`);
    return messages;
    
  } catch (error) {
    console.error('❌ Ошибка getUserMessages:', error);
    return [];
  }
}

// ===== ЭКСПОРТ ВСЕХ ФУНКЦИЙ =====

module.exports = {
  // Инициализация
  initializeDatabase,
  
  // Пользователи
  getUserById,
  getUserByUsername,
  createUser,
  
  // Автомобили
  getAllCars,
  getCarById,
  createCar,
  updateCar,
  deleteCar,
  
  // Избранное
  getUserFavorites,
  addToFavorites,
  removeFromFavorites,
  
  // Сообщения
  createMessage,
  getUserMessages,
};
