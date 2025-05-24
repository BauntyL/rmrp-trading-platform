import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { z } from "zod";

// Система отслеживания попыток входа
interface LoginAttempt {
  ip: string;
  username: string;
  timestamp: number;
  success: boolean;
}

class SecurityManager {
  private loginAttempts: Map<string, LoginAttempt[]> = new Map();
  private blockedIPs: Map<string, number> = new Map();
  private readonly MAX_ATTEMPTS = 5;
  private readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 минут
  private readonly ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 минут

  private getKey(ip: string, username: string): string {
    return `${ip}:${username}`;
  }

  recordAttempt(ip: string, username: string, success: boolean): void {
    const key = this.getKey(ip, username);
    const now = Date.now();
    
    if (!this.loginAttempts.has(key)) {
      this.loginAttempts.set(key, []);
    }
    
    const attempts = this.loginAttempts.get(key)!;
    
    // Удаляем старые попытки (старше 5 минут)
    const recentAttempts = attempts.filter(attempt => 
      now - attempt.timestamp < this.ATTEMPT_WINDOW
    );
    
    recentAttempts.push({
      ip,
      username,
      timestamp: now,
      success
    });
    
    this.loginAttempts.set(key, recentAttempts);
    
    // Блокируем IP если слишком много неудачных попыток
    if (!success) {
      const failedAttempts = recentAttempts.filter(a => !a.success).length;
      if (failedAttempts >= this.MAX_ATTEMPTS) {
        this.blockedIPs.set(ip, now + this.BLOCK_DURATION);
        console.log(`🔒 Заблокирован IP ${ip} на 15 минут (${failedAttempts} неудачных попыток для ${username})`);
      }
    }
  }

  isBlocked(ip: string): boolean {
    const blockUntil = this.blockedIPs.get(ip);
    if (!blockUntil) return false;
    
    if (Date.now() > blockUntil) {
      this.blockedIPs.delete(ip);
      return false;
    }
    
    return true;
  }

  getAttemptsCount(ip: string, username: string): number {
    const key = this.getKey(ip, username);
    const attempts = this.loginAttempts.get(key) || [];
    const now = Date.now();
    
    return attempts.filter(attempt => 
      now - attempt.timestamp < this.ATTEMPT_WINDOW && !attempt.success
    ).length;
  }
}

const securityManager = new SecurityManager();

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Улучшенная валидация паролей
const passwordSchema = z.string()
  .min(8, "Пароль должен содержать минимум 8 символов")
  .regex(/[A-Z]/, "Пароль должен содержать хотя бы одну заглавную букву")
  .regex(/[a-z]/, "Пароль должен содержать хотя бы одну строчную букву")
  .regex(/[0-9]/, "Пароль должен содержать хотя бы одну цифру")
  .regex(/[^A-Za-z0-9]/, "Пароль должен содержать хотя бы один специальный символ");

const registerSchema = z.object({
  username: z.string()
    .min(3, "Имя пользователя должно содержать минимум 3 символа")
    .max(50, "Имя пользователя не должно превышать 50 символов")
    .regex(/^[a-zA-Zа-яА-Я]+ [a-zA-Zа-яА-Я]+$/, "Используйте строго формат: Имя Фамилия (только буквы и один пробел)"),
  password: passwordSchema,
});

