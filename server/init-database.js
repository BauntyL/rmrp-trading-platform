import bcrypt from "bcrypt";
import { pool } from "./db.js";

// Функция для хеширования пароля
async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

// Функция для создания пользователя
async function createUser(username, password, role) {
  const hashedPassword = await hashPassword(password);
  const result = await pool.query(
    'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *',
    [username, hashedPassword, role]
  );
  return result.rows[0];
}

// Функция для создания автомобиля
async function createCar(carData) {
  const {
    name,
    description,
    price,
    category,
    server,
    createdBy,
    imageUrl = 'https://via.placeholder.com/400x300?text=Car'
  } = carData;

  const result = await pool.query(
    `INSERT INTO cars (name, description, price, category, server, "createdBy", "imageUrl") 
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [name, description, price, category, server, createdBy, imageUrl]
  );
  return result.rows[0];
}

// Основная функция инициализации базы данных
export async function initDatabase() {
  console.log('🔧 Initializing database tables...');

  try {
    // Создание таблицы пользователей
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Создание таблицы автомобилей
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

    // Создание таблицы заявок на автомобили
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

    // Создание таблицы избранного
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
        "carId" INTEGER REFERENCES cars(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "carId")
      )
    `);

    // Создание таблицы сообщений
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

    console.log('✅ Database tables initialized');

    // Проверяем, существуют ли админы
    const adminCheck = await pool.query(
      'SELECT * FROM users WHERE role = $1',
      ['admin']
    );

    if (adminCheck.rows.length === 0) {
      console.log('🌱 Creating admin accounts...');

      // Создаем административные аккаунты
      const admin1 = await createUser('477-554', 'lql477kqkvb55vp', 'admin');
      const admin2 = await createUser('Баунти Миллер', 'Lqlcpyvb555!999#81', 'admin');

      console.log(`👤 Admin 1: ${admin1.username} (ID: ${admin1.id})`);
      console.log(`👤 Admin 2: ${admin2.username} (ID: ${admin2.id})`);
      console.log('👤 Admin 477-554: lql477kqkvb55vp');
      console.log('👤 Admin Баунти Миллер: Lqlcpyvb555!999#81');
    } else {
      console.log(`✅ Found ${adminCheck.rows.length} existing admin(s)`);
      console.log('👤 Admin 477-554: lql477kqkvb55vp');
      console.log('👤 Admin Баунти Миллер: Lqlcpyvb555!999#81');
    }

    // Проверяем количество автомобилей
    const carCheck = await pool.query('SELECT COUNT(*) FROM cars');
    const carCount = parseInt(carCheck.rows[0].count);

    if (carCount === 0) {
      console.log('🚗 Creating sample cars...');

      // Создаем тестовые автомобили
      const sampleCars = [
        {
          name: 'BMW X5 M50i',
          description: 'Мощный и роскошный внедорожник с V8 двигателем. Отличное состояние, полная комплектация.',
          price: 4500000,
          category: 'Внедорожники',
          server: 'Grand RP',
          createdBy: adminCheck.rows[0]?.id || 1,
          imageUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Mercedes-Benz G63 AMG',
          description: 'Легендарный Гелендваген с мощным AMG двигателем. Статусный автомобиль для настоящих ценителей.',
          price: 6800000,
          category: 'Внедорожники',
          server: 'Arizona RP',
          createdBy: adminCheck.rows[0]?.id || 1,
          imageUrl: 'https://images.unsplash.com/photo-1563720360172-67b8f3dce741?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Lamborghini Huracán',
          description: 'Спортивный суперкар с невероятной динамикой. V10 двигатель, полный привод, карбоновые элементы.',
          price: 8900000,
          category: 'Спорткары',
          server: 'Radmir RP',
          createdBy: adminCheck.rows[0]?.id || 1,
          imageUrl: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Audi RS6 Avant',
          description: 'Универсал с душой спорткара. Quattro полный привод, twin-turbo V8, практичность и скорость.',
          price: 3200000,
          category: 'Универсалы',
          server: 'Grand RP',
          createdBy: adminCheck.rows[0]?.id || 1,
          imageUrl: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
        },
        {
          name: 'Tesla Model S Plaid',
          description: 'Электрический седан с рекордной динамикой. Автопилот, огромный запас хода, футуристичный интерьер.',
          price: 2800000,
          category: 'Электромобили',
          server: 'Arizona RP',
          createdBy: adminCheck.rows[0]?.id || 1,
          imageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
        }
      ];

      for (const carData of sampleCars) {
        const car = await createCar(carData);
        console.log(`🚗 Created car: ${car.name} (ID: ${car.id})`);
      }

      console.log(`✅ Created ${sampleCars.length} sample cars`);
    } else {
      console.log(`✅ Found ${carCount} existing cars in database`);
    }

    console.log('🎉 Database initialization completed successfully');

  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}
