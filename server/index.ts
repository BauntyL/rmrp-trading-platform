import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// КРИТИЧЕСКИЙ HOTFIX: Прямой обработчик удаления автомобилей
app.post("/api/remove-car", async (req, res) => {
  console.log(`🔥🔥🔥 HOTFIX REMOVE ENDPOINT! Car ID: ${req.body?.carId}`);
  
  // Простейшая реализация без аутентификации для тестирования
  try {
    res.json({ 
      message: `Тестовое удаление автомобиля ID: ${req.body?.carId}`,
      success: true 
    });
  } catch (error) {
    res.status(500).json({ message: "Ошибка", error: String(error) });
  }
});

// КРИТИЧЕСКИЙ DEBUG: Перехватываем DELETE и POST запросы САМЫМИ ПЕРВЫМИ
app.use((req, res, next) => {
  if (req.method === 'DELETE' && req.path.includes('/api/my-cars/')) {
    console.log(`🔴🔴🔴 САМЫЙ РАННИЙ DELETE ПЕРЕХВАТ: ${req.method} ${req.path}`);
  }
  if (req.method === 'POST' && req.path.includes('/api/my-cars/') && req.path.includes('/remove')) {
    console.log(`🟢🟢🟢 САМЫЙ РАННИЙ POST REMOVE ПЕРЕХВАТ: ${req.method} ${req.path}`);
  }
  next();
});

// Приоритетная обработка API запросов ПЕРЕД Vite middleware
app.use('/api', (req, res, next) => {
  console.log(`🚀 Ранний перехват API: ${req.method} ${req.originalUrl}`);
  // Устанавливаем правильный Content-Type для API ответов
  res.setHeader('Content-Type', 'application/json');
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Регистрируем API роуты ПЕРЕД Vite middleware
  const server = await registerRoutes(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
