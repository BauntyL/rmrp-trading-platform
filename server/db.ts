import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema.js';

const { Pool } = pg;

console.log('🗄️ Connecting to PostgreSQL...');
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const db = drizzle(pool, { schema });

// Тест подключения
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

// Инициализация таблиц
export async function initDatabase() {
  try {
    console.log('🔧 Initializing database tables...');
    
    // Создаем таблицы если не существуют
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cars (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        image_url TEXT,
        price INTEGER NOT NULL,
        max_speed INTEGER,
        acceleration VARCHAR(10),
        drive VARCHAR(50),
        category VARCHAR(50),
        server VARCHAR(50),
        server_id VARCHAR(50),
        phone VARCHAR(20),
        telegram VARCHAR(50),
        discord VARCHAR(50),
        transmission VARCHAR(50),
        fuel_type VARCHAR(50),
        description TEXT,
        is_premium BOOLEAN DEFAULT false,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS car_applications (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        image_url TEXT,
        price INTEGER NOT NULL,
        max_speed INTEGER,
        acceleration VARCHAR(10),
        drive VARCHAR(50),
        category VARCHAR(50),
        server VARCHAR(50),
        server_id VARCHAR(50),
        phone VARCHAR(20),
        telegram VARCHAR(50),
        discord VARCHAR(50),
        transmission VARCHAR(50),
        fuel_type VARCHAR(50),
        description TEXT,
        is_premium BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'pending',
        created_by INTEGER REFERENCES users(id),
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        car_id INTEGER REFERENCES cars(id),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, car_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        car_id INTEGER REFERENCES cars(id),
        sender_id INTEGER REFERENCES users(id),
        recipient_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Database tables initialized');
    
    // Добавляем тестовые данные если база пустая
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      await createTestData();
    }
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}

async function createTestData() {
  try {
    console.log('🌱 Creating test data...');
    
    // Создаем админа 477-554
    await pool.query(`
      INSERT INTO users (username, password, role) 
      VALUES ('477-554', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'admin')
    `);
    
    // Создаем Баунти Миллер как админа с новым паролем
    const bcrypt = await import('bcrypt');
    const bountyPassword = await bcrypt.hash('Lqlcpyvb555!999#81', 10);
    await pool.query(`
      INSERT INTO users (username, password, role) 
      VALUES ('Баунти Миллер', $1, 'admin')
    `, [bountyPassword]);
    
    console.log('✅ Test data created');
    console.log('👤 Admin 477-554: lql477kqkvb55vp');
    console.log('👤 Admin Баунти Миллер: Lqlcpyvb555!999#81');
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
}
