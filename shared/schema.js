import { pgTable, serial, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).default('user'),
  createdAt: timestamp('created_at').defaultNow()
});

export const cars = pgTable('cars', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  imageUrl: text('image_url'),
  price: integer('price').notNull(),
  maxSpeed: integer('max_speed'),
  acceleration: varchar('acceleration', { length: 10 }),
  drive: varchar('drive', { length: 50 }),
  category: varchar('category', { length: 50 }),
  server: varchar('server', { length: 50 }),
  serverId: varchar('server_id', { length: 50 }),
  phone: varchar('phone', { length: 20 }),
  telegram: varchar('telegram', { length: 50 }),
  discord: varchar('discord', { length: 50 }),
  transmission: varchar('transmission', { length: 50 }),
  fuelType: varchar('fuel_type', { length: 50 }),
  description: text('description'),
  isPremium: boolean('is_premium').default(false),
  createdBy: integer('created_by'),
  createdAt: timestamp('created_at').defaultNow()
});

export const carApplications = pgTable('car_applications', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  imageUrl: text('image_url'),
  price: integer('price').notNull(),
  maxSpeed: integer('max_speed'),
  acceleration: varchar('acceleration', { length: 10 }),
  drive: varchar('drive', { length: 50 }),
  category: varchar('category', { length: 50 }),
  server: varchar('server', { length: 50 }),
  serverId: varchar('server_id', { length: 50 }),
  phone: varchar('phone', { length: 20 }),
  telegram: varchar('telegram', { length: 50 }),
  discord: varchar('discord', { length: 50 }),
  transmission: varchar('transmission', { length: 50 }),
  fuelType: varchar('fuel_type', { length: 50 }),
  description: text('description'),
  isPremium: boolean('is_premium').default(false),
  status: varchar('status', { length: 20 }).default('pending'),
  createdBy: integer('created_by'),
  reviewedBy: integer('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow()
});

export const favorites = pgTable('favorites', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
  carId: integer('car_id'),
  createdAt: timestamp('created_at').defaultNow()
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  carId: integer('car_id'),
  senderId: integer('sender_id'),
  recipientId: integer('recipient_id'),
  content: text('content').notNull(),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow()
});

// Перечисления для валидации (оставляем как есть)
export const Categories = {
  STANDARD: 'standard',
  SPORT: 'sport', 
  COUPE: 'coupe',
  SUV: 'suv',
  MOTORCYCLE: 'motorcycle'
};

export const Servers = {
  ARBAT: 'arbat',
  PATRIKI: 'patriki', 
  RUBLEVKA: 'rublevka',
  TVERSKOY: 'tverskoy'
};

export const UserRoles = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
};
