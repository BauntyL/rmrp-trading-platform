import { 
  users, 
  cars, 
  carApplications, 
  favorites,
  messages
} from "../shared/schema.js";
import { db, pool, initDatabase } from "./db.js";
import { eq, and, or, ilike, desc } from "drizzle-orm";

export class DatabaseStorage {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    console.log('🔧 Initializing PostgreSQL storage...');
    await initDatabase();
    this.initialized = true;
    console.log('✅ PostgreSQL storage initialized');
  }

  // ============ USER METHODS ============

  async createUser(userData) {
    await this.init();
    
    const [user] = await db
      .insert(users)
      .values({
        username: userData.username,
        password: userData.password,
        role: userData.role || 'user'
      })
      .returning();

    console.log(`✅ User created: ${user.username} (ID: ${user.id})`);
    return user;
  }

  async getUser(id) {
    await this.init();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  }

  async getUserByUsername(username) {
    await this.init();
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || null;
  }

  async getAllUsers() {
    await this.init();
    return await db.select().from(users);
  }

  async updateUserRole(userId, role) {
    await this.init();
    
    const [user] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning();

    return user || null;
  }

  async deleteUser(userId) {
    await this.init();
    
    const result = await db.delete(users).where(eq(users.id, userId));
    return result.rowCount > 0;
  }

  // ============ CAR METHODS ============

  async createCar(carData) {
    await this.init();
    
    console.log(`📝 Creating car: ${carData.name}`);
    
    const [car] = await db
      .insert(cars)
      .values({
        name: carData.name,
        imageUrl: carData.imageUrl,
        price: carData.price,
        maxSpeed: carData.maxSpeed,
        acceleration: carData.acceleration,
        drive: carData.drive,
        category: carData.category,
        server: carData.server,
        serverId: carData.serverId,
        phone: carData.phone,
        telegram: carData.telegram,
        discord: carData.discord,
        transmission: carData.transmission,
        fuelType: carData.fuelType,
        description: carData.description,
        isPremium: carData.isPremium || false,
        createdBy: carData.createdBy
      })
      .returning();

    console.log(`✅ Car created with ID: ${car.id} - ${car.name}`);
    return car;
  }

  async getAllCars() {
    await this.init();
    return await db.select().from(cars).orderBy(desc(cars.createdAt));
  }

  async getCar(id) {
    await this.init();
    const [car] = await db.select().from(cars).where(eq(cars.id, id));
    return car || null;
  }

  async getCarsByUser(userId) {
    await this.init();
    return await db.select().from(cars).where(eq(cars.createdBy, userId));
  }

  async searchCars(query, category, server) {
    await this.init();
    
    let whereConditions = [];

    if (query) {
      whereConditions.push(ilike(cars.name, `%${query}%`));
    }

    if (category && category !== 'all') {
      whereConditions.push(eq(cars.category, category));
    }

    if (server && server !== 'all') {
      whereConditions.push(eq(cars.server, server));
    }

    if (whereConditions.length === 0) {
      return await db.select().from(cars).orderBy(desc(cars.createdAt));
    }

    return await db.select().from(cars)
      .where(and(...whereConditions))
      .orderBy(desc(cars.createdAt));
  }

  async updateCar(id, updateData) {
    await this.init();
    
    const [car] = await db
      .update(cars)
      .set(updateData)
      .where(eq(cars.id, id))
      .returning();

    return car || null;
  }

  async deleteCar(id) {
    await this.init();
    
    const result = await db.delete(cars).where(eq(cars.id, id));
    return result.rowCount > 0;
  }

  // ============ APPLICATION METHODS ============

  async createCarApplication(applicationData) {
    await this.init();
    
    const [application] = await db
      .insert(carApplications)
      .values({
        ...applicationData,
        status: 'pending'
      })
      .returning();

    return application;
  }

  async getAllCarApplications() {
    await this.init();
    return await db.select().from(carApplications).orderBy(desc(carApplications.createdAt));
  }

  async getPendingCarApplications() {
    await this.init();
    return await db.select().from(carApplications)
      .where(eq(carApplications.status, 'pending'))
      .orderBy(desc(carApplications.createdAt));
  }

  async getCarApplicationsByUser(userId) {
    await this.init();
    return await db.select().from(carApplications)
      .where(eq(carApplications.createdBy, userId))
      .orderBy(desc(carApplications.createdAt));
  }

  async updateCarApplicationStatus(applicationId, status, reviewedBy) {
    await this.init();
    
    console.log(`📝 Updating application ${applicationId} to status: ${status}`);
    
    const [application] = await db
      .update(carApplications)
      .set({ 
        status, 
        reviewedBy, 
        reviewedAt: new Date() 
      })
      .where(eq(carApplications.id, applicationId))
      .returning();

    if (!application) {
      console.log(`❌ Application not found: ${applicationId}`);
      return null;
    }

    // 🚀 АВТОМАТИЧЕСКИ СОЗДАЕМ АВТОМОБИЛЬ ПРИ ОДОБРЕНИИ
    if (status === 'approved') {
      console.log(`✅ Application approved - creating car for: ${application.name}`);
      
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
        transmission: application.transmission,
        fuelType: application.fuelType,
        description: application.description,
        isPremium: application.isPremium || false,
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
    const [existing] = await db.select().from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.carId, carId)));
    
    if (existing) return existing;

    const [favorite] = await db
      .insert(favorites)
      .values({ userId, carId })
      .returning();

    return favorite;
  }

  async removeFromFavorites(userId, carId) {
    await this.init();
    
    const result = await db.delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.carId, carId)));
    
    return result.rowCount > 0;
  }

  async getUserFavorites(userId) {
    await this.init();
    
    const result = await db
      .select({
        car: cars
      })
      .from(favorites)
      .innerJoin(cars, eq(favorites.carId, cars.id))
      .where(eq(favorites.userId, userId));
    
    return result.map(row => row.car);
  }

  async getFavoritesByUser(userId) {
    await this.init();
    return await db.select().from(favorites).where(eq(favorites.userId, userId));
  }

  async checkFavorite(userId, carId) {
    await this.init();
    const [favorite] = await db.select().from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.carId, carId)));
    return !!favorite;
  }

  // ============ MESSAGES METHODS ============

  async createMessage(messageData) {
    await this.init();
    
    const [message] = await db
      .insert(messages)
      .values({
        ...messageData,
        isRead: false
      })
      .returning();

    return message;
  }

  async getMessagesByUser(userId) {
    await this.init();
    return await db.select().from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.recipientId, userId)))
      .orderBy(desc(messages.createdAt));
  }

  async getUnreadCount(userId) {
    await this.init();
    const result = await db.select({ count: 'COUNT(*)' }).from(messages)
      .where(and(eq(messages.recipientId, userId), eq(messages.isRead, false)));
    
    return parseInt(result[0]?.count || 0);
  }

  async markMessageAsRead(messageId) {
    await this.init();
    
    const [message] = await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, messageId))
      .returning();

    return message || null;
  }

  async deleteMessage(messageId) {
    await this.init();
    
    const result = await db.delete(messages).where(eq(messages.id, messageId));
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
