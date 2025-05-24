import { 
  users, 
  cars, 
  carApplications, 
  favorites,
  messages,
  type User, 
  type InsertUser, 
  type Car, 
  type InsertCar, 
  type CarApplication, 
  type InsertCarApplication, 
  type Favorite, 
  type InsertFavorite,
  type Message,
  type InsertMessage
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import fs from "fs";
import path from "path";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(id: number, role: "user" | "moderator" | "admin"): Promise<User | undefined>;
  updateUser(id: number, updates: { username?: string; role?: "user" | "moderator" | "admin" }): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // Cars
  getCar(id: number): Promise<Car | undefined>;
  getAllCars(): Promise<Car[]>;
  createCar(car: InsertCar): Promise<Car>;
  updateCar(id: number, car: Partial<InsertCar>): Promise<Car | undefined>;
  deleteCar(id: number): Promise<boolean>;
  getCarsByUser(userId: number): Promise<Car[]>;
  searchCars(query: string, category?: string, server?: string): Promise<Car[]>;

  // Car Applications
  getCarApplication(id: number): Promise<CarApplication | undefined>;
  getAllCarApplications(): Promise<CarApplication[]>;
  createCarApplication(application: InsertCarApplication): Promise<CarApplication>;
  updateCarApplicationStatus(id: number, status: "approved" | "rejected", reviewedBy: number): Promise<CarApplication | undefined>;
  getCarApplicationsByUser(userId: number): Promise<CarApplication[]>;
  getPendingCarApplications(): Promise<CarApplication[]>;

  // Favorites
  getFavoritesByUser(userId: number): Promise<Favorite[]>;
  addToFavorites(favorite: InsertFavorite): Promise<Favorite>;
  removeFromFavorites(userId: number, carId: number): Promise<boolean>;
  isFavorite(userId: number, carId: number): Promise<boolean>;

  // Messages
  getMessagesByUser(userId: number): Promise<any[]>;
  getMessagesByCarAndUsers(carId: number, buyerId: number, sellerId: number): Promise<Message[]>;
  sendMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(messageId: number): Promise<boolean>;
  markConversationAsRead(carId: number, buyerId: number, sellerId: number, userId: number): Promise<number>;
  getUnreadMessagesCount(userId: number): Promise<number>;

  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private cars: Map<number, Car> = new Map();
  private carApplications: Map<number, CarApplication> = new Map();
  private favorites: Map<number, Favorite> = new Map();
  private messages: Map<number, Message> = new Map();
  
  private userIdCounter = 1;
  private carIdCounter = 1;
  private carApplicationIdCounter = 1;
  private favoriteIdCounter = 1;
  private messageIdCounter = 1;
  
  public sessionStore: session.SessionStore;
  private dataDir = path.join(process.cwd(), 'data');

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    this.ensureDataDir();
    this.loadData();
    this.initializeDefaultData();
  }

  private ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private saveData() {
    try {
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
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  private loadData() {
    try {
      const dataPath = path.join(this.dataDir, 'storage.json');
      if (fs.existsSync(dataPath)) {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
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
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  private async initializeDefaultData() {
    // Создаем админа по умолчанию если его нет
    const adminExists = Array.from(this.users.values()).some(u => u.role === 'admin');
    if (!adminExists) {
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('lql477kqkvb55vp', 10);
      
      const admin: User = {
        id: this.userIdCounter++,
        username: '477-554',
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date(),
      };
      this.users.set(admin.id, admin);
      this.saveData();
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.userIdCounter++,
      role: insertUser.role || 'user',
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    this.saveData();
    return user;
  }

  async updateUserRole(id: number, role: "user" | "moderator" | "admin"): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      user.role = role;
      this.users.set(id, user);
      this.saveData();
      return user;
    }
    return undefined;
  }

  async updateUser(id: number, updates: { username?: string; role?: "user" | "moderator" | "admin" }): Promise<User | undefined> {
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

  async deleteUser(id: number): Promise<boolean> {
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

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Car methods
  async getCar(id: number): Promise<Car | undefined> {
    return this.cars.get(id);
  }

  async getAllCars(): Promise<Car[]> {
    return Array.from(this.cars.values()).filter(car => car.status === 'active');
  }

  async createCar(insertCar: InsertCar): Promise<Car> {
    const car: Car = {
      ...insertCar,
      id: this.carIdCounter++,
      status: 'active',
      createdAt: new Date(),
    };
    this.cars.set(car.id, car);
    this.saveData();
    return car;
  }

  async updateCar(id: number, updateData: Partial<InsertCar>): Promise<Car | undefined> {
    const car = this.cars.get(id);
    if (car) {
      Object.assign(car, updateData);
      this.cars.set(id, car);
      this.saveData();
      return car;
    }
    return undefined;
  }

  async deleteCar(id: number): Promise<boolean> {
    const deleted = this.cars.delete(id);
    if (deleted) {
      this.saveData();
    }
    return deleted;
  }

  async getCarsByUser(userId: number): Promise<Car[]> {
    return Array.from(this.cars.values()).filter(car => car.createdBy === userId);
  }

  async searchCars(query: string, category?: string, server?: string): Promise<Car[]> {
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
  async getCarApplication(id: number): Promise<CarApplication | undefined> {
    return this.carApplications.get(id);
  }

  async getAllCarApplications(): Promise<CarApplication[]> {
    return Array.from(this.carApplications.values());
  }

  async createCarApplication(insertApplication: InsertCarApplication): Promise<CarApplication> {
    const application: CarApplication = {
      ...insertApplication,
      id: this.carApplicationIdCounter++,
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date(),
    };
    this.carApplications.set(application.id, application);
    this.saveData();
    return application;
  }

  async updateCarApplicationStatus(id: number, status: "approved" | "rejected", reviewedBy: number): Promise<CarApplication | undefined> {
    const application = this.carApplications.get(id);
    if (application) {
      application.status = status;
      application.reviewedBy = reviewedBy;
      application.reviewedAt = new Date();
      
      this.carApplications.set(id, application);
      
      // If approved, create the car
      if (status === 'approved') {
        const { id: appId, status: appStatus, reviewedBy: rb, reviewedAt: ra, ...carData } = application;
        await this.createCar(carData);
      }
      
      this.saveData();
      return application;
    }
    return undefined;
  }

  async getCarApplicationsByUser(userId: number): Promise<CarApplication[]> {
    return Array.from(this.carApplications.values()).filter(app => app.createdBy === userId);
  }

  async getPendingCarApplications(): Promise<CarApplication[]> {
    return Array.from(this.carApplications.values()).filter(app => app.status === 'pending');
  }

  // Favorite methods
  async getFavoritesByUser(userId: number): Promise<Favorite[]> {
    return Array.from(this.favorites.values()).filter(fav => fav.userId === userId);
  }

  async addToFavorites(insertFavorite: InsertFavorite): Promise<Favorite> {
    const favorite: Favorite = {
      ...insertFavorite,
      id: this.favoriteIdCounter++,
      createdAt: new Date(),
    };
    this.favorites.set(favorite.id, favorite);
    this.saveData();
    return favorite;
  }

  async removeFromFavorites(userId: number, carId: number): Promise<boolean> {
    const favoriteEntry = Array.from(this.favorites.entries()).find(
      ([_, fav]) => fav.userId === userId && fav.carId === carId
    );
    
    if (favoriteEntry) {
      this.favorites.delete(favoriteEntry[0]);
      this.saveData();
      return true;
    }
    return false;
  }

  async isFavorite(userId: number, carId: number): Promise<boolean> {
    return Array.from(this.favorites.values()).some(
      fav => fav.userId === userId && fav.carId === carId
    );
  }

  // Messages
  async getMessagesByUser(userId: number): Promise<any[]> {
    try {
      console.log("🔍 Получение сообщений для пользователя:", userId);
      const messages = Array.from(this.messages.values()).filter(
        message => message.buyerId === userId || message.sellerId === userId
      );
      
      console.log("📨 Найдено сообщений:", messages.length);
      
      if (messages.length === 0) {
        return [];
      }

      const sortedMessages = messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Добавляем имена пользователей и автомобилей к сообщениям
      const enrichedMessages = sortedMessages.map(message => {
        const buyer = this.users.get(message.buyerId);
        const seller = this.users.get(message.sellerId);
        const car = this.cars.get(message.carId);
        
        return {
          ...message,
          createdAt: message.createdAt.toISOString(),
          buyerName: buyer?.username || `Пользователь #${message.buyerId}`,
          sellerName: seller?.username || `Пользователь #${message.sellerId}`,
          carName: car?.name || `Автомобиль #${message.carId}`
        };
      });

      console.log("✅ Сообщения обогащены данными:", enrichedMessages.length);
      return enrichedMessages;
    } catch (error) {
      console.error("❌ Ошибка в getMessagesByUser:", error);
      return [];
    }
  }

  async getMessagesByCarAndUsers(carId: number, buyerId: number, sellerId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      message => message.carId === carId && 
                message.buyerId === buyerId && 
                message.sellerId === sellerId
    ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async sendMessage(insertMessage: InsertMessage): Promise<Message> {
    const message: Message = {
      id: this.messageIdCounter++,
      ...insertMessage,
      isRead: false,
      createdAt: new Date(),
    };
    
    this.messages.set(message.id, message);
    this.saveData();
    return message;
  }

  async markMessageAsRead(messageId: number): Promise<boolean> {
    const message = this.messages.get(messageId);
    if (message) {
      message.isRead = true;
      this.saveData();
      return true;
    }
    return false;
  }

  async markConversationAsRead(carId: number, buyerId: number, sellerId: number, userId: number): Promise<number> {
    let markedCount = 0;
    
    Array.from(this.messages.values()).forEach(message => {
      if (message.carId === carId && 
          ((message.buyerId === buyerId && message.sellerId === sellerId) ||
           (message.buyerId === sellerId && message.sellerId === buyerId)) &&
          message.recipientId === userId && 
          !message.isRead) {
        message.isRead = true;
        markedCount++;
      }
    });
    
    if (markedCount > 0) {
      this.saveData();
    }
    
    return markedCount;
  }

  async getUnreadMessagesCount(userId: number): Promise<number> {
    return Array.from(this.messages.values()).filter(
      message => message.recipientId === userId && !message.isRead
    ).length;
  }
}

export const storage = new MemStorage();
