import { db } from "./db";
import { users, cars, carApplications } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function initializeDatabase() {
  try {
    // Проверяем, есть ли уже данные в базе
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
      console.log("💾 База данных уже инициализирована");
      return;
    }

    console.log("🚀 Инициализация базы данных...");

    // Создаем администратора
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

    console.log("✅ База данных успешно инициализирована!");
    console.log(`👤 Админ: ${admin.username}`);
    console.log(`👤 Тестовый пользователь: ${testUser.username}`);

  } catch (error) {
    console.error("❌ Ошибка инициализации базы данных:", error);
    throw error;
  }
}