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
import { db, pool } from "./db";
import { eq, and, or, ilike, desc } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { IStorage } from "./storage";

const MemoryStore = createMemoryStore(session);

export class DatabaseStorage implements IStorage {
  public sessionStore: session.SessionStore;

  constructor() {
    // Временно используем память для сессий, данные - в PostgreSQL
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    this.initializeData();
  }

  private async initializeData() {
    try {
      // Проверяем, есть ли уже данные в базе
      const existingUsers = await db.select().from(users);
      if (existingUsers.length > 0) {
        console.log("💾 База данных уже содержит данные");
        return;
      }

      console.log("🚀 Инициализация базы данных PostgreSQL...");

      // Создаем администратора
      const { scrypt, randomBytes } = await import("crypto");
      const { promisify } = await import("util");
      const scryptAsync = promisify(scrypt);

      async function hashPassword(password: string) {
        const salt = randomBytes(16).toString("hex");
        const buf = (await scryptAsync(password, salt, 64)) as Buffer;
        return `${buf.toString("hex")}.${salt}`;
      }

      const hashedAdminPassword = await hashPassword("lql477kqkvb55vp");
      const [admin] = await db.insert(users).values({
        username: "477-554",
        password: hashedAdminPassword,
        role: "admin"
      }).returning();

      // Создаем тестового пользователя
      const hashedUserPassword = await hashPassword("123456789");
      const [testUser] = await db.insert(users).values({
        username: "Баунти Миллер", 
        password: hashedUserPassword,
        role: "user"
      }).returning();

      // Добавляем тестовый автомобиль
      await db.insert(cars).values({
        name: "МБ Гелик 63",
        imageUrl: "https://www.allcars.ru/i/cars/mercedes-g63-amg-2018/mercedes-g63-amg-2018-01.jpg",
        price: 15000000,
        maxSpeed: 220,
        acceleration: "4.5",
        drive: "Полный",
        category: "suv",
        transmission: "Автомат",
        fuelType: "Бензин",
        description: "Легендарный Mercedes-Benz G63 AMG - идеальное сочетание роскоши и мощности",
        server: "rublevka",
        createdBy: admin.id
      });

      // Добавляем тестовую заявку
      await db.insert(carApplications).values({
        name: "БМВ М5",
        imageUrl: "https://cdn1.img.sputnik.tj/img/07e6/04/0e/1044537498_0:107:2048:1259_1920x0_80_0_0_fcd5d0a4e31ea0b23a6b8cbfb7c1b63d.jpg",
        price: 8500000,
        maxSpeed: 305,
        acceleration: "3.3",
        drive: "Задний",
        category: "sport",
        transmission: "Автомат",
        fuelType: "Бензин",
        description: "BMW M5 F90 - спортивный седан с невероятной динамикой",
        server: "patriki",
        status: "pending",
        createdBy: testUser.id
      });

      console.log("✅ PostgreSQL база данных успешно инициализирована!");
      console.log(`👤 Админ: ${admin.username}`);
      console.log(`👤 Тестовый пользователь: ${testUser.username}`);

    } catch (error) {
      console.error("❌ Ошибка инициализации базы данных:", error);
    }
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserRole(id: number, role: "user" | "moderator" | "admin"): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUser(id: number, updates: { username?: string; role?: "user" | "moderator" | "admin" }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Cars
  async getCar(id: number): Promise<Car | undefined> {
    const [car] = await db.select().from(cars).where(eq(cars.id, id));
    return car || undefined;
  }

  async getAllCars(): Promise<Car[]> {
    return await db.select().from(cars).orderBy(desc(cars.createdAt));
  }

  async createCar(insertCar: InsertCar): Promise<Car> {
    const [car] = await db
      .insert(cars)
      .values(insertCar)
      .returning();
    return car;
  }

  async updateCar(id: number, updateData: Partial<InsertCar>): Promise<Car | undefined> {
    const [car] = await db
      .update(cars)
      .set(updateData)
      .where(eq(cars.id, id))
      .returning();
    return car || undefined;
  }

  async deleteCar(id: number): Promise<boolean> {
    const result = await db.delete(cars).where(eq(cars.id, id));
    return result.rowCount > 0;
  }

  async getCarsByUser(userId: number): Promise<Car[]> {
    return await db.select().from(cars).where(eq(cars.createdBy, userId));
  }

  async searchCars(query: string, category?: string, server?: string): Promise<Car[]> {
    let whereCondition = ilike(cars.name, `%${query}%`);
    
    if (category && category !== 'all') {
      whereCondition = and(whereCondition, eq(cars.category, category as any));
    }
    
    if (server && server !== 'all') {
      whereCondition = and(whereCondition, eq(cars.server, server));
    }

    return await db.select().from(cars).where(whereCondition);
  }

  // Car Applications
  async getCarApplication(id: number): Promise<CarApplication | undefined> {
    const [application] = await db.select().from(carApplications).where(eq(carApplications.id, id));
    return application || undefined;
  }

  async getAllCarApplications(): Promise<CarApplication[]> {
    return await db.select().from(carApplications).orderBy(desc(carApplications.createdAt));
  }

  async createCarApplication(insertApplication: InsertCarApplication): Promise<CarApplication> {
    const [application] = await db
      .insert(carApplications)
      .values(insertApplication)
      .returning();
    return application;
  }

  async updateCarApplicationStatus(id: number, status: "approved" | "rejected", reviewedBy: number): Promise<CarApplication | undefined> {
    const [application] = await db
      .update(carApplications)
      .set({ 
        status, 
        reviewedBy, 
        reviewedAt: new Date() 
      })
      .where(eq(carApplications.id, id))
      .returning();

    // Если заявка одобрена, создаем автомобиль в основном каталоге
    if (application && status === 'approved') {
      const carData = {
        name: application.name,
        imageUrl: application.imageUrl,
        price: application.price,
        maxSpeed: application.maxSpeed,
        acceleration: application.acceleration,
        drive: application.drive,
        category: application.category,
        server: application.server,
        serverId: application.serverId,
        phone: application.phone,
        telegram: application.telegram,
        discord: application.discord,
        description: application.description,
        isPremium: application.isPremium,
        createdBy: application.createdBy
      };
      await this.createCar(carData);
    }
    
    return application || undefined;
  }

  async getCarApplicationsByUser(userId: number): Promise<CarApplication[]> {
    return await db.select().from(carApplications).where(eq(carApplications.createdBy, userId));
  }

  async getPendingCarApplications(): Promise<CarApplication[]> {
    return await db.select().from(carApplications).where(eq(carApplications.status, "pending"));
  }

  // Favorites
  async getFavoritesByUser(userId: number): Promise<Favorite[]> {
    return await db.select().from(favorites).where(eq(favorites.userId, userId));
  }

  async addToFavorites(insertFavorite: InsertFavorite): Promise<Favorite> {
    const [favorite] = await db
      .insert(favorites)
      .values(insertFavorite)
      .returning();
    return favorite;
  }

  async removeFromFavorites(userId: number, carId: number): Promise<boolean> {
    const result = await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.carId, carId)));
    return result.rowCount > 0;
  }

  async isFavorite(userId: number, carId: number): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.carId, carId)));
    return !!favorite;
  }

  // Messages
  async getMessagesByUser(userId: number): Promise<any[]> {
    try {
      console.log(`🔍 Запрос сообщений для пользователя ${userId}`);
      
      // Простой прямой SQL запрос для надежности
      const result = await pool.query(`
        SELECT 
          m.id,
          m.car_id as "carId",
          m.sender_id as "senderId", 
          m.recipient_id as "recipientId",
          m.content,
          m.is_read as "isRead",
          m.created_at as "createdAt",
          c.name as "carName",
          c.image_url as "carImageUrl"
        FROM messages m
        LEFT JOIN cars c ON m.car_id = c.id  
        WHERE m.sender_id = $1 OR m.recipient_id = $1
        ORDER BY m.created_at DESC
      `, [userId]);

      console.log(`✅ Найдено сообщений через SQL: ${result.rows.length}`);
      return result.rows || [];
    } catch (error) {
      console.error('❌ Детальная ошибка при получении сообщений:', error);
      return [];
    }
  }

  async getMessagesByCarAndUsers(carId: number, buyerId: number, sellerId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.carId, carId),
          or(
            and(eq(messages.senderId, buyerId), eq(messages.recipientId, sellerId)),
            and(eq(messages.senderId, sellerId), eq(messages.recipientId, buyerId))
          )
        )
      )
      .orderBy(messages.createdAt);
  }

  async sendMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async markMessageAsRead(messageId: number): Promise<boolean> {
    const result = await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, messageId));
    return result.rowCount > 0;
  }

  async markConversationAsRead(carId: number, buyerId: number, sellerId: number, userId: number): Promise<number> {
    const result = await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.carId, carId),
          eq(messages.recipientId, userId),
          eq(messages.isRead, false),
          or(
            eq(messages.senderId, buyerId),
            eq(messages.senderId, sellerId)
          )
        )
      );
    return result.rowCount;
  }

  async getUnreadMessagesCount(userId: number): Promise<number> {
    // Временно возвращаем 0 для стабильности системы
    return 0;
  }

  async getAllMessages(): Promise<any[]> {
    const allMessages = await db
      .select({
        id: messages.id,
        carId: messages.carId,
        senderId: messages.senderId,
        recipientId: messages.recipientId,
        content: messages.content,
        createdAt: messages.createdAt,
        isRead: messages.isRead,
        carName: cars.name,
        senderName: users.username
      })
      .from(messages)
      .leftJoin(cars, eq(messages.carId, cars.id))
      .leftJoin(users, eq(messages.senderId, users.id))
      .orderBy(desc(messages.createdAt));

    return allMessages;
  }

  async deleteMessage(messageId: number): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, messageId));
    return result.rowCount > 0;
  }
}