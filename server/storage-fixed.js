console.log('📦 Storage module loading...');

const path = require('path');

// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ ХРАНЕНИЯ ДАННЫХ (В ПАМЯТИ)
let users = [];
let cars = [];
let favorites = [];
let messages = [];
let initialized = false;

// ПРОСТАЯ ИНИЦИАЛИЗАЦИЯ (БЕЗ SQLite)
async function initializeDatabase() {
  try {
    console.log('🔄 Инициализация базы данных (в памяти)...');
    
    // Очищаем данные
    users = [];
    cars = [];
    favorites = [];
    messages = [];
    
    // Создаем админа по умолчанию
    await createDefaultAdmin();
    
    // Создаем тестовые данные
    await createTestData();
    
    initialized = true;
    console.log('✅ База данных инициализирована успешно (в памяти)');
    
  } catch (error) {
    console.error('❌ Ошибка инициализации БД:', error);
    throw error;
  }
}

// Создание администратора по умолчанию
async function createDefaultAdmin() {
  try {
    console.log('👤 Создание администратора...');
    
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = {
      id: 1,
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      email: 'admin@rmrp.com',
      createdAt: new Date().toISOString()
    };
    
    users.push(admin);
    console.log('✅ Администратор создан: admin/admin123');
    
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
    
    const testUser = {
      id: 2,
      username: 'testuser',
      password: testPassword,
      role: 'user',
      email: 'test@rmrp.com',
      createdAt: new Date().toISOString()
    };
    
    users.push(testUser);
    console.log('👤 Тестовый пользователь создан: testuser/test123');
    
    // Создаем тестовые автомобили
    const testCars = [
      {
        id: 1,
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
        owner_id: 1,
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
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
        owner_id: 1,
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
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
        owner_id: 1,
        createdAt: new Date().toISOString()
      },
      {
        id: 4,
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
        owner_id: 1,
        createdAt: new Date().toISOString()
      },
      {
        id: 5,
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
        owner_id: 1,
        createdAt: new Date().toISOString()
      }
    ];
    
    cars.push(...testCars);
    console.log(`🚗 Создано ${testCars.length} тестовых автомобилей`);
    
  } catch (error) {
    console.error('❌ Ошибка создания тестовых данных:', error);
  }
}

// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ =====

function getUserById(id) {
  const user = users.find(u => u.id === parseInt(id));
  console.log('🔍 getUserById:', id, user ? 'найден' : 'не найден');
  return user;
}

function getUserByUsername(username) {
  const user = users.find(u => u.username === username);
  console.log('🔍 getUserByUsername:', username, user ? 'найден' : 'не найден');
  return user;
}

function createUser(userData) {
  console.log('👤 Создание пользователя:', userData);
  
  const newUser = {
    id: users.length + 1,
    username: userData.username,
    password: userData.password,
    email: userData.email || null,
    role: userData.role || 'user',
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  console.log('✅ Пользователь создан:', newUser);
  return newUser;
}

// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С АВТОМОБИЛЯМИ =====

function getAllCars() {
  console.log(`🚗 Получено ${cars.length} автомобилей`);
  return cars;
}

function getCarById(id) {
  const car = cars.find(c => c.id === parseInt(id));
  console.log('🔍 getCarById:', id, car ? 'найден' : 'не найден');
  return car;
}

function createCar(carData) {
  console.log('🚗 Создание автомобиля:', carData);
  
  const newCar = {
    id: cars.length + 1,
    name: carData.name,
    category: carData.category,
    server: carData.server,
    price: carData.price,
    maxSpeed: carData.maxSpeed || 0,
    acceleration: carData.acceleration || 'Не указано',
    drive: carData.drive || 'Не указано',
    phone: carData.phone || null,
    telegram: carData.telegram || null,
    discord: carData.discord || null,
    imageUrl: carData.imageUrl || null,
    description: carData.description || null,
    isPremium: carData.isPremium || false,
    status: carData.status || 'approved',
    createdBy: carData.createdBy,
    owner_id: carData.owner_id || carData.createdBy,
    createdAt: new Date().toISOString()
  };
  
  cars.push(newCar);
  console.log('✅ Автомобиль создан:', newCar);
  return newCar;
}

function updateCar(id, carData) {
  console.log('🔄 Обновление автомобиля:', id, carData);
  
  const carIndex = cars.findIndex(c => c.id === parseInt(id));
  if (carIndex === -1) {
    console.log('❌ Автомобиль не найден');
    return null;
  }
  
  cars[carIndex] = {
    ...cars[carIndex],
    ...carData,
    updatedAt: new Date().toISOString()
  };
  
  console.log('✅ Автомобиль обновлен:', cars[carIndex]);
  return cars[carIndex];
}

function deleteCar(id) {
  console.log('🗑️ Удаление автомобиля:', id);
  
  const carIndex = cars.findIndex(c => c.id === parseInt(id));
  if (carIndex === -1) {
    console.log('❌ Автомобиль не найден');
    return false;
  }
  
  cars.splice(carIndex, 1);
  console.log('✅ Автомобиль удален');
  return true;
}

// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С ИЗБРАННЫМ =====

function getUserFavorites(userId) {
  const userFavorites = favorites.filter(f => f.userId === parseInt(userId));
  const favoriteCars = userFavorites.map(f => {
    const car = cars.find(c => c.id === f.carId);
    return car ? { ...car, addedToFavoritesAt: f.createdAt } : null;
  }).filter(Boolean);
  
  console.log(`❤️ Получено ${favoriteCars.length} избранных для пользователя ${userId}`);
  return favoriteCars;
}

function addToFavorites(userId, carId) {
  console.log('❤️ Добавление в избранное:', userId, carId);
  
  const existing = favorites.find(f => f.userId === parseInt(userId) && f.carId === parseInt(carId));
  if (existing) {
    console.log('⚠️ Уже в избранном');
    return { userId, carId, success: false, message: 'Already in favorites' };
  }
  
  const favorite = {
    id: favorites.length + 1,
    userId: parseInt(userId),
    carId: parseInt(carId),
    createdAt: new Date().toISOString()
  };
  
  favorites.push(favorite);
  console.log('✅ Добавлено в избранное');
  return { userId, carId, success: true };
}

function removeFromFavorites(userId, carId) {
  console.log('💔 Удаление из избранного:', userId, carId);
  
  const favoriteIndex = favorites.findIndex(f => f.userId === parseInt(userId) && f.carId === parseInt(carId));
  if (favoriteIndex === -1) {
    console.log('❌ Не найдено в избранном');
    return false;
  }
  
  favorites.splice(favoriteIndex, 1);
  console.log('✅ Удалено из избранного');
  return true;
}

// ===== ФУНКЦИИ ДЛЯ РАБОТЫ С СООБЩЕНИЯМИ =====

function createMessage(messageData) {
  console.log('💬 Создание сообщения:', messageData);
  
  const newMessage = {
    id: messages.length + 1,
    senderId: messageData.senderId,
    receiverId: messageData.receiverId,
    carId: messageData.carId || null,
    content: messageData.content,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  
  messages.push(newMessage);
  console.log('✅ Сообщение создано:', newMessage);
  return newMessage;
}

function getUserMessages(userId) {
  const userMessages = messages.filter(m => 
    m.senderId === parseInt(userId) || m.receiverId === parseInt(userId)
  );
  
  console.log(`💬 Получено ${userMessages.length} сообщений для пользователя ${userId}`);
  return userMessages;
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

console.log('📦 Storage module loaded successfully');
