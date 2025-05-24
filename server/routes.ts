import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
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
  // Добавляем debug middleware для всех API запросов
  app.use('/api', (req, res, next) => {
    console.log(`🔍 API запрос: ${req.method} ${req.originalUrl} ${req.url}`);
    next();
  });

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

  // Update user (admin only) - ВАЖНО: этот маршрут должен быть ПЕРЕД /role маршрутом
  app.patch("/api/users/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    console.log('🔧 PATCH /api/users/:id - Запрос получен', req.params.id, req.body);
    try {
      const userId = parseInt(req.params.id);
      const { username, role } = req.body;
      
      if (!username || !role) {
        return res.status(400).json({ message: "Укажите имя пользователя и роль" });
      }

      // Проверяем, что пользователь существует
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }

      // Проверяем, что новое имя пользователя не занято (если оно изменилось)
      if (username !== existingUser.username) {
        const userWithSameName = await storage.getUserByUsername(username);
        if (userWithSameName && userWithSameName.id !== userId) {
          return res.status(400).json({ message: "Имя пользователя уже занято" });
        }
      }

      const updatedUser = await storage.updateUser(userId, { username, role });
      if (!updatedUser) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }

      const safeUser = {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
        createdAt: typeof updatedUser.createdAt === 'string' ? updatedUser.createdAt : updatedUser.createdAt.toISOString()
      };
      console.log('Отправляем обновленного пользователя:', safeUser);
      res.setHeader('Content-Type', 'application/json');
      res.json(safeUser);
    } catch (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      res.status(500).json({ message: "Ошибка при обновлении пользователя" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/users/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Нельзя удалить самого себя
      if (userId === req.user!.id) {
        return res.status(400).json({ message: "Нельзя удалить собственный аккаунт" });
      }

      // Проверяем, что пользователь существует перед удалением
      const userToDelete = await storage.getUser(userId);
      if (!userToDelete) {
        return res.status(404).json({ message: "Пользователь не найден" });
      }

      // Удаляем пользователя из базы данных (это также удалит все связанные данные)
      const deleted = await storage.deleteUser(userId);
      if (!deleted) {
        return res.status(500).json({ message: "Ошибка при удалении пользователя" });
      }

      console.log(`👤 Пользователь ${userToDelete.username} (ID: ${userId}) полностью удален из системы`);
      res.json({ message: "Пользователь полностью удален из системы" });
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error);
      res.status(500).json({ message: "Ошибка при удалении пользователя" });
    }
  });

  // Update user role only (admin only) - ПОСЛЕ основного маршрута редактирования
  app.patch("/api/users/:id/role", requireAuth, requireRole(["admin"]), async (req, res) => {
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

  // Messages API routes
  app.get("/api/messages", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getMessagesByUser(req.user!.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Ошибка при получении сообщений" });
    }
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      console.log("🔍 POST /api/messages - Пользователь:", req.user?.id, req.user?.username);
      console.log("🔍 POST /api/messages - Данные:", req.body);
      
      const { carId, sellerId, message } = req.body;
      
      // Валидация данных
      if (!carId || !sellerId || !message) {
        console.log("❌ Валидация: отсутствуют поля");
        return res.status(400).json({ message: "Все поля обязательны" });
      }
      
      const carIdNum = parseInt(carId);
      const sellerIdNum = parseInt(sellerId);
      
      if (isNaN(carIdNum) || isNaN(sellerIdNum)) {
        console.log("❌ Валидация: некорректные ID");
        return res.status(400).json({ message: "Некорректные ID" });
      }
      
      // Проверяем, что автомобиль существует
      const car = await storage.getCar(carIdNum);
      if (!car) {
        console.log("❌ Автомобиль не найден:", carIdNum);
        return res.status(404).json({ message: "Автомобиль не найден" });
      }
      
      console.log("🚗 Автомобиль найден:", car.name, "владелец:", car.createdBy);
      
      // Проверяем, что пользователь не пишет сам себе
      if (req.user!.id === sellerIdNum) {
        console.log("❌ Пользователь пытается писать самому себе");
        return res.status(400).json({ message: "Нельзя писать самому себе" });
      }
      
      console.log("✅ Отправка сообщения от", req.user!.id, "к", sellerIdNum);
      
      const newMessage = await storage.sendMessage({
        carId: carIdNum,
        buyerId: req.user!.id,
        sellerId: sellerIdNum,
        message: message.trim(),
      });
      
      console.log("✅ Сообщение отправлено:", newMessage.id);
      res.status(201).json(newMessage);
    } catch (error) {
      console.error("❌ Ошибка при отправке сообщения:", error);
      res.status(500).json({ message: "Ошибка при отправке сообщения" });
    }
  });

  app.get("/api/messages", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getMessagesByUser(req.user!.id);
      res.json(messages);
    } catch (error) {
      console.error("❌ Ошибка при получении сообщений:", error);
      res.status(500).json({ message: "Ошибка при получении сообщений" });
    }
  });

  app.get("/api/messages/unread-count", requireAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadMessagesCount(req.user!.id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Ошибка при получении счетчика" });
    }
  });

  const httpServer = createServer(app);

  // Настраиваем WebSocket сервер для push-уведомлений
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Храним активные WebSocket соединения пользователей
  const userConnections = new Map<number, WebSocket>();

  wss.on('connection', (ws) => {
    console.log('📡 Новое WebSocket соединение');
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'authenticate' && message.userId) {
          // Регистрируем пользователя
          userConnections.set(message.userId, ws);
          console.log(`👤 Пользователь ${message.userId} подключен к WebSocket`);
        }
      } catch (error) {
        console.error('Ошибка обработки WebSocket сообщения:', error);
      }
    });

    ws.on('close', () => {
      // Удаляем соединение при отключении
      for (const [userId, connection] of userConnections.entries()) {
        if (connection === ws) {
          userConnections.delete(userId);
          console.log(`👤 Пользователь ${userId} отключен от WebSocket`);
          break;
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket ошибка:', error);
    });
  });

  // Экспортируем функцию для отправки уведомлений
  global.sendNotification = (userId: number, notification: any) => {
    const connection = userConnections.get(userId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      try {
        connection.send(JSON.stringify(notification));
        console.log(`📨 Уведомление отправлено пользователю ${userId}`);
      } catch (error) {
        console.error('Ошибка отправки уведомления:', error);
      }
    }
  };

  return httpServer;
}
