import { 
  users, 
  cars, 
  carApplications, 
  favorites,
  messages
} from "../shared/schema.js";
import session from "express-session";
import createMemoryStore from "memorystore";
import fs from "fs";
import path from "path";

const MemoryStore = createMemoryStore(session);

export class MemStorage {
  constructor() {
    this.users = new Map();
    this.cars = new Map();
    this.carApplications = new Map();
    this.favorites = new Map();
    this.messages = new Map();
    
    this.userIdCounter = 1;
    this.carIdCounter = 1;
    this.carApplicationIdCounter = 1;
    this.favoriteIdCounter = 1;
    this.messageIdCounter = 1;
    
    // Кэш счетчиков для предотвращения скачков
    this.unreadCountCache = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    this.dataDir = path.join(process.cwd(), 'data');
    
    this.ensureDataDir();
    this.loadData();
    this.initializeDefaultData();
  }

  ensureDataDir() {
    console.log(`📁 Ensuring data directory exists: ${this.dataDir}`);
    if (!fs.existsSync(this.dataDir)) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true });
        console.log(`✅ Data directory created: ${this.dataDir}`);
      } catch (error) {
        console.error(`❌ Failed to create data directory:`, error);
      }
    } else {
      console.log(`✅ Data directory already exists: ${this.dataDir}`);
    }
  }

  saveData() {
    try {
      console.log(`💾 Saving data to: ${path.join(this.dataDir, 'storage.json')}`);
      console.log(`📊 Saving: Users=${this.users.size}, Cars=${this.cars.size}, Messages=${this.messages.size}`);
      
      const data = {
        users: Array.from(this.users.entries()),
        cars: Array.from(this.cars.entries()),
        carApplications: Array.from(this.carApplications.entries()),
        favorites: Array.from(this.favorites.entries()),
        messages: Array.from(this.messages.entries()),
        counters: {
          userIdCounter: this.userIdCounter,
          carIdCounter: this.carIdCounter,
          carApplicationIdCounter: this.carApplicationIdCounter,
          favoriteIdCounter: this.favoriteIdCounter,
          messageIdCounter: this.messageIdCounter,
        }
      };
      
      fs.writeFileSync(path.join(this.dataDir, 'storage.json'), JSON.stringify(data, null, 2));
      console.log(`✅ Data saved successfully`);
    } catch (error) {
      console.error('❌ Error saving data:', error);
    }
  }

  loadData() {
    try {
      const dataPath = path.join(this.dataDir, 'storage.json');
      console.log(`🔍 Trying to load data from: ${dataPath}`);
      console.log(`📂 Data directory exists: ${fs.existsSync(this.dataDir)}`);
      console.log(`📄 Storage file exists: ${fs.existsSync(dataPath)}`);
      
      if (fs.existsSync(dataPath)) {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        console.log(`✅ Data loaded successfully. Found ${data.users?.length || 0} users`);
        
        this.users = new Map(data.users || []);
        this.cars = new Map(data.cars || []);
        this.carApplications = new Map(data.carApplications || []);
        this.favorites = new Map(data.favorites || []);
        this.messages = new Map(data.messages || []);
        
        // Исправляем старые сообщения, добавляя недостающие поля
        if (data.messages) {
          this.messages.forEach((message, id) => {
            if (!message.senderId || !message.recipientId) {
              console.log(`🔧 Исправляем сообщение ${id}: добавляем senderId и recipientId`);
              message.senderId = message.buyerId; // Отправитель - это покупатель
              message.recipientId = message.sellerId; // Получатель - это продавец
              this.messages.set(id, message);
            }
          });
        }
        
        if (data.counters) {
          this.userIdCounter = data.counters.userIdCounter || 1;
          this.carIdCounter = data.counters.carIdCounter || 1;
          this.carApplicationIdCounter = data.counters.carApplicationIdCounter || 1;
          this.favoriteIdCounter = data.counters.favoriteIdCounter || 1;
          this.messageIdCounter = data.counters.messageIdCounter || 1;
        }
        
        console.log(`📊 Final counts: Users=${this.users.size}, Cars=${this.cars.size}, Messages=${this.messages.size}`);
      } else {
        console.log(`⚠️ Storage file not found, starting with empty data`);
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
    }
  }

  async initializeDefaultData() {
    console.log(`🔧 Initializing default data...`);
    console.log(`📊 Current state: Users=${this.users.size}, Cars=${this.cars.size}`);
    
    // Создаем админа по умолчанию если его нет
    const adminExists = Array.from(this.users.values()).some(u => u.role === 'admin');
    if (!adminExists) {
      console.log(`👤 Creating default admin user...`);
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('lql477kqkvb55vp', 10);
      
      const admin = {
        id: this.userIdCounter++,
        username: '477-554',
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date(),
      };
      this.users.set(admin.id, admin);
      console.log(`✅ Admin created with ID: ${admin.id}`);
    }
    
    // Добавим тестовые автомобили если их нет
    if (this.cars.size === 0) {
      console.log(`🚗 Creating test cars...`);
      const testCars = [
        {
          id: this.carIdCounter++,
          name: 'BMW M3',
          category: 'sport',
          server: 'arbat',
          price: 1500000,
          description: 'Спортивный автомобиль в отличном состоянии',
          status: 'active',
          createdBy: 1,
          createdAt: new Date(),
        },
        {
          id: this.carIdCounter++,
          name: 'Mercedes G-Class',
          category: 'suv',
          server: 'rublevka',
          price: 2500000,
          description: 'Премиальный внедорожник',
          status: 'active',
          createdBy: 1,
          createdAt: new Date(),
        }
      ];
      
      testCars.forEach(car => {
        this.cars.set(car.id, car);
        console.log(`🚗 Added car: ${car.name} (ID: ${car.id})`);
      });
    }
    
    this.saveData();
    console.log(`🎯 Default data initialization complete`);
  }

  // User methods
  async getUser(id) {
    return this.users.get(id);
  }

  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser) {
    const user = {
      ...insertUser,
      id: this.userIdCounter++,
      role: insertUser.role || 'user',
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    this.saveData();
    return user;
  }

  async updateUserRole(id, role) {
    const user = this.users.get(id);
    if (user) {
      user.role = role;
      this.users.set(id, user);
      this.saveData();
      return user;
    }
    return undefined;
  }

  async updateUser(id, updates) {
    const user = this.users.get(id);
    if (user) {
      if (updates.username) {
        user.username = updates.username;
      }
      if (updates.role) {
        user.role = updates.role;
      }
      this.users.set(id, user);
      this.saveData();
      return user;
    }
    return undefined;
  }

  async deleteUser(id) {
    const existed = this.users.has(id);
    if (existed) {
      // Удаляем пользователя
      this.users.delete(id);
      
      // Удаляем все связанные данные пользователя
      // Удаляем автомобили пользователя
      const userCars = Array.from(this.cars.values()).filter(car => car.userId === id);
      userCars.forEach(car => this.cars.delete(car.id));
      
      // Удаляем заявки пользователя
      const userApplications = Array.from(this.carApplications.values()).filter(app => app.userId === id);
      userApplications.forEach(app => this.carApplications.delete(app.id));
      
      // Удаляем избранное пользователя
      const userFavorites = Array.from(this.favorites.values()).filter(fav => fav.userId === id);
      userFavorites.forEach(fav => this.favorites.delete(fav.id));
      
      this.saveData();
    }
    return existed;
  }

  async getAllUsers() {
    return Array.from(this.users.values());
  }

  // Car methods
  async getCar(id) {
    return this.cars.get(id);
  }

  async getAllCars() {
    return Array.from(this.cars.values()).filter(car => car.status === 'active');
  }

  async createCar(insertCar) {
    const car = {
      ...insertCar,
      id: this.carIdCounter++,
      status: 'active',
      createdAt: new Date(),
    };
    this.cars.set(car.id, car);
    this.saveData();
    return car;
  }

  async updateCar(id, updateData) {
    const car = this.cars.get(id);
    if (car) {
      Object.assign(car, updateData);
      this.cars.set(id, car);
      this.saveData();
      return car;
    }
    return undefined;
  }

  async deleteCar(id) {
    console.log(`🗃️ Попытка удаления автомобиля ID: ${id} из хранилища`);
    console.log(`🗃️ Количество автомобилей до удаления: ${this.cars.size}`);
    console.log(`🗃️ Автомобиль существует: ${this.cars.has(id)}`);
    
    const deleted = this.cars.delete(id);
    console.log(`🗃️ Результат delete(): ${deleted}`);
    console.log(`🗃️ Количество автомобилей после удаления: ${this.cars.size}`);
    
    if (deleted) {
      this.saveData();
      console.log(`💾 Данные сохранены в файл`);
    }
    return deleted;
  }

  async getCarsByUser(userId) {
    const allCars = Array.from(this.cars.values());
    const userCars = allCars.filter(car => car.createdBy === userId);
    
    console.log(`🚗 getCarsByUser(${userId}): Всего автомобилей в системе: ${allCars.length}`);
    console.log(`🚗 Автомобили пользователя ${userId}: ${userCars.length}`);
    console.log(`🚗 Список автомобилей пользователя:`, userCars.map(car => `ID:${car.id} "${car.name}" createdBy:${car.createdBy}`));
    
    return userCars;
  }

  async searchCars(query, category, server) {
    let cars = Array.from(this.cars.values()).filter(car => car.status === 'active');
    
    if (query) {
      cars = cars.filter(car => 
        car.name.toLowerCase().includes(query.toLowerCase()) ||
        car.description?.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    if (category) {
      cars = cars.filter(car => car.category === category);
    }
    
    if (server) {
      cars = cars.filter(car => car.server === server);
    }
    
    return cars;
  }

  // Car Application methods
  async getCarApplication(id) {
    return this.carApplications.get(id);
  }

  async getAllCarApplications() {
    return Array.from(this.carApplications.values());
  }

  async createCarApplication(insertApplication) {
    const application = {
      ...insertApplication,
      id: this.carApplicationIdCounter++,
      status: 'pending',
      createdAt: new Date(),
    };
    this.carApplications.set(application.id, application);
    this.saveData();
    return application;
  }

  async updateCarApplicationStatus(id, status, reviewedBy) {
    const application = this.carApplications.get(id);
    if (application) {
      application.status = status;
      application.reviewedBy = reviewedBy;
      application.reviewedAt = new Date();
      this.carApplications.set(id, application);
      this.saveData();
      return application;
    }
    return undefined;
  }

  async getCarApplicationsByUser(userId) {
    return Array.from(this.carApplications.values()).filter(app => app.userId === userId);
  }

  async getPendingCarApplications() {
    return Array.from(this.carApplications.values()).filter(app => app.status === 'pending');
  }

  // Favorites methods
  async getFavoritesByUser(userId) {
    return Array.from(this.favorites.values()).filter(fav => fav.userId === userId);
  }

  async addToFavorites(insertFavorite) {
    const favorite = {
      ...insertFavorite,
      id: this.favoriteIdCounter++,
      createdAt: new Date(),
    };
    this.favorites.set(favorite.id, favorite);
    this.saveData();
    return favorite;
  }

  async removeFromFavorites(userId, carId) {
    const favoriteToRemove = Array.from(this.favorites.values()).find(
      fav => fav.userId === userId && fav.carId === carId
    );
    
    if (favoriteToRemove) {
      this.favorites.delete(favoriteToRemove.id);
      this.saveData();
      return true;
    }
    return false;
  }

  async isFavorite(userId, carId) {
    return Array.from(this.favorites.values()).some(
      fav => fav.userId === userId && fav.carId === carId
    );
  }

  // Messages methods
  async getMessagesByUser(userId) {
    const userMessages = Array.from(this.messages.values()).filter(
      msg => msg.senderId === userId || msg.recipientId === userId
    );
    
    // Группируем сообщения по парам пользователей и автомобилям
    const conversations = new Map();
    
    userMessages.forEach(msg => {
      const key = `${msg.carId}-${Math.min(msg.senderId, msg.recipientId)}-${Math.max(msg.senderId, msg.recipientId)}`;
      
      if (!conversations.has(key)) {
        conversations.set(key, {
          carId: msg.carId,
          participants: [msg.senderId, msg.recipientId].filter(id => id !== userId),
          lastMessage: msg,
          unreadCount: 0,
          messages: []
        });
      }
      
      const conversation = conversations.get(key);
      conversation.messages.push(msg);
      
      // Обновляем последнее сообщение если это сообщение новее
      if (msg.createdAt > conversation.lastMessage.createdAt) {
        conversation.lastMessage = msg;
      }
      
      // Считаем непрочитанные сообщения (где пользователь - получатель и сообщение не прочитано)
      if (msg.recipientId === userId && !msg.isRead) {
        conversation.unreadCount++;
      }
    });
    
    return Array.from(conversations.values());
  }

  async getConversationMessages(carId, userId1, userId2) {
    return Array.from(this.messages.values()).filter(
      msg => msg.carId === carId && 
             ((msg.senderId === userId1 && msg.recipientId === userId2) ||
              (msg.senderId === userId2 && msg.recipientId === userId1))
    ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  async createMessage(insertMessage) {
    const message = {
      ...insertMessage,
      id: this.messageIdCounter++,
      isRead: false,
      createdAt: new Date(),
    };
    this.messages.set(message.id, message);
    this.saveData();
    return message;
  }

  async markMessagesAsRead(carId, userId) {
    let updatedCount = 0;
    this.messages.forEach((message, id) => {
      if (message.carId === carId && message.recipientId === userId && !message.isRead) {
        message.isRead = true;
        this.messages.set(id, message);
        updatedCount++;
      }
    });
    
    if (updatedCount > 0) {
      this.saveData();
    }
    
    return updatedCount;
  }

  async getUnreadMessageCount(userId) {
    let count = 0;
    this.messages.forEach(message => {
      if (message.recipientId === userId && !message.isRead) {
        count++;
      }
    });
    return count;
  }

  async getUnreadCountByConversation(userId) {
    const conversations = new Map();
    
    this.messages.forEach(message => {
      if (message.recipientId === userId && !message.isRead) {
        const key = `${message.carId}-${message.senderId}`;
        conversations.set(key, (conversations.get(key) || 0) + 1);
      }
    });
    
    return Object.fromEntries(conversations);
  }
}

// Создаем и экспортируем экземпляр
export const storage = new MemStorage();
