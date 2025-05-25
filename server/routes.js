// Express types removed for JavaScript compatibility
import express from "express";
import path from "path";
import { createServer } from "http";

import { setupAuth } from "./auth.js";
import { storage } from "./storage.js";
import { pool } from "./db.js";
import { insertCarSchema, insertCarApplicationSchema } from "../shared/schema.js";
import { z } from "zod";

// Система модерации сообщений
// ModerationResult structure: { allowed: boolean, reason?: string, cleanContent: string }

function moderateMessage(content) {
  const message = content.toLowerCase();
  
  // Список запрещенных слов (мат, оскорбления)
  const profanity = [
    'блядь', 'сука', 'пизда', 'хуй', 'ебать', 'гавно', 'говно', 'дерьмо',
    'козел', 'козёл', 'дебил', 'идиот', 'тварь', 'уебан', 'уёбан',
    'мразь', 'гнида', 'падла', 'сволочь', 'ублюдок', 'мудак', 'дурак'
  ];
  
  // Политические термины
  const political = [
    'путин', 'зеленский', 'biden', 'украина', 'россия',
    'война', 'санкции', 'политика', 'выборы', 'президент'
  ];
  
  // Межнациональная рознь
  const ethnic = [
    'хохол', 'москаль', 'русня', 'укроп', 'ватник', 'бандера',
    'кацап', 'америкос', 'пиндос', 'негр', 'азиат'
  ];
  
  // Подозрительные ссылки и контакты
  const links = [
    'http://', 'https://', 'www.', '.com', '.ru', '.ua', '.org',
    'telegram', 'whatsapp', 'viber', 'skype', '+7', '+380', '+1'
  ];
  
  // Проверка на мат
  for (const word of profanity) {
    if (message.includes(word)) {
      return {
        allowed: false,
        reason: "недопустимые выражения",
        cleanContent: content
      };
    }
  }
  
  // Проверка на политику
  for (const word of political) {
    if (message.includes(word)) {
      return {
        allowed: false,
        reason: "политические темы запрещены",
        cleanContent: content
      };
    }
  }
  
  // Проверка на межнациональную рознь
  for (const word of ethnic) {
    if (message.includes(word)) {
      return {
        allowed: false,
        reason: "межнациональная рознь недопустима",
        cleanContent: content
      };
    }
  }
  
  // Проверка на ссылки и контакты
  for (const link of links) {
    if (message.includes(link)) {
      return {
        allowed: false,
        reason: "ссылки и контакты запрещены в чате",
        cleanContent: content
      };
    }
  }
  
  // Проверка на спам (повторяющиеся символы)
  if (/(.)\1{4,}/.test(message)) {
    return {
      allowed: false,
      reason: "спам недопустим",
      cleanContent: content
    };
  }
  
  // Проверка на длину сообщения
  if (content.length > 500) {
    return {
      allowed: false,
      reason: "сообщение слишком длинное (максимум 500 символов)",
      cleanContent: content
    };
  }
  
  return {
    allowed: true,
    cleanContent: content
  };
}

// Middleware для проверки аутентификации
function requireAuth(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Требуется авторизация" });
  }
  next();
}

// Middleware для проверки роли
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Недостаточно прав доступа" });
    }
    next();
  };
}

