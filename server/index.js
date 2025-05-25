import fs from "fs/promises";
import path from "path";

// In-memory storage
let data = {
  users: [],
  cars: [],
  carApplications: [],
  favorites: [],
  messages: []
};

let nextUserId = 1;
let nextCarId = 1;
let nextApplicationId = 1;
let nextFavoriteId = 1;
let nextMessageId = 1;

// File path for persistence
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'storage.json');

console.log("📁 Ensuring data directory exists:", DATA_DIR);

// Ensure data directory exists
try {
  await fs.mkdir(DATA_DIR, { recursive: true });
  console.log("✅ Data directory created:", DATA_DIR);
} catch (error) {
  console.error("❌ Error creating data directory:", error);
}

// Load data from file
async function loadData() {
  try {
    console.log("🔍 Trying to load data from:", DATA_FILE);
    
    // Check if directory exists
    try {
      await fs.access(DATA_DIR);
      console.log("📂 Data directory exists:", true);
    } catch {
      console.log("📂 Data directory exists:", false);
      await fs.mkdir(DATA_DIR, { recursive: true });
    }
    
    // Check if file exists
    try {
      await fs.access(DATA_FILE);
      console.log("📄 Storage file exists:", true);
    } catch {
      console.log("📄 Storage file exists:", false);
      console.log("⚠️ Storage file not found, starting with empty data");
      return;
    }

    const fileContent = await fs.readFile(DATA_FILE, 'utf8');
    const loadedData = JSON.parse(fileContent);
    
    data = {
      users: loadedData.users || [],
      cars: loadedData.cars || [],
      carApplications: loadedData.carApplications || [],
      favorites: loadedData.favorites || [],
      messages: loadedData.messages || []
    };
    
    // Update counters
    nextUserId = Math.max(...data.users.map(u => u.id || 0), 0) + 1;
    nextCarId = Math.max(...data.cars.map(c => c.id || 0), 0) + 1;
    nextApplicationId = Math.max(...data.carApplications.map(a => a.id || 0), 0) + 1;
    nextFavoriteId = Math.max(...data.favorites.map(f => f.id || 0), 0) + 1;
    nextMessageId = Math.max(...data.messages.map(m => m.id || 0), 0) + 1;
    
    console.log("✅ Data loaded successfully");
    console.log("📊 Loaded state:", {
      users: data.users.length,
      cars: data.cars.length,
      applications: data.carApplications.length,
      favorites: data.favorites.length,
      messages: data.messages.length
    });
  } catch (error) {
    console.error("❌ Error loading data:", error);
    console.log("⚠️ Starting with empty data due to load error");
  }
}

// Save data to file
async function saveData() {
  try {
    console.log("💾 Saving data to:", DATA_FILE);
    console.log("📊 Saving:", {
      Users: data.users.length,
      Cars: data.cars.length,
      Applications: data.carApplications.length,
      Favorites: data.favorites.length,
      Messages: data.messages.length
    });
    
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    console.log("✅ Data saved successfully");
  } catch (error) {
    console.error("❌ Error saving data:", error);
  }
}

// Initialize with load
await loadData();

// Initialize default data if empty
if (data.users.length === 0) {
  console.log("🔧 Initializing default data...");
  console.log("📊 Current state: Users=" + data.users.length + ", Cars=" + data.cars.length);
  
  // Create default admin user with bcrypt
  const bcrypt = await import("bcrypt");
  const hashedPassword = await bcrypt.hash('lql477kqkvb55vp', 10);
  
  console.log("👤 Creating default admin user...");
  const adminUser = {
    id: nextUserId++,
    username: '477-554',
    password: hashedPassword,
    role: 'admin',
    createdAt: new Date().toISOString()
  };
  
  data.users.push(adminUser);
  console.log("✅ Admin created with ID:", adminUser.id);
  
  // Create test cars
  console.log("🚗 Creating test cars...");
  const testCars = [
    {
      id: nextCarId++,
      name: "BMW M3",
      brand: "BMW", 
      model: "M3",
      year: 2023,
      price: 85000,
      category: "Sport",
      server: "EU",
      description: "High-performance sports sedan with twin-turbo engine",
      image: "https://via.placeholder.com/400x300/0066CC/FFFFFF?text=BMW+M3",
      createdBy: adminUser.id,
      createdAt: new Date().toISOString()
    },
    {
      id: nextCarId++,
      name: "Mercedes G-Class",
      brand: "Mercedes",
      model: "G-Class", 
      year: 2023,
      price: 125000,
      category: "SUV",
      server: "US",
      description: "Luxury off-road SUV with iconic design",
      image: "https://via.placeholder.com/400x300/000000/FFFFFF?text=Mercedes+G-Class",
      createdBy: adminUser.id,
      createdAt: new Date().toISOString()
    }
  ];
  
  data.cars.push(...testCars);
  testCars.forEach(car => {
    console.log(`🚗 Added car: ${car.name} (ID: ${car.id})`);
  });
  
  await saveData();
  console.log("🎯 Default data initialization complete");
}

