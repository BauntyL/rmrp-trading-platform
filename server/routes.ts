import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertCarSchema, insertCarApplicationSchema } from "@shared/schema";
import { z } from "zod";

// Middleware для проверки аутентификации
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Требуется авторизация" });
  }
  next();
}

// Middleware для проверки роли
function requireRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Недостаточно прав доступа" });
    }
    next();
  };
}

export function registerRoutes(app: Express): Server {
  // Настройка аутентификации
  setupAuth(app);

  // Добавляем middleware для отладки API запросов
  app.use('/api/*', (req, res, next) => {
    console.log(`API Request: ${req.method} ${req.path}`);
    next();
  });

  // Cars routes
  app.get("/api/cars", async (req, res) => {
    try {
      const { search, category, server } = req.query;
      const cars = await storage.searchCars(
        search as string || "",
        category === "all" ? undefined : category as string,
        server === "all" ? undefined : server as string
      );
      res.json(cars);
    } catch (error) {
      res.status(500).json({ message: "Ошибка при получении автомобилей" });
    }
  });

  app.get("/api/cars/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const car = await storage.getCar(id);
      if (!car) {
        return res.status(404).json({ message: "Автомобиль не найден" });
      }
      res.json(car);
    } catch (error) {
      res.status(500).json({ message: "Ошибка при получении автомобиля" });
    }
  });

  app.get("/api/my-cars", requireAuth, async (req, res) => {
    try {
      const cars = await storage.getCarsByUser(req.user!.id);
      res.json(cars);
    } catch (error) {
      res.status(500).json({ message: "Ошибка при получении ваших автомобилей" });
    }
  });

  app.put("/api/cars/:id", requireRole(["moderator", "admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validation = insertCarSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ message: "Некорректные данные автомобиля" });
      }

      const car = await storage.updateCar(id, validation.data);
      if (!car) {
        return res.status(404).json({ message: "Автомобиль не найден" });
      }
      
      res.json(car);
    } catch (error) {
      res.status(500).json({ message: "Ошибка при обновлении автомобиля" });
    }
  });

  app.delete("/api/cars/:id", requireRole(["moderator", "admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCar(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Автомобиль не найден" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Ошибка при удалении автомобиля" });
    }
  });

  // Car Applications routes
  app.post("/api/car-applications", requireAuth, async (req, res) => {
    try {
      const validation = insertCarApplicationSchema.safeParse({
        ...req.body,
        createdBy: req.user!.id,
      });
      
      if (!validation.success) {
        return res.status(400).json({ message: "Некорректные данные заявки" });
      }

      const application = await storage.createCarApplication(validation.data);
      res.status(201).json(application);
    } catch (error) {
      res.status(500).json({ message: "Ошибка при создании заявки" });
    }
  });

  app.get("/api/my-applications", requireAuth, async (req, res) => {
    try {
      const applications = await storage.getCarApplicationsByUser(req.user!.id);
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Ошибка при получении ваших заявок" });
    }
  });

  app.get("/api/applications", requireRole(["moderator", "admin"]), async (req, res) => {
    try {
      const applications = await storage.getAllCarApplications();
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Ошибка при получении заявок" });
    }
  });

  app.get("/api/applications/pending", requireRole(["moderator", "admin"]), async (req, res) => {
    try {
      const applications = await storage.getPendingCarApplications();
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: "Ошибка при получении заявок на модерацию" });
    }
  });

  app.patch("/api/applications/:id", requireRole(["moderator", "admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      const statusSchema = z.enum(["approved", "rejected"]);
      const validation = statusSchema.safeParse(status);
      
      if (!validation.success) {
        return res.status(400).json({ message: "Некорректный статус" });
      }

      const application = await storage.updateCarApplicationStatus(id, validation.data, req.user!.id);
      if (!application) {
        return res.status(404).json({ message: "Заявка не найдена" });
      }
      
      res.json(application);
    } catch (error) {
      res.status(500).json({ message: "Ошибка при обновлении заявки" });
    }
  });

  // Favorites routes
  app.get("/api/favorites", requireAuth, async (req, res) => {
    try {
      const favorites = await storage.getFavoritesByUser(req.user!.id);
      const favoriteCarIds = favorites.map(f => f.carId);
      const cars = [];
      
      for (const carId of favoriteCarIds) {
        const car = await storage.getCar(carId);
        if (car) cars.push(car);
      }
      
      res.json(cars);
    } catch (error) {
      res.status(500).json({ message: "Ошибка при получении избранного" });
    }
  });

  app.post("/api/favorites", requireAuth, async (req, res) => {
    try {
      const { carId } = req.body;
      const carIdSchema = z.number().int().positive();
      const validation = carIdSchema.safeParse(carId);
      
      if (!validation.success) {
        return res.status(400).json({ message: "Некорректный ID автомобиля" });
      }

      const car = await storage.getCar(validation.data);
      if (!car) {
        return res.status(404).json({ message: "Автомобиль не найден" });
      }

      const isFavorite = await storage.isFavorite(req.user!.id, validation.data);
      if (isFavorite) {
        return res.status(400).json({ message: "Автомобиль уже в избранном" });
      }

      const favorite = await storage.addToFavorites({
        userId: req.user!.id,
        carId: validation.data,
      });
      
      res.status(201).json(favorite);
    } catch (error) {
      res.status(500).json({ message: "Ошибка при добавлении в избранное" });
    }
  });

  app.delete("/api/favorites/:carId", requireAuth, async (req, res) => {
    try {
      const carId = parseInt(req.params.carId);
      const removed = await storage.removeFromFavorites(req.user!.id, carId);
      
      if (!removed) {
        return res.status(404).json({ message: "Автомобиль не найден в избранном" });
      }
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Ошибка при удалении из избранного" });
    }
  });

  app.get("/api/favorites/check/:carId", requireAuth, async (req, res) => {
    try {
      const carId = parseInt(req.params.carId);
      const isFavorite = await storage.isFavorite(req.user!.id, carId);
      res.json({ isFavorite });
    } catch (error) {
      res.status(500).json({ message: "Ошибка при проверке избранного" });
    }
  });

  app.post("/api/favorites/toggle/:carId", requireAuth, async (req, res) => {
    try {
      const carId = parseInt(req.params.carId);
      const car = await storage.getCar(carId);
      
      if (!car) {
        return res.status(404).json({ message: "Автомобиль не найден" });
      }

      const isFavorite = await storage.isFavorite(req.user!.id, carId);
      
      if (isFavorite) {
        // Удаляем из избранного
        await storage.removeFromFavorites(req.user!.id, carId);
        res.json({ action: "removed", isFavorite: false });
      } else {
        // Добавляем в избранное
        await storage.addToFavorites({
          userId: req.user!.id,
          carId: carId,
        });
        res.json({ action: "added", isFavorite: true });
      }
    } catch (error) {
      res.status(500).json({ message: "Ошибка при обновлении избранного" });
    }
  });

  // User management routes (admin only)
  app.get("/api/users", requireRole(["admin"]), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Исключаем пароли из ответа
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Ошибка при получении пользователей" });
    }
  });

  app.patch("/api/users/:id/role", requireRole(["admin"]), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { role } = req.body;
      
      const roleSchema = z.enum(["user", "moderator", "admin"]);
      const validation = roleSchema.safeParse(role);
      
      if (!validation.success) {
        return res.status(400).json({ message: "Некорректная роль" });
      }

      const user = await storage.updateUserRole(id, validation.data);
      if (!user) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }
      
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Ошибка при обновлении роли пользователя" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
