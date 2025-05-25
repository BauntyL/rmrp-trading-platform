import fs from 'fs/promises';
import path from 'path';

class Storage {
  constructor() {
    this.data = {
      users: [],
      cars: [],
      applications: [],
      favorites: [],
      messages: []
    };
    this.nextUserId = 1;
    this.nextCarId = 1;
    this.nextApplicationId = 1;
    this.nextFavoriteId = 1;
    this.nextMessageId = 1;
    this.dataFile = path.join(process.cwd(), 'data', 'storage.json');
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    console.log('🔧 Initializing storage...');
    
    try {
      await fs.mkdir(path.dirname(this.dataFile), { recursive: true });
      
      try {
        const data = await fs.readFile(this.dataFile, 'utf8');
        const parsed = JSON.parse(data);
        this.data = parsed;
        
        // Update next IDs based on existing data
        if (this.data.users && this.data.users.length > 0) {
          this.nextUserId = Math.max(...this.data.users.map(u => u.id)) + 1;
        }
        if (this.data.cars && this.data.cars.length > 0) {
          this.nextCarId = Math.max(...this.data.cars.map(c => c.id)) + 1;
        }
        if (this.data.applications && this.data.applications.length > 0) {
          this.nextApplicationId = Math.max(...this.data.applications.map(a => a.id)) + 1;
        }
        if (this.data.favorites && this.data.favorites.length > 0) {
          this.nextFavoriteId = Math.max(...this.data.favorites.map(f => f.id)) + 1;
        }
        if (this.data.messages && this.data.messages.length > 0) {
          this.nextMessageId = Math.max(...this.data.messages.map(m => m.id)) + 1;
        }
        
        console.log('✅ Storage loaded from file');
        console.log(`📊 Loaded: Users: ${this.data.users?.length || 0}, Cars: ${this.data.cars?.length || 0}, Applications: ${this.data.applications?.length || 0}`);
      } catch (error) {
        console.log('📝 No existing storage file, creating default data...');
        await this.createDefaultData();
        await this.saveData();
      }
    } catch (error) {
      console.error('❌ Storage initialization error:', error);
      await this.createDefaultData();
    }
    
    this.initialized = true;
  }

  async createDefaultData() {
    console.log('🔧 Creating default data...');
    
    // Ensure all arrays exist
    this.data = {
      users: [],
      cars: [],
      applications: [],
      favorites: [],
      messages: []
    };

    // Add default cars
    const defaultCars = [
      {
        id: this.nextCarId++,
        name: "BMW M3",
        category: "sport",
        server: "patriki",
        price: 25000,
        maxSpeed: 280,
        acceleration: "3.5",
        drive: "RWD",
        isPremium: true,
        createdBy: null,
        createdAt: new Date().toISOString()
      },
      {
        id: this.nextCarId++,
        name: "Mercedes G-Class",
        category: "suv",
        server: "patriki",
        price: 35000,
        maxSpeed: 220,
        acceleration: "5.2",
        drive: "AWD",
        isPremium: true,
        createdBy: null,
        createdAt: new Date().toISOString()
      }
    ];

    this.data.cars = defaultCars;
    console.log('✅ Default data created');
  }

  async saveData() {
    try {
      console.log(`💾 Saving data to: ${this.dataFile}`);
      console.log(`📊 Saving: { Users: ${this.data.users?.length || 0}, Cars: ${this.data.cars?.length || 0}, Applications: ${this.data.applications?.length || 0}, Favorites: ${this.data.favorites?.length || 0}, Messages: ${this.data.messages?.length || 0} }`);
      
      await fs.mkdir(path.dirname(this.dataFile), { recursive: true });
      await fs.writeFile(this.dataFile, JSON.stringify(this.data, null, 2));
      console.log('✅ Data saved successfully');
    } catch (error) {
      console.error('❌ Error saving data:', error);
    }
  }

  // ============ USER METHODS ============

  async createUser(userData) {
    await this.init();
    
    const user = {
      id: this.nextUserId++,
      ...userData,
      createdAt: new Date().toISOString(),
    };

    this.data.users.push(user);
    await this.saveData();
    return user;
  }

  async getUser(id) {
    await this.init();
    return this.data.users.find(user => user.id === id);
  }

  async getUserByUsername(username) {
    await this.init();
    return this.data.users.find(user => user.username === username);
  }

  async getAllUsers() {
    await this.init();
    return this.data.users;
  }

  async updateUserRole(userId, role) {
    await this.init();
    
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return null;

    user.role = role;
    await this.saveData();
    return user;
  }

  async deleteUser(userId) {
    await this.init();
    
    const index = this.data.users.findIndex(u => u.id === userId);
    if (index === -1) return false;

    this.data.users.splice(index, 1);
    await this.saveData();
    return true;
  }

  // ============ CAR METHODS ============

  async createCar(carData) {
    await this.init();
    
    console.log(`📝 Creating car: ${carData.name}`);
    
    const car = {
      id: this.nextCarId++,
      ...carData,
      createdAt: carData.createdAt || new Date().toISOString(),
    };

    this.data.cars.push(car);
    await this.saveData();
    
    console.log(`✅ Car created with ID: ${car.id} - ${car.name}`);
    return car;
  }

  async getAllCars() {
    await this.init();
    return this.data.cars;
  }

  async getCar(id) {
    await this.init();
    return this.data.cars.find(car => car.id === id);
  }

