import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").$type<"user" | "moderator" | "admin">().notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cars = pgTable("cars", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  price: integer("price").notNull(),
  maxSpeed: integer("max_speed").notNull(),
  acceleration: text("acceleration").notNull(),
  drive: text("drive").notNull(),
  category: text("category").$type<"standard" | "sport" | "coupe" | "suv" | "motorcycle">().notNull(),
  server: text("server").$type<"arbat" | "patriki" | "rublevka" | "tverskoy">().notNull(),
  serverId: text("server_id"),
  phone: text("phone"),
  telegram: text("telegram"),
  discord: text("discord"),
  description: text("description"),
  isPremium: boolean("is_premium").default(false).notNull(),
  status: text("status").$type<"active" | "pending" | "rejected">().notNull().default("active"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const carApplications = pgTable("car_applications", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  price: integer("price").notNull(),
  maxSpeed: integer("max_speed").notNull(),
  acceleration: text("acceleration").notNull(),
  drive: text("drive").notNull(),
  category: text("category").$type<"standard" | "sport" | "coupe" | "suv" | "motorcycle">().notNull(),
  server: text("server").$type<"arbat" | "patriki" | "rublevka" | "tverskoy">().notNull(),
  serverId: text("server_id"),
  phone: text("phone"),
  telegram: text("telegram"),
  discord: text("discord"),
  description: text("description"),
  isPremium: boolean("is_premium").default(false).notNull(),
  status: text("status").$type<"pending" | "approved" | "rejected">().notNull().default("pending"),
  createdBy: integer("created_by").notNull(),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  carId: integer("car_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  role: z.enum(["user", "moderator", "admin"]).optional(),
});

export const insertCarSchema = createInsertSchema(cars).omit({
  id: true,
  createdAt: true,
  status: true,
}).extend({
  category: z.enum(["standard", "sport", "coupe", "suv", "motorcycle"]),
  server: z.enum(["arbat", "patriki", "rublevka", "tverskoy"]),
});

export const insertCarApplicationSchema = createInsertSchema(carApplications).omit({
  id: true,
  createdAt: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
}).extend({
  category: z.enum(["standard", "sport", "coupe", "suv", "motorcycle"]),
  server: z.enum(["arbat", "patriki", "rublevka", "tverskoy"]),
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Car = typeof cars.$inferSelect;
export type InsertCar = z.infer<typeof insertCarSchema>;
export type CarApplication = typeof carApplications.$inferSelect;
export type InsertCarApplication = z.infer<typeof insertCarApplicationSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