// Simple session store for passport
const sessionStore = {
  sessions: new Map(),
  
  get(sessionId, callback) {
    const session = this.sessions.get(sessionId);
    callback(null, session);
  },
  
  set(sessionId, session, callback) {
    this.sessions.set(sessionId, session);
    callback(null);
  },
  
  destroy(sessionId, callback) {
    this.sessions.delete(sessionId);
    callback(null);
  }
};

// Storage methods
export const storage = {
  sessionStore,
  
  // User methods
  async getAllUsers() {
    return [...data.users];
  },
  
  async getUser(id) {
    return data.users.find(user => user.id === id);
  },
  
  async getUserByUsername(username) {
    return data.users.find(user => user.username === username);
  },
  
  async createUser(userData) {
    const user = {
      id: nextUserId++,
      ...userData,
      createdAt: new Date().toISOString()
    };
    data.users.push(user);
    await saveData();
    return user;
  },
  
  async updateUserRole(userId, role) {
    const user = data.users.find(u => u.id === userId);
    if (!user) return null;
    
    user.role = role;
    user.updatedAt = new Date().toISOString();
    await saveData();
    return user;
  },
  
  async deleteUser(userId) {
    const userIndex = data.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return false;
    
    data.users.splice(userIndex, 1);
    await saveData();
    return true;
  },
  
  // Car methods
  async getAllCars() {
    return [...data.cars];
  },
  
  async getCar(id) {
    return data.cars.find(car => car.id === id);
  },
  
  async getCarsByUser(userId) {
    return data.cars.filter(car => car.createdBy === userId);
  },
  
  async createCar(carData) {
    const car = {
      id: nextCarId++,
      ...carData,
      createdAt: new Date().toISOString()
    };
    data.cars.push(car);
    await saveData();
    return car;
  },
  
  async updateCar(carId, carData) {
    const car = data.cars.find(c => c.id === carId);
    if (!car) return null;
    
    Object.assign(car, carData, { updatedAt: new Date().toISOString() });
    await saveData();
    return car;
  },
  
  async deleteCar(carId) {
    const carIndex = data.cars.findIndex(c => c.id === carId);
    if (carIndex === -1) return false;
    
    data.cars.splice(carIndex, 1);
    await saveData();
    return true;
  },
  
  async searchCars(query, category, server) {
    let filtered = [...data.cars];
    
    if (query) {
      const searchTerm = query.toLowerCase();
      filtered = filtered.filter(car => 
        car.name.toLowerCase().includes(searchTerm) ||
        car.brand.toLowerCase().includes(searchTerm) ||
        car.model.toLowerCase().includes(searchTerm)
      );
    }
    
    if (category && category !== 'all') {
      filtered = filtered.filter(car => car.category === category);
    }
    
    if (server && server !== 'all') {
      filtered = filtered.filter(car => car.server === server);
    }
    
    return filtered;
  },
  
  // Car Application methods
  async getAllCarApplications() {
    return [...data.carApplications];
  },
  
  async getPendingCarApplications() {
    return data.carApplications.filter(app => app.status === 'pending');
  },
  
  async getCarApplicationsByUser(userId) {
    return data.carApplications.filter(app => app.userId === userId);
  },
  
  async createCarApplication(applicationData) {
    const application = {
      id: nextApplicationId++,
      status: 'pending',
      ...applicationData,
      createdAt: new Date().toISOString()
    };
    data.carApplications.push(application);
    await saveData();
    return application;
  },
  
  async updateCarApplicationStatus(applicationId, status, adminId = null) {
    const application = data.carApplications.find(app => app.id === applicationId);
    if (!application) return null;
    
    application.status = status;
    application.updatedAt = new Date().toISOString();
    
    if (adminId) {
      application.reviewedBy = adminId;
    }
    
    await saveData();
    return application;
  },
  
  // Favorites methods
  async getFavoritesByUser(userId) {
    const userFavorites = data.favorites.filter(fav => fav.userId === userId);
    const favoriteCarIds = userFavorites.map(fav => fav.carId);
    return data.cars.filter(car => favoriteCarIds.includes(car.id));
  },
  
  async addToFavorites(favoriteData) {
    // Check if already exists
    const existing = data.favorites.find(
      fav => fav.userId === favoriteData.userId && fav.carId === favoriteData.carId
    );
    
    if (existing) {
      return existing;
    }
    
    const favorite = {
      id: nextFavoriteId++,
      ...favoriteData,
      createdAt: new Date().toISOString()
    };
    
    data.favorites.push(favorite);
    await saveData();
    return favorite;
  },
  
  async removeFromFavorites(userId, carId) {
    const favoriteIndex = data.favorites.findIndex(
      fav => fav.userId === userId && fav.carId === carId
    );
    
    if (favoriteIndex === -1) return false;
    
    data.favorites.splice(favoriteIndex, 1);
    await saveData();
    return true;
  },
  
  async isFavorite(userId, carId) {
    return data.favorites.some(fav => fav.userId === userId && fav.carId === carId);
  },
  
  // Messages methods
  async getUnreadMessageCount(userId) {
    return data.messages.filter(msg => msg.recipientId === userId && !msg.read).length;
  }
};

console.log("✅ Storage module initialized");