  async getCarsByUser(userId) {
    await this.init();
    return this.data.cars.filter(car => car.createdBy === userId);
  }

  async searchCars(query, category, server) {
    await this.init();
    
    let cars = this.data.cars;

    if (query) {
      cars = cars.filter(car => 
        car.name.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (category && category !== 'all') {
      cars = cars.filter(car => car.category === category);
    }

    if (server && server !== 'all') {
      cars = cars.filter(car => car.server === server);
    }

    return cars;
  }

  async updateCar(id, updateData) {
    await this.init();
    
    const car = this.data.cars.find(c => c.id === id);
    if (!car) return null;

    Object.assign(car, updateData);
    car.updatedAt = new Date().toISOString();
    
    await this.saveData();
    return car;
  }

  async deleteCar(id) {
    await this.init();
    
    const index = this.data.cars.findIndex(c => c.id === id);
    if (index === -1) return false;

    this.data.cars.splice(index, 1);
    await this.saveData();
    return true;
  }

  // ============ APPLICATION METHODS ============

  async createCarApplication(applicationData) {
    await this.init();
    
    const application = {
      id: this.nextApplicationId++,
      ...applicationData,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.data.applications.push(application);
    await this.saveData();
    return application;
  }

  async getAllCarApplications() {
    await this.init();
    return this.data.applications;
  }

  async getPendingCarApplications() {
    await this.init();
    return this.data.applications.filter(app => app.status === 'pending');
  }

  async getCarApplicationsByUser(userId) {
    await this.init();
    return this.data.applications.filter(app => app.userId === userId);
  }

  async updateCarApplicationStatus(applicationId, status, reviewedBy) {
    await this.init();
    
    console.log(`📝 Updating application ${applicationId} to status: ${status} by user: ${reviewedBy}`);
    
    const application = this.data.applications.find(app => app.id === applicationId);
    if (!application) {
      console.log(`❌ Application not found: ${applicationId}`);
      return null;
    }

    application.status = status;
    application.reviewedAt = new Date().toISOString();
    application.reviewedBy = reviewedBy;

    // 🚀 АВТОМАТИЧЕСКИ СОЗДАЕМ АВТОМОБИЛЬ ПРИ ОДОБРЕНИИ
    if (status === 'approved') {
      console.log(`✅ Application approved - creating car for: ${application.name}`);
      
      const carData = {
        name: application.name,
        category: application.category,
        server: application.server,
        price: application.price,
        maxSpeed: application.maxSpeed,
        acceleration: application.acceleration,
        drive: application.drive,
        isPremium: application.isPremium || false,
        createdBy: application.userId,
        applicationId: application.id,
        createdAt: new Date().toISOString()
      };
      
      const newCar = await this.createCar(carData);
      console.log(`🚗 Car created from approved application: ${newCar.name} (ID: ${newCar.id})`);
    }

    await this.saveData();
    console.log(`✅ Application status updated and saved: ${applicationId} -> ${status}`);
    return application;
  }

  // ============ FAVORITES METHODS ============

  async addToFavorites(userId, carId) {
    await this.init();
    
    // Check if already in favorites
    const existing = this.data.favorites.find(f => f.userId === userId && f.carId === carId);
    if (existing) return existing;

    const favorite = {
      id: this.nextFavoriteId++,
      userId,
      carId,
      createdAt: new Date().toISOString(),
    };

    this.data.favorites.push(favorite);
    await this.saveData();
    return favorite;
  }

  async removeFromFavorites(userId, carId) {
    await this.init();
    
    const index = this.data.favorites.findIndex(f => f.userId === userId && f.carId === carId);
    if (index === -1) return false;

    this.data.favorites.splice(index, 1);
    await this.saveData();
    return true;
  }

  async getUserFavorites(userId) {
    await this.init();
    
    const userFavorites = this.data.favorites.filter(f => f.userId === userId);
    const favoriteCarIds = userFavorites.map(f => f.carId);
    
    return this.data.cars.filter(car => favoriteCarIds.includes(car.id));
  }

  async getFavoritesByUser(userId) {
    await this.init();
    return this.data.favorites.filter(f => f.userId === userId);
  }

  async checkFavorite(userId, carId) {
    await this.init();
    return this.data.favorites.some(f => f.userId === userId && f.carId === carId);
  }

  // ============ MESSAGES METHODS ============

  async createMessage(messageData) {
    await this.init();
    
    const message = {
      id: this.nextMessageId++,
      ...messageData,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    this.data.messages.push(message);
    await this.saveData();
    return message;
  }

  async getMessagesByUser(userId) {
    await this.init();
    return this.data.messages.filter(msg => msg.receiverId === userId);
  }

  async getUnreadCount(userId) {
    await this.init();
    return this.data.messages.filter(msg => msg.receiverId === userId && !msg.isRead).length;
  }

  async markMessageAsRead(messageId) {
    await this.init();
    
    const message = this.data.messages.find(msg => msg.id === messageId);
    if (!message) return null;

    message.isRead = true;
    await this.saveData();
    return message;
  }

  async deleteMessage(messageId) {
    await this.init();
    
    const index = this.data.messages.findIndex(msg => msg.id === messageId);
    if (index === -1) return false;

    this.data.messages.splice(index, 1);
    await this.saveData();
    return true;
  }
}

export const storage = new Storage();
