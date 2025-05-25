import pkg from 'pg';
const { Pool } = pkg;
// Drizzle import removed - using native PostgreSQL
// Schema import removed - tables created manually

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Инициализация таблиц
export async function initDatabase() {
  try {
    console.log("🔧 Initializing database tables...");
    
    // Создаем таблицы если не существуют
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cars (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        category VARCHAR(100) NOT NULL,
        server VARCHAR(100) NOT NULL,
        "createdBy" INTEGER REFERENCES users(id) ON DELETE CASCADE,
        "imageUrl" TEXT DEFAULT 'https://via.placeholder.com/400x300?text=Car',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS car_applications (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        category VARCHAR(100) NOT NULL,
        server VARCHAR(100) NOT NULL,
        "createdBy" INTEGER REFERENCES users(id) ON DELETE CASCADE,
        "imageUrl" TEXT DEFAULT 'https://via.placeholder.com/400x300?text=Car',
        status VARCHAR(50) DEFAULT 'pending',
        "reviewedBy" INTEGER REFERENCES users(id),
        "reviewedAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
        "carId" INTEGER REFERENCES cars(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "carId")
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        "senderId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
        "receiverId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
        "carId" INTEGER REFERENCES cars(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        "isRead" BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Database tables initialized successfully");
    
  } catch (error) {
    console.error("❌ Database initialization error:", error);
    throw error;
  }
}