export function registerRoutes(app) {
  // КРИТИЧЕСКИ ВАЖНО: Добавляем debug middleware В САМОМ НАЧАЛЕ
  app.use('/api', (req, res, next) => {
    console.log(`🔍 API запрос: ${req.method} ${req.originalUrl} ${req.url}`);
    
    // Специальная проверка для всех endpoint удаления
    if (req.url.includes('/my-car-removal') || req.url.includes('/remove-car')) {
      console.log(`🎯🎯🎯 НАЙДЕН ЗАПРОС УДАЛЕНИЯ! URL: ${req.url}, Method: ${req.method}, Query: ${JSON.stringify(req.query)}`);
    }
    
    next();
  });

  // ПРОСТОЙ GET ОБРАБОТЧИК - ОБХОД ВСЕХ СИСТЕМНЫХ БЛОКИРОВОК
  app.get("/api/remove-car", requireAuth, async (req, res) => {
    console.log(`🚗🚗🚗 ПРОСТОЙ GET ОБРАБОТЧИК УДАЛЕНИЯ! Car ID: ${req.query.carId}, User: ${req.user?.id || 'неавторизован'}`);
    console.log(`🚗🚗🚗 Query параметры:`, req.query);
    
    try {
      const carId = parseInt(req.query.carId);
      console.log(`🗑️ Пользователь ${req.user.id} удаляет автомобиль ID: ${carId}`);
      
      // Проверяем, что автомобиль принадлежит пользователю
      const car = await storage.getCar(carId);
      if (!car) {
        return res.status(404).json({ message: "Автомобиль не найден" });
      }
      
      if (car.createdBy !== req.user.id) {
        return res.status(403).json({ message: "Вы можете удалять только свои автомобили" });
      }
      
      // Удаляем автомобиль
      const deleted = await storage.deleteCar(carId);
      if (!deleted) {
        return res.status(500).json({ message: "Ошибка при удалении автомобиля" });
      }
      
      console.log(`✅ Автомобиль "${car.name}" успешно удален пользователем ${req.user.id}`);
      
      res.json({ 
        message: `Автомобиль "${car.name}" снят с продажи. Все связанные диалоги удалены.` 
      });
    } catch (error) {
      console.error("❌ Ошибка при снятии автомобиля с продажи:", error);
      res.status(500).json({ message: "Ошибка при снятии автомобиля с продажи" });
    }
  });

  // Cars API routes
  app.get('/api/cars', async (req, res) => {
    try {
      const cars = await storage.getAllCars();
      res.json(cars);
    } catch (error) {
      console.error('Error fetching cars:', error);
      res.status(500).json({ error: 'Failed to fetch cars' });
    }
  });

  app.get('/api/cars/search', async (req, res) => {
    try {
      const { query, category, server } = req.query;
      const cars = await storage.searchCars(query, category, server);
      res.json(cars);
    } catch (error) {
      console.error('Error searching cars:', error);
      res.status(500).json({ error: 'Failed to search cars' });
    }
  });

  app.get('/api/cars/my', requireAuth, async (req, res) => {
    try {
      const cars = await storage.getCarsByUser(req.user.id);
      res.json(cars);
    } catch (error) {
      console.error('Error fetching user cars:', error);
      res.status(500).json({ error: 'Failed to fetch user cars' });
    }
  });

  app.get('/api/cars/:id', async (req, res) => {
    try {
      const carId = parseInt(req.params.id);
      const car = await storage.getCar(carId);
      if (!car) {
        return res.status(404).json({ error: 'Car not found' });
      }
      res.json(car);
    } catch (error) {
      console.error('Error fetching car:', error);
      res.status(500).json({ error: 'Failed to fetch car' });
    }
  });

  app.post('/api/cars', requireAuth, async (req, res) => {
    try {
      const carData = {
        ...req.body,
        createdBy: req.user.id,
      };
      
      const car = await storage.createCar(carData);
      res.status(201).json(car);
    } catch (error) {
      console.error('Error creating car:', error);
      res.status(500).json({ error: 'Failed to create car' });
    }
  });

  app.put('/api/cars/:id', requireAuth, async (req, res) => {
    try {
      const carId = parseInt(req.params.id);
      const car = await storage.getCar(carId);
      
      if (!car) {
        return res.status(404).json({ error: 'Car not found' });
      }

      if (car.createdBy !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to update this car' });
      }

      const updatedCar = await storage.updateCar(carId, req.body);
      res.json(updatedCar);
    } catch (error) {
      console.error('Error updating car:', error);
      res.status(500).json({ error: 'Failed to update car' });
    }
  });

  app.delete('/api/cars/:id', requireAuth, async (req, res) => {
    try {
      const carId = parseInt(req.params.id);
      const car = await storage.getCar(carId);
      
      if (!car) {
        return res.status(404).json({ error: 'Car not found' });
      }

      if (car.createdBy !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to delete this car' });
      }

      const deleted = await storage.deleteCar(carId);
      if (deleted) {
        res.json({ message: 'Car deleted successfully' });
      } else {
        res.status(500).json({ error: 'Failed to delete car' });
      }
    } catch (error) {
      console.error('Error deleting car:', error);
      res.status(500).json({ error: 'Failed to delete car' });
    }
  });

  // Car Applications API routes
  app.post('/api/car-applications', requireAuth, async (req, res) => {
    try {
      const applicationData = {
        ...req.body,
        createdBy: req.user.id,
      };
      
      const application = await storage.createCarApplication(applicationData);
      res.status(201).json(application);
    } catch (error) {
      console.error('Error creating car application:', error);
      res.status(500).json({ error: 'Failed to create car application' });
    }
  });

  app.get('/api/car-applications', requireRole(['admin']), async (req, res) => {
    try {
      const applications = await storage.getAllCarApplications();
      res.json(applications);
    } catch (error) {
      console.error('Error fetching car applications:', error);
      res.status(500).json({ error: 'Failed to fetch car applications' });
    }
  });

  app.get('/api/car-applications/pending', requireRole(['admin']), async (req, res) => {
    try {
      const applications = await storage.getPendingCarApplications();
      res.json(applications);
    } catch (error) {
      console.error('Error fetching pending car applications:', error);
      res.status(500).json({ error: 'Failed to fetch pending car applications' });
    }
  });

  app.get('/api/car-applications/my', requireAuth, async (req, res) => {
    try {
      const applications = await storage.getCarApplicationsByUser(req.user.id);
      res.json(applications);
    } catch (error) {
      console.error('Error fetching user car applications:', error);
      res.status(500).json({ error: 'Failed to fetch user car applications' });
    }
  });

  app.patch('/api/car-applications/:id/status', requireRole(['admin']), async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const application = await storage.updateCarApplicationStatus(
        applicationId, 
        status, 
        req.user.id
      );
      
      if (!application) {
        return res.status(404).json({ error: 'Car application not found' });
      }

      res.json(application);
    } catch (error) {
      console.error('Error updating car application status:', error);
      res.status(500).json({ error: 'Failed to update car application status' });
    }
  });

  // Favorites API routes
  app.post('/api/favorites', requireAuth, async (req, res) => {
    try {
      const { carId } = req.body;
      const favorite = await storage.addToFavorites(req.user.id, carId);
      res.status(201).json(favorite);
    } catch (error) {
      console.error('Error adding to favorites:', error);
      res.status(500).json({ error: 'Failed to add to favorites' });
    }
  });

  app.delete('/api/favorites/:carId', requireAuth, async (req, res) => {
    try {
      const carId = parseInt(req.params.carId);
      const removed = await storage.removeFromFavorites(req.user.id, carId);
      if (removed) {
        res.json({ message: 'Removed from favorites' });
      } else {
        res.status(404).json({ error: 'Favorite not found' });
      }
    } catch (error) {
      console.error('Error removing from favorites:', error);
      res.status(500).json({ error: 'Failed to remove from favorites' });
    }
  });

  app.get('/api/favorites', requireAuth, async (req, res) => {
    try {
      const favorites = await storage.getUserFavorites(req.user.id);
      res.json(favorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      res.status(500).json({ error: 'Failed to fetch favorites' });
    }
  });

  app.get('/api/favorites/check/:carId', requireAuth, async (req, res) => {
    try {
      const carId = parseInt(req.params.carId);
      const isFavorite = await storage.checkFavorite(req.user.id, carId);
      res.json({ isFavorite });
    } catch (error) {
      console.error('Error checking favorite:', error);
      res.status(500).json({ error: 'Failed to check favorite' });
    }
  });

  // Messages API routes
  app.post('/api/messages', requireAuth, async (req, res) => {
    try {
      const messageData = {
        ...req.body,
        senderId: req.user.id,
      };
      
      // Модерация сообщения
      const moderation = moderateMessage(messageData.content);
      if (!moderation.allowed) {
        return res.status(400).json({ 
          error: `Сообщение отклонено: ${moderation.reason}` 
        });
      }
      
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).json({ error: 'Failed to create message' });
    }
  });

  app.get('/api/messages', requireAuth, async (req, res) => {
    try {
      const messages = await storage.getMessagesByUser(req.user.id);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.get('/api/messages/unread-count', requireAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  });

  app.patch('/api/messages/:id/read', requireAuth, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const message = await storage.markMessageAsRead(messageId);
      
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      res.json(message);
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({ error: 'Failed to mark message as read' });
    }
  });

  // Admin routes
  app.get('/api/admin/users', requireRole(['admin']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.patch('/api/admin/users/:id/role', requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;
      
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const user = await storage.updateUserRole(userId, role);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  });

  app.delete('/api/admin/users/:id', requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Предотвращаем удаление самого себя
      if (userId === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      const deleted = await storage.deleteUser(userId);
      
      if (deleted) {
        res.json({ message: 'User deleted successfully' });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // Create HTTP server
  const server = createServer(app);

  // Serve static files in production
  if (process.env.NODE_ENV === "production") {
    console.log("🎯 Setting up static files...");
    
    // Serve static files
    app.use(express.static('public'));
    
    // Catch-all handler for SPA (MUST BE LAST!)
    app.get("*", (req, res) => {
      console.log(`🎯 Serving SPA for route: ${req.path}`);
      res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
    });
  }

  return server;
}
