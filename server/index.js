import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { storage } from "./storage.js";
import path from "path";

const app = express();

console.log("🚀 Starting server...");
console.log("PORT:", process.env.PORT || 3000);
console.log("NODE_ENV:", process.env.NODE_ENV);

console.log("📦 Trying to import express...");
console.log("📦 Trying to import other modules...");
console.log("📦 Trying to import storage...");
console.log("✅ Storage imported successfully");

console.log("🔧 Setting up middleware...");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Логирование всех запросов
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - Content-Type: ${req.headers['content-type']} - Session: ${req.sessionID?.substring(0, 8)}...`);
  next();
});

// Session configuration
app.use(session({
  secret: 'trading-platform-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax'
  },
  store: storage.sessionStore,
}));

app.use(passport.initialize());
app.use(passport.session());

console.log("🔧 Setting up passport strategy...");

// Passport strategy
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      console.log(`🔑 Trying to authenticate user: ${username}`);
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        console.log(`❌ User not found: ${username}`);
        return done(null, false, { message: 'Неверное имя пользователя или пароль' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        console.log(`❌ Invalid password for user: ${username}`);
        return done(null, false, { message: 'Неверное имя пользователя или пароль' });
      }

      console.log(`✅ User authenticated successfully: ${username}`);
      return done(null, user);
    } catch (error) {
      console.error('❌ Authentication error:', error);
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  console.log(`🔧 Serializing user: ${user.username} (ID: ${user.id})`);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log(`🔧 Deserializing user ID: ${id}`);
    const user = await storage.getUser(id);
    if (user) {
      console.log(`✅ User deserialized: ${user.username}`);
    } else {
      console.log(`❌ User not found during deserialization: ${id}`);
    }
    done(null, user);
  } catch (error) {
    console.error('❌ Deserialization error:', error);
    done(error);
  }
});

console.log("🔧 Setting up API routes...");

// Login route (фронтенд использует /api/login)
app.post('/api/login', (req, res, next) => {
  console.log(`📝 Login attempt via /api/login for: ${req.body.username}`);
  
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('❌ Login error:', err);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
    
    if (!user) {
      console.log(`❌ Login failed: ${info?.message || 'Authentication failed'}`);
      return res.status(401).json({ error: info?.message || 'Неверные данные для входа' });
    }

    req.logIn(user, (err) => {
      if (err) {
        console.error('❌ Session creation error:', err);
        return res.status(500).json({ error: 'Ошибка создания сессии' });
      }
      
      console.log(`✅ Login successful via /api/login: ${user.username}`);
      console.log(`🍪 Session created: ${req.sessionID}`);
      console.log(`🍪 User in session:`, req.user ? req.user.username : 'none');
      
      const { password, ...userWithoutPassword } = user;
      console.log(`📤 Sending user data to frontend:`, JSON.stringify(userWithoutPassword));
      
      // Отправляем пользователя в том же формате, что ожидает фронтенд
      res.json(userWithoutPassword);
    });
  })(req, res, next);
});

// Register route (фронтенд использует /api/register)
app.post('/api/register', async (req, res) => {
  console.log(`📝 Registration attempt for: ${req.body.username}`);
  
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log(`❌ Registration failed: missing username or password`);
      return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
    }

    // Проверяем, существует ли уже пользователь
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      console.log(`❌ Registration failed: user already exists: ${username}`);
      return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Создаем пользователя
    const user = await storage.createUser({
      username,
      password: hashedPassword,
      role: 'user'
    });

    console.log(`✅ User registered successfully: ${user.username} with ID: ${user.id}`);
    
    // Автоматически авторизуем пользователя после регистрации
    req.logIn(user, (err) => {
      if (err) {
        console.error('❌ Auto-login error after registration:', err);
        return res.status(500).json({ error: 'Пользователь создан, но ошибка автоматического входа' });
      }
      
      console.log(`✅ Auto-login successful after registration: ${user.username}`);
      console.log(`🍪 Session created after registration: ${req.sessionID}`);
      console.log(`🍪 User in session:`, req.user ? req.user.username : 'none');
      
      const { password, ...userWithoutPassword } = user;
      console.log(`📤 Sending registered user data to frontend:`, JSON.stringify(userWithoutPassword));
      res.status(201).json(userWithoutPassword);
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Ошибка регистрации пользователя' });
  }
});

// User routes - добавляем несколько вариантов для разных эндпоинтов
app.get('/api/user', (req, res) => {
  console.log(`📝 GET /api/user - Session: ${req.sessionID?.substring(0, 8)}...`);
  console.log(`📝 User in request: ${req.user?.username || 'not authenticated'}`);
  console.log(`📝 Session user ID: ${req.session?.passport?.user || 'none'}`);
  
  if (req.user) {
    const { password, ...userWithoutPassword } = req.user;
    console.log(`✅ User data sent via /api/user: ${userWithoutPassword.username}`);
    console.log(`📤 User object:`, JSON.stringify(userWithoutPassword));
    res.json(userWithoutPassword);
  } else {
    console.log(`❌ User not authenticated`);
    res.status(401).json({ error: 'Не авторизован' });
  }
});

app.get('/api/auth/me', (req, res) => {
  console.log(`📝 GET /api/auth/me - Session: ${req.sessionID?.substring(0, 8)}...`);
  console.log(`📝 User in request: ${req.user?.username || 'not authenticated'}`);
  
  if (req.user) {
    const { password, ...userWithoutPassword } = req.user;
    console.log(`✅ User data sent via /api/auth/me: ${userWithoutPassword.username}`);
    console.log(`📤 User object:`, JSON.stringify(userWithoutPassword));
    res.json({ user: userWithoutPassword });
  } else {
    console.log(`❌ User not authenticated`);
    res.status(401).json({ error: 'Не авторизован' });
  }
});

app.get('/api/me', (req, res) => {
  console.log(`📝 GET /api/me - Session: ${req.sessionID?.substring(0, 8)}...`);
  console.log(`📝 User in request: ${req.user?.username || 'not authenticated'}`);
  
  if (req.user) {
    const { password, ...userWithoutPassword } = req.user;
    console.log(`✅ User data sent via /api/me: ${userWithoutPassword.username}`);
    console.log(`📤 User object:`, JSON.stringify(userWithoutPassword));
    res.json(userWithoutPassword);
  } else {
    console.log(`❌ User not authenticated`);
    res.status(401).json({ error: 'Не авторизован' });
  }
});

// Logout route
app.post('/api/logout', (req, res) => {
  console.log(`📝 Logout attempt for user: ${req.user?.username || 'unknown'}`);
  
  req.logout((err) => {
    if (err) {
      console.error('❌ Logout error:', err);
      return res.status(500).json({ error: 'Ошибка выхода' });
    }
    
    req.session.destroy((err) => {
      if (err) {
        console.error('❌ Session destroy error:', err);
        return res.status(500).json({ error: 'Ошибка уничтожения сессии' });
      }
      
      console.log(`✅ Logout successful and session destroyed`);
      res.json({ message: 'Выход выполнен успешно' });
    });
  });
});

// Cars routes
app.get('/api/cars', async (req, res) => {
  try {
    console.log(`📝 GET /api/cars - User: ${req.user?.username || 'anonymous'} - Fetching all cars`);
    const cars = await storage.getAllCars();
    console.log(`📋 Found ${cars.length} cars`);
    console.log(`📤 Cars data:`, cars.map(car => `${car.id}: ${car.name}`));
    res.json(cars);
  } catch (error) {
    console.error('❌ Error fetching cars:', error);
    res.status(500).json({ error: 'Ошибка получения автомобилей' });
  }
});

app.get('/api/cars/search', async (req, res) => {
  try {
    const { query, category, server } = req.query;
    console.log(`📝 GET /api/cars/search - Query: ${query}, Category: ${category}, Server: ${server}`);
    
    const cars = await storage.searchCars(query, category, server);
    console.log(`📋 Search found ${cars.length} cars`);
    res.json(cars);
  } catch (error) {
    console.error('❌ Error searching cars:', error);
    res.status(500).json({ error: 'Ошибка поиска автомобилей' });
  }
});

app.get('/api/cars/my', async (req, res) => {
  console.log(`📝 GET /api/cars/my - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for /api/cars/my`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    const cars = await storage.getCarsByUser(req.user.id);
    console.log(`📋 User ${req.user.username} has ${cars.length} cars`);
    res.json(cars);
  } catch (error) {
    console.error('❌ Error fetching user cars:', error);
    res.status(500).json({ error: 'Ошибка получения автомобилей пользователя' });
  }
});

app.get('/api/cars/:id', async (req, res) => {
  try {
    const carId = parseInt(req.params.id);
    console.log(`📝 GET /api/cars/${carId} - Fetching car details`);
    
    const car = await storage.getCar(carId);
    if (!car) {
      console.log(`❌ Car not found: ${carId}`);
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }
    
    console.log(`✅ Found car: ${car.name}`);
    res.json(car);
  } catch (error) {
    console.error('❌ Error fetching car:', error);
    res.status(500).json({ error: 'Ошибка получения автомобиля' });
  }
});

app.post('/api/cars', async (req, res) => {
  console.log(`📝 POST /api/cars - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for car creation`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    const carData = {
      ...req.body,
      createdBy: req.user.id,
    };
    
    console.log(`📝 Creating car: ${carData.name}`);
    const car = await storage.createCar(carData);
    console.log(`✅ Car created with ID: ${car.id}`);
    res.status(201).json(car);
  } catch (error) {
    console.error('❌ Error creating car:', error);
    res.status(500).json({ error: 'Ошибка создания автомобиля' });
  }
});

app.put('/api/cars/:id', async (req, res) => {
  console.log(`📝 PUT /api/cars/${req.params.id} - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for car update`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    const carId = parseInt(req.params.id);
    const car = await storage.getCar(carId);
    
    if (!car) {
      console.log(`❌ Car not found for update: ${carId}`);
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }

    if (car.createdBy !== req.user.id && req.user.role !== 'admin') {
      console.log(`❌ Access denied for car update: ${carId}`);
      return res.status(403).json({ error: 'Нет прав для редактирования этого автомобиля' });
    }

    const updatedCar = await storage.updateCar(carId, req.body);
    console.log(`✅ Car updated: ${carId}`);
    res.json(updatedCar);
  } catch (error) {
    console.error('❌ Error updating car:', error);
    res.status(500).json({ error: 'Ошибка обновления автомобиля' });
  }
});

app.delete('/api/cars/:id', async (req, res) => {
  console.log(`📝 DELETE /api/cars/${req.params.id} - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for car deletion`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    const carId = parseInt(req.params.id);
    const car = await storage.getCar(carId);
    
    if (!car) {
      console.log(`❌ Car not found for deletion: ${carId}`);
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }

    if (car.createdBy !== req.user.id && req.user.role !== 'admin') {
      console.log(`❌ Access denied for car deletion: ${carId}`);
      return res.status(403).json({ error: 'Нет прав для удаления этого автомобиля' });
    }

    const deleted = await storage.deleteCar(carId);
    if (deleted) {
      console.log(`✅ Car deleted: ${carId}`);
      res.json({ message: 'Автомобиль удален' });
    } else {
      console.log(`❌ Failed to delete car: ${carId}`);
      res.status(500).json({ error: 'Не удалось удалить автомобиль' });
    }
  } catch (error) {
    console.error('❌ Error deleting car:', error);
    res.status(500).json({ error: 'Ошибка удаления автомобиля' });
  }
});

// Messages routes
app.get('/api/messages/unread-count', async (req, res) => {
  console.log(`📝 GET /api/messages/unread-count - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for unread count`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    const count = await storage.getUnreadMessageCount(req.user.id);
    console.log(`📋 User ${req.user.username} has ${count} unread messages`);
    res.json({ count });
  } catch (error) {
    console.error('❌ Error fetching unread count:', error);
    res.status(500).json({ error: 'Ошибка получения количества непрочитанных сообщений' });
  }
});

// Favorites routes
app.get('/api/favorites', async (req, res) => {
  console.log(`📝 GET /api/favorites - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for favorites`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    const favorites = await storage.getFavoritesByUser(req.user.id);
    console.log(`📋 User ${req.user.username} has ${favorites.length} favorites`);
    res.json(favorites);
  } catch (error) {
    console.error('❌ Error fetching favorites:', error);
    res.status(500).json({ error: 'Ошибка получения избранного' });
  }
});

app.get('/api/favorites/check', async (req, res) => {
  console.log(`📝 GET /api/favorites/check - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for favorites check`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    const { carId } = req.query;
    if (!carId) {
      return res.status(400).json({ error: 'Не указан ID автомобиля' });
    }
    
    const isFavorite = await storage.isFavorite(req.user.id, parseInt(carId));
    console.log(`📋 Car ${carId} is favorite for user ${req.user.username}: ${isFavorite}`);
    res.json({ isFavorite });
  } catch (error) {
    console.error('❌ Error checking favorite:', error);
    res.status(500).json({ error: 'Ошибка проверки избранного' });
  }
});

// Applications routes
app.get('/api/my-applications', async (req, res) => {
  console.log(`📝 GET /api/my-applications - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for applications`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    const applications = await storage.getCarApplicationsByUser(req.user.id);
    console.log(`📋 User ${req.user.username} has ${applications.length} applications`);
    res.json(applications);
  } catch (error) {
    console.error('❌ Error fetching applications:', error);
    res.status(500).json({ error: 'Ошибка получения заявок' });
  }
});

console.log("🔧 Setting up static files...");

// Serve static files
app.use(express.static('public'));

// Catch-all handler for SPA (MUST BE LAST!)
app.get('*', (req, res) => {
  console.log(`📝 Serving SPA for route: ${req.path}`);
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

console.log("🔧 About to start listening on port:", process.env.PORT || 3000);
console.log("🎯 Server setup complete, waiting for connections...");

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server successfully running on port ${PORT}`);
  console.log(`🌐 Server listening on 0.0.0.0:${PORT}`);
});
