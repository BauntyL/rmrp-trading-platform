import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";

// Декларация типов для global функции
declare global {
  var sendNotification: (userId: number, notification: any) => void;
}
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertCarSchema, insertCarApplicationSchema } from "@shared/schema";
import { z } from "zod";

// Система модерации сообщений
interface ModerationResult {
  allowed: boolean;
  reason?: string;
  cleanContent: string;
}

function moderateMessage(content: string): ModerationResult {
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
      const carId = parseInt(req.query.carId as string);
      console.log(`🗑️ Пользователь ${req.user!.id} удаляет автомобиль ID: ${carId}`);
      
      // Проверяем, что автомобиль принадлежит пользователю
      const car = await storage.getCar(carId);
      if (!car) {
        return res.status(404).json({ message: "Автомобиль не найден" });
      }
      
      if (car.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "Вы можете удалять только свои автомобили" });
      }
      
      // Удаляем все сообщения связанные с этим автомобилем
      const allMessages = await storage.getAllMessages();
      const messagesToDelete = allMessages.filter((msg: any) => msg.carId === carId);
      
      for (const message of messagesToDelete) {
        await storage.deleteMessage(message.id);
        console.log(`📨 Удалено сообщение ID: ${message.id}`);
      }
      
      // Удаляем автомобиль
      const deleted = await storage.deleteCar(carId);
      if (!deleted) {
        return res.status(500).json({ message: "Ошибка при удалении автомобиля" });
      }
      
      console.log(`✅ Автомобиль "${car.name}" успешно удален пользователем ${req.user!.id}`);
      
      res.json({ 
        message: `Автомобиль "${car.name}" снят с продажи. Все связанные диалоги удалены.` 
      });
    } catch (error) {
      console.error("❌ Ошибка при снятии автомобиля с продажи:", error);
      res.status(500).json({ message: "Ошибка при снятии автомобиля с продажи" });
    }
  });

  // ФИНАЛЬНЫЙ ОБРАБОТЧИК УДАЛЕНИЯ - ОБХОД СИСТЕМНЫХ ОГРАНИЧЕНИЙ REPLIT
  app.delete("/api/my-car-removal/:id", requireAuth, async (req, res) => {
    console.log(`🎯🎯🎯 ФИНАЛЬНЫЙ DELETE ENDPOINT! Car ID: ${req.params.id}, User: ${req.user?.id || 'неавторизован'}`);
    console.log(`🎯🎯🎯 Полный URL: ${req.originalUrl}, метод: ${req.method}`);
    
    try {
      const carId = parseInt(req.params.id);
      console.log(`🗑️ Пользователь ${req.user!.id} удаляет автомобиль ID: ${carId}`);
      
      // Проверяем, что автомобиль принадлежит пользователю
      const car = await storage.getCar(carId);
      if (!car) {
        return res.status(404).json({ message: "Автомобиль не найден" });
      }
      
      if (car.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "Вы можете удалять только свои автомобили" });
      }
      
      // Удаляем все сообщения связанные с этим автомобилем
      const allMessages = await storage.getAllMessages();
      const messagesToDelete = allMessages.filter((msg: any) => msg.carId === carId);
      
      for (const message of messagesToDelete) {
        await storage.deleteMessage(message.id);
        console.log(`📨 Удалено сообщение ID: ${message.id}`);
      }
      
      // Удаляем автомобиль
      const deleted = await storage.deleteCar(carId);
      if (!deleted) {
        return res.status(500).json({ message: "Ошибка при удалении автомобиля" });
      }
      
      console.log(`✅ Автомобиль "${car.name}" успешно удален пользователем ${req.user!.id}`);
      
      res.json({ 
        message: `Автомобиль "${car.name}" снят с продажи. Все связанные диалоги удалены.` 
      });
    } catch (error) {
      console.error("❌ Ошибка при снятии автомобиля с продажи:", error);
      res.status(500).json({ message: "Ошибка при снятии автомобиля с продажи" });
    }
  });

  // ПРЯМОЙ ЭНДПОИНТ В ОБХОД VITE MIDDLEWARE
  app.post("/remove-car-direct", requireAuth, async (req, res) => {
    console.log("🔥 ПРЯМОЕ УДАЛЕНИЕ: Получен запрос на удаление автомобиля");
    console.log("🔥 Данные запроса:", req.body);
    console.log("🔥 Пользователь:", req.user);

    try {
      const { carId } = req.body;
      
      if (!carId) {
        console.log("❌ ПРЯМОЕ УДАЛЕНИЕ: ID автомобиля не указан");
        return res.status(400).json({ message: "ID автомобиля обязателен" });
      }

      const car = await storage.getCar(carId);
      if (!car) {
        console.log("❌ ПРЯМОЕ УДАЛЕНИЕ: Автомобиль не найден");
        return res.status(404).json({ message: "Автомобиль не найден" });
      }

      // Проверяем права: только владелец или админ может удалить
      if (car.createdBy !== req.user.id && req.user.role !== "admin") {
        console.log("❌ ПРЯМОЕ УДАЛЕНИЕ: Нет прав на удаление");
        return res.status(403).json({ message: "Нет прав на удаление этого автомобиля" });
      }

      // Удаляем все сообщения связанные с этим автомобилем
      const allMessages = await storage.getAllMessages();
      const messagesToDelete = allMessages.filter((msg: any) => msg.carId === carId);
      
      for (const message of messagesToDelete) {
        await storage.deleteMessage(message.id);
        console.log(`📨 Удалено сообщение ID: ${message.id}`);
      }

      const success = await storage.deleteCar(carId);
      if (success) {
        console.log(`✅ ПРЯМОЕ УДАЛЕНИЕ: Автомобиль "${car.name}" успешно удален пользователем ${req.user.id}`);
        res.json({ 
          success: true, 
          message: `Автомобиль "${car.name}" успешно удален`,
          carId: carId
        });
      } else {
        console.log("❌ ПРЯМОЕ УДАЛЕНИЕ: Не удалось удалить автомобиль из хранилища");
        res.status(500).json({ message: "Не удалось удалить автомобиль" });
      }
    } catch (error) {
      console.error("❌ ПРЯМОЕ УДАЛЕНИЕ: Ошибка при удалении автомобиля:", error);
      res.status(500).json({ message: "Внутренняя ошибка сервера" });
    }
  });

  // НОВЫЙ УНИКАЛЬНЫЙ ОБРАБОТЧИК - ПОЛНОЕ УДАЛЕНИЕ АВТОМОБИЛЯ
  app.post("/api/delete-my-car-completely", requireAuth, async (req, res) => {
    console.log(`🟢🟢🟢 УНИКАЛЬНЫЙ DELETE ENDPOINT СРАБОТАЛ! Car ID: ${req.body.carId}, User: ${req.user?.id || 'неавторизован'}`);
    console.log(`🟢🟢🟢 Полный URL: ${req.originalUrl}, метод: ${req.method}`);
    
    try {
      const carId = parseInt(req.body.carId);
      console.log(`🗑️ Пользователь ${req.user!.id} удаляет автомобиль ID: ${carId}`);
      
      // Проверяем, что автомобиль принадлежит пользователю
      const car = await storage.getCar(carId);
      if (!car) {
        return res.status(404).json({ message: "Автомобиль не найден" });
      }
      
      if (car.createdBy !== req.user!.id) {
        return res.status(403).json({ message: "Вы можете удалять только свои автомобили" });
      }
      
      // Удаляем все сообщения связанные с этим автомобилем
      const allMessages = await storage.getAllMessages();
      const messagesToDelete = allMessages.filter((msg: any) => msg.carId === carId);
      
      for (const message of messagesToDelete) {
        await storage.deleteMessage(message.id);
        console.log(`📨 Удалено сообщение ID: ${message.id}`);
      }
      
      // Удаляем автомобиль
      const deleted = await storage.deleteCar(carId);
      if (!deleted) {
        return res.status(500).json({ message: "Ошибка при удалении автомобиля" });
      }
      
      console.log(`✅ Автомобиль "${car.name}" успешно удален пользователем ${req.user!.id}`);
      
      res.json({ 
        message: `Автомобиль "${car.name}" снят с продажи. Все связанные диалоги удалены.` 
      });
    } catch (error) {
      console.error("❌ Ошибка при снятии автомобиля с продажи:", error);
      res.status(500).json({ message: "Ошибка при снятии автомобиля с продажи" });
    }
  });

  // САМЫЙ ПЕРВЫЙ ОБРАБОТЧИК - УДАЛЕНИЕ АВТОМОБИЛЕЙ (POST МЕТОД!)
  app.post("/api/cars/:id/remove", requireAuth, async (req, res) => {
    console.log(`🔥🔥🔥 POST DELETE ENDPOINT СРАБОТАЛ! ID: ${req.params.id}, User: ${req.user?.id || 'неавторизован'}`);
    console.log(`🔥🔥🔥 Полный URL: ${req.originalUrl}, метод: ${req.method}`);
    
    // Проверяем авторизацию вручную
    if (!req.user) {
      console.log(`❌ Пользователь не авторизован в DELETE endpoint`);
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    try {
      const id = parseInt(req.params.id);
      console.log(`🗑️ Пользователь ${req.user.id} удаляет автомобиль ID: ${id}`);
      
      // Проверяем, что автомобиль принадлежит пользователю
      const car = await storage.getCar(id);
      if (!car) {
        return res.status(404).json({ message: "Автомобиль не найден" });
      }
      
      if (car.createdBy !== req.user.id) {
        return res.status(403).json({ message: "Вы можете удалять только свои автомобили" });
      }
      
      // Удаляем все сообщения связанные с этим автомобилем
      const allMessages = await storage.getAllMessages();
      const messagesToDelete = allMessages.filter((msg: any) => msg.carId === id);
      
      for (const message of messagesToDelete) {
        await storage.deleteMessage(message.id);
        console.log(`📨 Удалено сообщение ID: ${message.id}`);
      }
      
      // Удаляем автомобиль
      const deleted = await storage.deleteCar(id);
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

  // КРИТИЧЕСКИ ВАЖНО: Специальный обработчик для предотвращения перехвата DELETE запросов
  app.use('/api/my-cars/:id', (req, res, next) => {
    if (req.method === 'DELETE') {
      console.log(`🛡️🛡️🛡️ ЗАЩИЩЕННЫЙ DELETE ОБРАБОТЧИК: ${req.method} ${req.url} от пользователя: ${req.user?.id || 'неавторизован'}`);
      // Устанавливаем флаг, что это API запрос
      req.isApiRequest = true;
    }
    next();
  });

  // GET роут для удаления автомобилей (УНИКАЛЬНЫЙ ПУТЬ!)
  app.get("/api/delete-car-action/:id", async (req, res) => {
    console.log(`🔥🔥🔥 GET DELETE ENDPOINT СРАБОТАЛ! ID: ${req.params.id}, User: ${req.user?.id || 'неавторизован'}`);
    console.log(`🔥🔥🔥 Полный URL: ${req.originalUrl}, метод: ${req.method}`);
    
    // Проверяем авторизацию вручную
    if (!req.user) {
      console.log(`❌ Пользователь не авторизован в DELETE endpoint`);
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    try {
      const id = parseInt(req.params.id);
      console.log(`🗑️ Пользователь ${req.user.id} удаляет автомобиль ID: ${id}`);
      
      // Проверяем, что автомобиль принадлежит пользователю
      const car = await storage.getCar(id);
      if (!car) {
        return res.status(404).json({ message: "Автомобиль не найден" });
      }
      
      if (car.createdBy !== req.user.id) {
        return res.status(403).json({ message: "Вы можете удалять только свои автомобили" });
      }
      
      // Удаляем все сообщения связанные с этим автомобилем
      const allMessages = await storage.getAllMessages();
      const messagesToDelete = allMessages.filter((msg: any) => msg.carId === id);
      
      for (const message of messagesToDelete) {
        await storage.deleteMessage(message.id);
        console.log(`📨 Удалено сообщение ID: ${message.id}`);
      }
      
      // Удаляем автомобиль
      const deleted = await storage.deleteCar(id);
      if (!deleted) {
        return res.status(500).json({ message: "Ошибка при удалении автомобиля" });
      }
      
      console.log(`✅ Автомобиль ${car.name} успешно удален`);
      res.json({ 
        message: `Автомобиль "${car.name}" снят с продажи. Все связанные диалоги удалены.`,
        success: true 
      });
    } catch (error) {
      console.error("❌ Ошибка в GET DELETE обработчике:", error);
      res.status(500).json({ message: "Ошибка при удалении автомобиля" });
    }
  });

  // Настройка аутентификации СНАЧАЛА
  setupAuth(app);
  
  // УНИВЕРСАЛЬНОЕ ЛОГИРОВАНИЕ ВСЕХ ЗАПРОСОВ
  app.use((req, res, next) => {
    if (req.method === 'DELETE') {
      console.log(`🚨🚨🚨 ЛЮБОЙ DELETE ЗАПРОС: ${req.method} ${req.url} от пользователя: ${req.user?.id || 'неавторизован'}`);
    }
    if (req.url.includes('/api/my-cars/')) {
      console.log(`🎯🎯🎯 ЗАПРОС К MY-CARS: ${req.method} ${req.url}`);
    }
    next();
  });
  




  // РОУТ МОДЕРАЦИИ СООБЩЕНИЙ - ДОБАВЛЕН В НАЧАЛО
  app.get("/api/messages/all", requireAuth, async (req, res) => {
    console.log("🚀 РОУТ /api/messages/all ВЫПОЛНЯЕТСЯ!");
    
    try {
      console.log(`🔍 GET /api/messages/all - Пользователь: ${req.user!.id} ${req.user!.username} (${req.user!.role})`);
      
      // Проверяем роль
      if (req.user!.role !== "moderator" && req.user!.role !== "admin") {
        console.log("❌ Недостаточно прав для модерации сообщений");
        return res.status(403).json({ error: "Недостаточно прав" });
      }
      
      console.log("🔍 Вызываем storage.getAllMessages()...");
      const messages = await storage.getAllMessages();
      console.log(`📊 Получено сообщений для модерации: ${messages.length}`);
      console.log(`📋 Содержимое сообщений:`, JSON.stringify(messages, null, 2));
      res.json(messages);
    } catch (error) {
      console.error("❌ Ошибка получения всех сообщений:", error);
      res.status(500).json({ error: "Ошибка получения сообщений" });
    }
  });

  // ТЕСТОВЫЙ РОУТ для диагностики
  app.get("/api/debug/messages", async (req, res) => {
    console.log("🔧 ТЕСТОВЫЙ РОУТ ВЫПОЛНЯЕТСЯ!");
    try {
      const messages = await storage.getAllMessages();
      console.log(`🔧 В базе найдено сообщений: ${messages.length}`);
      res.json({ 
        count: messages.length, 
        messages: messages,
        debug: "test route working"
      });
    } catch (error) {
      console.error("🔧 Ошибка в тестовом роуте:", error);
      res.status(500).json({ error: error });
    }
  });

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
      // Отключаем кеширование
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const cars = await storage.getCarsByUser(req.user!.id);
      console.log(`🔍 GET /api/my-cars - Пользователь: ${req.user!.id} ${req.user!.username}`);
      console.log(`📊 Количество найденных автомобилей: ${cars.length}`);
      console.log(`📊 Детали автомобилей:`, cars.map(car => ({ id: car.id, name: car.name, status: car.status })));
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



  // СПЕЦИАЛЬНЫЙ роут для снятия автомобиля с продажи (обход конфликтов маршрутизации)
  app.post("/api/remove-car", requireAuth, async (req, res) => {
    console.log(`🟡🟡🟡 SPECIAL REMOVE ENDPOINT! Car ID: ${req.body.carId}, User: ${req.user?.id}`);
    
    try {
      const id = parseInt(req.body.carId);
      console.log(`🚗 Пользователь ${req.user!.id} (${req.user!.username}) снимает с продажи автомобиль ID: ${id}`);
      
      // Проверяем, что автомобиль принадлежит пользователю
      const car = await storage.getCar(id);
      if (!car) {
        console.log("❌ Автомобиль не найден");
        return res.status(404).json({ message: "Автомобиль не найден" });
      }
      
      if (car.createdBy !== req.user!.id) {
        console.log("❌ Попытка удалить чужой автомобиль");
        return res.status(403).json({ message: "Вы можете удалять только свои автомобили" });
      }
      
      // Сначала удаляем все сообщения связанные с этим автомобилем
      console.log(`🗑️ Удаляем все сообщения для автомобиля ID: ${id}`);
      const allMessages = await storage.getAllMessages();
      const messagesToDelete = allMessages.filter((msg: any) => msg.carId === id);
      
      for (const message of messagesToDelete) {
        await storage.deleteMessage(message.id);
        console.log(`📨 Удалено сообщение ID: ${message.id}`);
      }
      
      // Удаляем сам автомобиль
      console.log(`🗑️ Начинаем удаление автомобиля ID: ${id}`);
      const deleted = await storage.deleteCar(id);
      console.log(`🔍 Результат удаления: ${deleted}`);
      
      if (!deleted) {
        console.log("❌ Ошибка при удалении автомобиля");
        return res.status(500).json({ message: "Ошибка при удалении автомобиля" });
      }
      
      // Проверяем, что автомобиль действительно удален
      const checkCar = await storage.getCar(id);
      console.log(`🔍 Проверка после удаления: автомобиль ${checkCar ? 'еще существует' : 'удален'}`);
      
      console.log(`✅ Автомобиль ${car.name} успешно снят с продажи`);
      res.status(200).json({ 
        message: `Автомобиль "${car.name}" снят с продажи. Все связанные диалоги удалены.` 
      });
    } catch (error) {
      console.error("❌ Ошибка при снятии автомобиля с продажи:", error);
      res.status(500).json({ message: "Ошибка при снятии автомобиля с продажи" });
    }
  });

  // Снятие автомобиля с продажи пользователем (ОРИГИНАЛЬНЫЙ DELETE - НЕ РАБОТАЕТ)
  app.delete("/api/my-cars/:id", requireAuth, async (req, res) => {
    console.log(`🔥🔥🔥 DELETE ENDPOINT ПОЛУЧЕН! ID: ${req.params.id}, User: ${req.user?.id}`);
    console.log(`🔥 DELETE ОБРАБОТЧИК НАЧАЛ РАБОТУ!`);
    
    try {
      const id = parseInt(req.params.id);
      console.log(`🚗 Пользователь ${req.user!.id} (${req.user!.username}) снимает с продажи автомобиль ID: ${id}`);
      
      // Проверяем, что автомобиль принадлежит пользователю
      const car = await storage.getCar(id);
      if (!car) {
        console.log("❌ Автомобиль не найден");
        return res.status(404).json({ message: "Автомобиль не найден" });
      }
      
      if (car.createdBy !== req.user!.id) {
        console.log("❌ Попытка удалить чужой автомобиль");
        return res.status(403).json({ message: "Вы можете удалять только свои автомобили" });
      }
      
      // Сначала удаляем все сообщения связанные с этим автомобилем
      console.log(`🗑️ Удаляем все сообщения для автомобиля ID: ${id}`);
      const allMessages = await storage.getAllMessages();
      const messagesToDelete = allMessages.filter((msg: any) => msg.carId === id);
      
      for (const message of messagesToDelete) {
        await storage.deleteMessage(message.id);
        console.log(`📨 Удалено сообщение ID: ${message.id}`);
      }
      
      // Удаляем автомобиль из избранного у всех пользователей
      console.log(`❤️ Удаляем автомобиль из избранного всех пользователей`);
      // Это будет обработано автоматически при удалении автомобиля в хранилище
      
      // Удаляем сам автомобиль
      console.log(`🗑️ Начинаем удаление автомобиля ID: ${id}`);
      const deleted = await storage.deleteCar(id);
      console.log(`🔍 Результат удаления: ${deleted}`);
      
      if (!deleted) {
        console.log("❌ Ошибка при удалении автомобиля");
        return res.status(500).json({ message: "Ошибка при удалении автомобиля" });
      }
      
      // Проверяем, что автомобиль действительно удален
      const checkCar = await storage.getCar(id);
      console.log(`🔍 Проверка после удаления: автомобиль ${checkCar ? 'еще существует' : 'удален'}`);
      
      console.log(`✅ Автомобиль ${car.name} успешно снят с продажи`);
      res.status(200).json({ 
        message: `Автомобиль "${car.name}" снят с продажи. Все связанные диалоги удалены.` 
      });
    } catch (error) {
      console.error("❌ Ошибка при снятии автомобиля с продажи:", error);
      res.status(500).json({ message: "Ошибка при снятии автомобиля с продажи" });
    }
  });

  app.delete("/api/cars/:id", requireRole(["moderator", "admin"]), async (req, res) => {
    console.log(`🔴🔴🔴 ADMIN DELETE ENDPOINT ПОЛУЧЕН! ID: ${req.params.id}, User: ${req.user?.id}`);
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
    console.log("🔍 GET /api/messages - Пользователь:", req.user?.id, req.user?.username);
    
    if (!req.user) {
      console.log("❌ Пользователь не авторизован");
      return res.status(401).json({ message: "Требуется авторизация" });
    }
    
    try {
      const messages = await storage.getMessagesByUser(req.user.id);
      console.log("✅ Получено сообщений:", messages.length);
      res.json(messages);
    } catch (error: any) {
      console.error("❌ Ошибка при получении сообщений, возвращаем пустой массив:", error.message);
      // Возвращаем пустой массив вместо ошибки для предотвращения белых полос
      res.json([]);
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
      
      // Модерация сообщений
      const moderationResult = moderateMessage(message.trim());
      if (!moderationResult.allowed) {
        console.log("🚫 Сообщение заблокировано:", moderationResult.reason);
        return res.status(400).json({ 
          message: `Сообщение заблокировано: ${moderationResult.reason}`,
          blocked: true 
        });
      }
      
      console.log("✅ Отправка сообщения от", req.user!.id, "к", sellerIdNum);
      
      const newMessage = await storage.sendMessage({
        carId: carIdNum,
        buyerId: req.user!.id,
        sellerId: sellerIdNum,
        senderId: req.user!.id,
        recipientId: sellerIdNum,
        content: moderationResult.cleanContent,
      });
      
      console.log("✅ Сообщение отправлено:", newMessage.id);
      
      // Отправляем push-уведомление получателю в реальном времени
      if (global.sendNotification) {
        const senderName = req.user!.username;
        global.sendNotification(sellerIdNum, {
          type: "new_message",
          data: {
            carId: carIdNum,
            carName: car.name,
            senderName: senderName,
            message: message.trim(),
          }
        });
        console.log("📨 Push-уведомление отправлено пользователю:", sellerIdNum);
      }
      
      res.status(201).json(newMessage);
    } catch (error) {
      console.error("❌ Ошибка при отправке сообщения:", error);
      res.status(500).json({ message: "Ошибка при отправке сообщения" });
    }
  });



  app.get("/api/messages", requireAuth, async (req, res) => {
    console.log("🎯 Обработка запроса /api/messages для пользователя:", req.user!.id);
    
    // Отключаем кэширование заранее
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    try {
      let messages;
      
      // Если это модератор или админ, возвращаем ВСЕ сообщения
      if (req.user!.role === "moderator" || req.user!.role === "admin") {
        console.log("👮 Модератор/Админ запрашивает все сообщения");
        messages = await storage.getAllMessages();
        console.log("📨 Получено всех сообщений для модерации:", messages.length);
      } else {
        // Для обычных пользователей - только их сообщения
        console.log("👤 Обычный пользователь запрашивает свои сообщения");
        messages = await storage.getMessagesByUser(req.user!.id);
        console.log("📨 Получено сообщений пользователя:", messages.length);
      }
      
      // Обогащаем сообщения информацией о пользователях и автомобилях
      const enrichedMessages = [];
      for (const message of messages) {
        const car = await storage.getCar(message.carId);
        const buyer = await storage.getUser(message.buyerId);
        const seller = await storage.getUser(message.sellerId);
        
        enrichedMessages.push({
          ...message,
          carName: car?.name || null,
          buyerName: buyer?.username || null,
          sellerName: seller?.username || null,
        });
      }
      
      console.log("📤 Отправляем обогащенные сообщения:", enrichedMessages.length);
      res.json(enrichedMessages);
    } catch (error) {
      console.error("Ошибка при получении сообщений:", error);
      // Возвращаем пустой массив вместо ошибки для стабильности
      res.json([]);
    }
  });

  app.get("/api/messages/unread-count", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const count = await storage.getUnreadMessagesCount(userId);
      console.log(`📊 Счетчик непрочитанных сообщений для пользователя ${userId}: ${count}`);
      
      // Отключаем кеширование для точного счетчика
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Expires', '0');
      res.set('Pragma', 'no-cache');
      
      res.json({ count });
    } catch (error) {
      console.error("❌ Ошибка при получении счетчика:", error);
      res.status(500).json({ message: "Ошибка при получении счетчика" });
    }
  });

  // Удаление сообщения (только для модераторов и админов)
  app.post("/api/admin/remove-message", requireAuth, requireRole(["moderator", "admin"]), async (req, res) => {
    console.log(`🚀🚀🚀 ADMIN DELETE MESSAGE ЗАПРОС ПОЛУЧЕН! 🚀🚀🚀`);
    console.log(`📝 Body:`, req.body);
    console.log(`👤 Пользователь:`, req.user?.id, req.user?.username, req.user?.role);
    
    try {
      const messageId = parseInt(req.body.messageId);
      console.log(`🗑️ DELETE message ${messageId} - Модератор: ${req.user!.id} ${req.user!.username}`);
      
      // Проверяем, существует ли сообщение ДО удаления
      const messagesBefore = await storage.getAllMessages();
      console.log(`📊 Сообщений ДО удаления: ${messagesBefore.length}`);
      const targetMessage = messagesBefore.find(m => m.id === messageId);
      console.log(`🎯 Целевое сообщение:`, targetMessage);
      
      const success = await storage.deleteMessage(messageId);
      console.log(`✅ Результат удаления:`, success);
      
      // Проверяем количество сообщений ПОСЛЕ удаления
      const messagesAfter = await storage.getAllMessages();
      console.log(`📊 Сообщений ПОСЛЕ удаления: ${messagesAfter.length}`);
      
      if (success) {
        console.log(`✅ Сообщение ${messageId} успешно удалено`);
        res.json({ success: true });
      } else {
        console.log(`❌ Сообщение ${messageId} не найдено`);
        res.status(404).json({ error: "Сообщение не найдено" });
      }
    } catch (error) {
      console.error("❌ Ошибка удаления сообщения:", error);
      res.status(500).json({ error: "Ошибка удаления сообщения" });
    }
  });

  // Удаление автомобиля через POST (обход блокировки)
  app.post("/delete-car-endpoint", (req, res, next) => {
    console.log("🔥 УДАЛЕНИЕ АВТОМОБИЛЯ - НАЧАЛО ОБРАБОТКИ");
    console.log("📥 Тело запроса:", req.body);
    console.log("👤 Аутентификация:", req.isAuthenticated?.(), req.user?.id);
    next();
  }, requireAuth, async (req, res) => {
    console.log("🚗 POST /api/cars/delete - Удаление автомобиля");
    console.log("📥 Тело запроса:", req.body);
    console.log("👤 Пользователь:", req.user?.id, req.user?.username);
    
    try {
      const { carId } = req.body;
      const userId = req.user!.id;
      
      if (!carId) {
        console.log("❌ Отсутствует carId");
        return res.status(400).json({ error: "Отсутствует ID автомобиля" });
      }
      
      // Проверяем, что автомобиль принадлежит пользователю
      const car = await storage.getCar(carId);
      if (!car) {
        console.log("❌ Автомобиль не найден");
        return res.status(404).json({ error: "Автомобиль не найден" });
      }
      
      if (car.createdBy !== userId) {
        console.log("❌ Пользователь не владелец автомобиля");
        return res.status(403).json({ error: "Вы можете удалять только свои автомобили" });
      }
      
      // Удаляем все сообщения связанные с этим автомобилем
      const allMessages = await storage.getAllMessages();
      const messagesToDelete = allMessages.filter((msg: any) => msg.carId === carId);
      
      for (const msgToDelete of messagesToDelete) {
        await storage.deleteMessage(msgToDelete.id);
        console.log(`📨 Удалено сообщение ID: ${msgToDelete.id}`);
      }
      
      // Удаляем автомобиль
      const deleted = await storage.deleteCar(carId);
      if (!deleted) {
        console.log("❌ Ошибка при удалении автомобиля");
        return res.status(500).json({ error: "Ошибка при удалении автомобиля" });
      }
      
      console.log(`✅ Автомобиль "${car.name}" успешно удален пользователем ${userId}`);
      
      res.json({
        success: true,
        message: `Автомобиль "${car.name}" снят с продажи. Все связанные диалоги удалены.`
      });
      
    } catch (error) {
      console.error("❌ Ошибка при удалении автомобиля:", error);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  // Отметка сообщений как прочитанных
  app.post("/api/messages/mark-read", requireAuth, async (req, res) => {
    console.log("🚀 POST /api/messages/mark-read - Начало обработки");
    console.log("📥 Тело запроса:", req.body);
    console.log("👤 Пользователь:", req.user?.id, req.user?.username);
    
    try {
      const { carId, buyerId, sellerId } = req.body;
      const userId = req.user!.id;
      
      console.log("🔍 Отметка сообщений как прочитанных:", { carId, buyerId, sellerId, userId });
      
      if (!carId || !buyerId || !sellerId) {
        console.log("❌ Отсутствуют обязательные параметры");
        return res.status(400).json({ error: "Отсутствуют обязательные параметры" });
      }
      
      const markedCount = await storage.markConversationAsRead(carId, buyerId, sellerId, userId);
      res.json({ success: true, markedCount });
    } catch (error) {
      console.error("❌ Ошибка отметки сообщений как прочитанных:", error);
      res.status(500).json({ error: "Ошибка сервера", details: error.message });
    }
  });

  const httpServer = createServer(app);

  // Настраиваем WebSocket сервер для push-уведомлений
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Храним активные WebSocket соединения пользователей
  const userConnections = new Map<number, WebSocket>();
  
  // Храним статус пользователей (онлайн/оффлайн)
  const userStatus = new Map<number, { isOnline: boolean; lastSeen: Date }>();

  // Функция для рассылки статуса пользователя всем подключенным клиентам
  function broadcastUserStatus(userId: number, isOnline: boolean) {
    const statusUpdate = {
      type: 'user_status_update',
      data: {
        userId,
        isOnline,
        lastSeen: userStatus.get(userId)?.lastSeen || new Date()
      }
    };

    userConnections.forEach((connection, connectedUserId) => {
      if (connection.readyState === WebSocket.OPEN) {
        try {
          connection.send(JSON.stringify(statusUpdate));
        } catch (error) {
          console.error('Ошибка отправки статуса пользователя:', error);
        }
      }
    });
  }

  wss.on('connection', (ws) => {
    console.log('📡 Новое WebSocket соединение');
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`🔍 WebSocket получил сообщение:`, message);
        
        if (message.type === 'authenticate' && message.userId) {
          // Регистрируем пользователя
          userConnections.set(message.userId, ws);
          userStatus.set(message.userId, { isOnline: true, lastSeen: new Date() });
          console.log(`👤 Пользователь ${message.userId} подключен к WebSocket`);
          
          // Уведомляем других пользователей об изменении статуса
          broadcastUserStatus(message.userId, true);
        } else if (message.type === 'DELETE_CAR') {
          console.log(`🚗🚗🚗 WebSocket УДАЛЕНИЕ АВТОМОБИЛЯ! Car ID: ${message.carId}`);
          
          try {
            // Найдем пользователя по WebSocket соединению
            let userId = null;
            userConnections.forEach((connection, id) => {
              if (connection === ws) {
                userId = id;
              }
            });
            
            if (!userId) {
              console.log("❌ Пользователь не найден в WebSocket соединениях");
              ws.send(JSON.stringify({
                type: "DELETE_CAR_ERROR",
                message: "Пользователь не авторизован"
              }));
              return;
            }
            
            console.log(`🗑️ Пользователь ${userId} удаляет автомобиль ID: ${message.carId} через WebSocket`);
            
            // Проверяем, что автомобиль принадлежит пользователю
            const car = await storage.getCar(message.carId);
            if (!car) {
              ws.send(JSON.stringify({
                type: "DELETE_CAR_ERROR",
                message: "Автомобиль не найден"
              }));
              return;
            }
            
            if (car.createdBy !== userId) {
              ws.send(JSON.stringify({
                type: "DELETE_CAR_ERROR",
                message: "Вы можете удалять только свои автомобили"
              }));
              return;
            }
            
            // Удаляем все сообщения связанные с этим автомобилем
            const allMessages = await storage.getAllMessages();
            const messagesToDelete = allMessages.filter((msg: any) => msg.carId === message.carId);
            
            for (const msgToDelete of messagesToDelete) {
              await storage.deleteMessage(msgToDelete.id);
              console.log(`📨 Удалено сообщение ID: ${msgToDelete.id}`);
            }
            
            // Удаляем автомобиль
            const deleted = await storage.deleteCar(message.carId);
            if (!deleted) {
              ws.send(JSON.stringify({
                type: "DELETE_CAR_ERROR",
                message: "Ошибка при удалении автомобиля"
              }));
              return;
            }
            
            console.log(`✅ Автомобиль "${car.name}" успешно удален пользователем ${userId} через WebSocket`);
            
            // Отправляем успешный ответ
            ws.send(JSON.stringify({
              type: "DELETE_CAR_SUCCESS",
              message: `Автомобиль "${car.name}" снят с продажи. Все связанные диалоги удалены.`
            }));
            
          } catch (error) {
            console.error("❌ Ошибка при удалении автомобиля через WebSocket:", error);
            ws.send(JSON.stringify({
              type: "DELETE_CAR_ERROR",
              message: "Ошибка при удалении автомобиля"
            }));
          }
        }
      } catch (error) {
        console.error('Ошибка обработки WebSocket сообщения:', error);
      }
    });

    ws.on('close', () => {
      // Удаляем соединение при отключении
      userConnections.forEach((connection, userId) => {
        if (connection === ws) {
          userConnections.delete(userId);
          userStatus.set(userId, { isOnline: false, lastSeen: new Date() });
          console.log(`👤 Пользователь ${userId} отключен от WebSocket`);
          
          // Уведомляем других пользователей об изменении статуса
          broadcastUserStatus(userId, false);
        }
      });
    });

    ws.on('error', (error) => {
      console.error('WebSocket ошибка:', error);
    });
  });

  // API endpoint для получения статуса пользователей
  app.get("/api/users/status", requireAuth, async (req, res) => {
    try {
      const statusData: { [key: number]: { isOnline: boolean; lastSeen: Date } } = {};
      
      userStatus.forEach((status, userId) => {
        statusData[userId] = status;
      });
      
      res.json(statusData);
    } catch (error) {
      console.error("Ошибка при получении статуса пользователей:", error);
      res.status(500).json({ message: "Ошибка при получении статуса пользователей" });
    }
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
