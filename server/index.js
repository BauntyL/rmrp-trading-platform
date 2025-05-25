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

// Session configuration - используем стандартный MemoryStore
app.use(session({
  secret: 'trading-platform-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax'
  }
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

// ============ AUTHENTICATION ROUTES ============

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
      
      res.json(userWithoutPassword);
    });
  })(req, res, next);
});

app.post('/api/register', async (req, res) => {
  console.log(`📝 Registration attempt for: ${req.body.username}`);
  
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log(`❌ Registration failed: missing username or password`);
      return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
    }

    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      console.log(`❌ Registration failed: user already exists: ${username}`);
      return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await storage.createUser({
      username,
      password: hashedPassword,
      role: 'user'
    });

    console.log(`✅ User registered successfully: ${user.username} with ID: ${user.id}`);
    
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

// User routes
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

// ============ CAR ROUTES ============

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

// ============ APPLICATIONS ROUTES ============

app.get('/api/applications/pending', async (req, res) => {
  console.log(`📝 GET /api/applications/pending - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for pending applications`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  if (req.user.role !== 'admin') {
    console.log(`❌ Access denied for pending applications: ${req.user.username} (role: ${req.user.role})`);
    return res.status(403).json({ error: 'Нет прав доступа' });
  }

  try {
    const applications = await storage.getPendingCarApplications();
    console.log(`📋 Admin ${req.user.username} requested ${applications.length} pending applications`);
    res.json(applications);
  } catch (error) {
    console.error('❌ Error fetching pending applications:', error);
    res.status(500).json({ error: 'Ошибка получения заявок' });
  }
});

app.get('/api/applications', async (req, res) => {
  console.log(`📝 GET /api/applications - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for all applications`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  if (req.user.role !== 'admin') {
    console.log(`❌ Access denied for all applications: ${req.user.username} (role: ${req.user.role})`);
    return res.status(403).json({ error: 'Нет прав доступа' });
  }

  try {
    const applications = await storage.getAllCarApplications();
    console.log(`📋 Admin ${req.user.username} requested ${applications.length} total applications`);
    res.json(applications);
  } catch (error) {
    console.error('❌ Error fetching all applications:', error);
    res.status(500).json({ error: 'Ошибка получения всех заявок' });
  }
});

app.post('/api/car-applications', async (req, res) => {
  console.log(`📝 POST /api/car-applications - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for car application`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    const applicationData = {
      ...req.body,
      userId: req.user.id,
    };
    
    console.log(`📝 Creating car application: ${JSON.stringify(applicationData)}`);
    const application = await storage.createCarApplication(applicationData);
    console.log(`✅ Car application created with ID: ${application.id}`);
    res.status(201).json(application);
  } catch (error) {
    console.error('❌ Error creating car application:', error);
    res.status(500).json({ error: 'Ошибка создания заявки на автомобиль' });
  }
});

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

app.put('/api/applications/:id/approve', async (req, res) => {
  console.log(`📝 PUT /api/applications/${req.params.id}/approve - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for application approval`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  if (req.user.role !== 'admin') {
    console.log(`❌ Access denied for application approval: ${req.user.username} (role: ${req.user.role})`);
    return res.status(403).json({ error: 'Нет прав доступа' });
  }

  try {
    const applicationId = parseInt(req.params.id);
    const application = await storage.updateCarApplicationStatus(applicationId, 'approved', req.user.id);
    
    if (!application) {
      console.log(`❌ Application not found for approval: ${applicationId}`);
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    console.log(`✅ Application approved: ${applicationId} by ${req.user.username}`);
    res.json(application);
  } catch (error) {
    console.error('❌ Error approving application:', error);
    res.status(500).json({ error: 'Ошибка одобрения заявки' });
  }
});

app.put('/api/applications/:id/reject', async (req, res) => {
  console.log(`📝 PUT /api/applications/${req.params.id}/reject - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for application rejection`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  if (req.user.role !== 'admin') {
    console.log(`❌ Access denied for application rejection: ${req.user.username} (role: ${req.user.role})`);
    return res.status(403).json({ error: 'Нет прав доступа' });
  }

  try {
    const applicationId = parseInt(req.params.id);
    const application = await storage.updateCarApplicationStatus(applicationId, 'rejected', req.user.id);
    
    if (!application) {
      console.log(`❌ Application not found for rejection: ${applicationId}`);
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    console.log(`✅ Application rejected: ${applicationId} by ${req.user.username}`);
    res.json(application);
  } catch (error) {
    console.error('❌ Error rejecting application:', error);
    res.status(500).json({ error: 'Ошибка отклонения заявки' });
  }
});

// ============ USER MANAGEMENT ROUTES ============

app.get('/api/users', async (req, res) => {
  console.log(`📝 GET /api/users - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for users list`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  if (req.user.role !== 'admin') {
    console.log(`❌ Access denied for users list: ${req.user.username} (role: ${req.user.role})`);
    return res.status(403).json({ error: 'Нет прав доступа' });
  }

  try {
    const users = await storage.getAllUsers();
    console.log(`📋 Admin ${req.user.username} requested ${users.length} users`);
    
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ error: 'Ошибка получения списка пользователей' });
  }
});

app.put('/api/users/:id/role', async (req, res) => {
  console.log(`📝 PUT /api/users/${req.params.id}/role - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for role change`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  if (req.user.role !== 'admin') {
    console.log(`❌ Access denied for role change: ${req.user.username} (role: ${req.user.role})`);
    return res.status(403).json({ error: 'Нет прав доступа' });
  }

  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    
    if (!role || !['user', 'admin'].includes(role)) {
      console.log(`❌ Invalid role provided: ${role}`);
      return res.status(400).json({ error: 'Недопустимая роль пользователя' });
    }

    const updatedUser = await storage.updateUserRole(userId, role);
    
    if (!updatedUser) {
      console.log(`❌ User not found for role change: ${userId}`);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    console.log(`✅ User role updated: ${updatedUser.username} -> ${role} by ${req.user.username}`);
    
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    res.status(500).json({ error: 'Ошибка изменения роли пользователя' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  console.log(`📝 DELETE /api/users/${req.params.id} - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for user deletion`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  if (req.user.role !== 'admin') {
    console.log(`❌ Access denied for user deletion: ${req.user.username} (role: ${req.user.role})`);
    return res.status(403).json({ error: 'Нет прав доступа' });
  }

  try {
    const userId = parseInt(req.params.id);
    
    if (userId === req.user.id) {
      console.log(`❌ Admin trying to delete themselves: ${req.user.username}`);
      return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    }

    const deleted = await storage.deleteUser(userId);
    
    if (!deleted) {
      console.log(`❌ User not found for deletion: ${userId}`);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    console.log(`✅ User deleted: ${userId} by ${req.user.username}`);
    res.json({ message: 'Пользователь удален' });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ error: 'Ошибка удаления пользователя' });
  }
});

// ============ FAVORITES ROUTES ============

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

app.post('/api/favorites', async (req, res) => {
  console.log(`📝 POST /api/favorites - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for adding favorite`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    const { carId } = req.body;
    
    if (!carId) {
      return res.status(400).json({ error: 'Не указан ID автомобиля' });
    }

    const favorite = await storage.addToFavorites({
      userId: req.user.id,
      carId: parseInt(carId)
    });

    console.log(`✅ Added to favorites: car ${carId} by ${req.user.username}`);
    res.status(201).json(favorite);
  } catch (error) {
    console.error('❌ Error adding to favorites:', error);
    res.status(500).json({ error: 'Ошибка добавления в избранное' });
  }
});

app.delete('/api/favorites/:carId', async (req, res) => {
  console.log(`📝 DELETE /api/favorites/${req.params.carId} - User: ${req.user?.username || 'not authenticated'}`);
  
  if (!req.user) {
    console.log(`❌ User not authenticated for removing favorite`);
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    const carId = parseInt(req.params.carId);
    const removed = await storage.removeFromFavorites(req.user.id, carId);

    if (!removed) {
      console.log(`❌ Favorite not found for removal: car ${carId} by ${req.user.username}`);
      return res.status(404).json({ error: 'Избранное не найдено' });
    }

    console.log(`✅ Removed from favorites: car ${carId} by ${req.user.username}`);
    res.json({ message: 'Удалено из избранного' });
  } catch (error) {
    console.error('❌ Error removing from favorites:', error);
    res.status(500).json({ error: 'Ошибка удаления из избранного' });
  }
});

// ============ MESSAGES ROUTES ============

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