const loginSchema = z.object({
  username: z.string().min(1, "Введите имя пользователя"),
  password: z.string().min(1, "Введите пароль"),
});

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "fallback-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 2 * 60 * 60 * 1000, // 2 часа (уменьшено для безопасности)
      sameSite: "strict"
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          // Пользователь не найден (возможно, удален)
          return done(null, false, { message: "user_not_found" });
        }
        if (!(await bcrypt.compare(password, user.password))) {
          // Неверный пароль
          return done(null, false, { message: "wrong_password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      // Если пользователь был удален, завершаем сессию без ошибки
      if (!user) {
        return done(null, null);
      }
      done(null, user);
    } catch (error) {
      // Логируем ошибку, но не передаем ее дальше
      console.log('Ошибка при получении пользователя из сессии:', error);
      done(null, null);
    }
  });

  // Middleware для проверки блокировки IP
  const checkIPBlock = (req: any, res: any, next: any) => {
    const clientIP = req.ip || req.connection.remoteAddress || '127.0.0.1';
    
    if (securityManager.isBlocked(clientIP)) {
      console.log(`🚫 Заблокированный IP ${clientIP} пытается войти`);
      return res.status(429).json({ 
        message: "Слишком много неудачных попыток входа. Попробуйте через 15 минут.",
        blocked: true
      });
    }
    
    next();
  };

  app.post("/api/register", checkIPBlock, async (req, res, next) => {
    try {
      const clientIP = req.ip || req.connection.remoteAddress || '127.0.0.1';
      
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        const firstError = validation.error.errors[0];
        return res.status(400).json({ 
          message: firstError.message,
          field: firstError.path[0]
        });
      }

      const { username, password } = validation.data;
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Пользователь с таким именем уже существует" });
      }

      // Увеличиваем сложность хеширования для новых аккаунтов
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role: "user",
      });

      console.log(`✅ Новый пользователь зарегистрирован: ${username} (IP: ${clientIP})`);

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ 
          id: user.id, 
          username: user.username, 
          role: user.role,
          createdAt: user.createdAt,
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", checkIPBlock, async (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || '127.0.0.1';
    
    // Валидация данных входа
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: "Введите имя пользователя и пароль" });
    }
    
    const { username } = validation.data;
    const attemptsCount = securityManager.getAttemptsCount(clientIP, username);
    
    passport.authenticate("local", (err: any, user: SelectUser | false, info?: any) => {
      if (err) {
        console.log(`❌ Ошибка аутентификации для ${username} (IP: ${clientIP}):`, err);
        return next(err);
      }
      
      if (!user) {
        // Записываем неудачную попытку
        securityManager.recordAttempt(clientIP, username, false);
        const newAttemptsCount = securityManager.getAttemptsCount(clientIP, username);
        
        console.log(`🔑 Неудачная попытка входа: ${username} (IP: ${clientIP}, попыток: ${newAttemptsCount})`);
        
        const remainingAttempts = Math.max(0, 5 - newAttemptsCount);
        let message: string;
        
        // Определяем тип ошибки на основе info от passport
        if (info?.message === "user_not_found") {
          message = "Аккаунт с таким именем не существует или был удален. Для доступа необходимо зарегистрироваться заново.";
        } else {
          message = "Неверное имя пользователя или пароль";
          
          if (remainingAttempts <= 2 && remainingAttempts > 0) {
            message += `. Осталось попыток: ${remainingAttempts}`;
          } else if (remainingAttempts === 0) {
            message = "Слишком много неудачных попыток. IP заблокирован на 15 минут.";
          }
        }
        
        return res.status(401).json({ message, attemptsLeft: remainingAttempts });
      }
      
      // Успешный вход
      securityManager.recordAttempt(clientIP, username, true);
      console.log(`✅ Успешный вход: ${username} (IP: ${clientIP})`);
      
      req.login(user, (err) => {
        if (err) return next(err);
        res.json({ 
          id: user.id, 
          username: user.username, 
          role: user.role,
          createdAt: user.createdAt,
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.sendStatus(401);
    }
    
    // Дополнительная проверка - существует ли пользователь в базе
    storage.getUser(req.user.id).then(user => {
      if (!user) {
        // Пользователь был удален, завершаем сессию
        req.logout((err) => {
          if (err) console.error('Ошибка при завершении сессии удаленного пользователя:', err);
        });
        return res.sendStatus(401);
      }
      
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      });
    }).catch(error => {
      console.error('Ошибка при проверке пользователя:', error);
      res.sendStatus(401);
    });
  });
}
